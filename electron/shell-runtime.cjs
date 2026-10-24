const fs = require("node:fs");
const path = require("node:path");

function isFile(target) {
  try {
    return fs.statSync(target).isFile();
  } catch {
    return false;
  }
}

function pathKey(env) {
  return (
    Object.keys(env).find((key) => key.toUpperCase() === "PATH") || "PATH"
  );
}

function pathEntries(env) {
  const value = env[pathKey(env)] || "";
  const seen = new Set();
  const entries = [];
  for (const raw of value.split(path.delimiter)) {
    const entry = raw.trim().replace(/^"(.*)"$/, "$1");
    if (!entry) {
      continue;
    }
    const resolved = path.resolve(entry);
    const key = resolved.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      entries.push(resolved);
    }
  }
  return entries;
}

function findOnPath(names, env) {
  const extensions = String(env.PATHEXT || ".EXE;.CMD;.BAT;.COM")
    .split(";")
    .filter(Boolean);
  const matches = [];
  for (const directory of pathEntries(env)) {
    for (const name of names) {
      const candidates = path.extname(name)
        ? [path.join(directory, name)]
        : extensions.map((extension) =>
            path.join(directory, `${name}${extension.toLowerCase()}`),
          );
      for (const candidate of candidates) {
        if (isFile(candidate)) {
          matches.push(candidate);
        }
      }
    }
  }
  return matches;
}

function addCandidate(candidates, seen, value) {
  if (!value) {
    return;
  }
  const resolved = path.resolve(value);
  const key = resolved.toLowerCase();
  if (seen.has(key) || !isFile(resolved)) {
    return;
  }
  seen.add(key);
  candidates.push(resolved);
}

function bashCandidatesFromGit(gitPath) {
  const directory = path.dirname(gitPath);
  return [
    path.join(directory, "bash.exe"),
    path.join(directory, "..", "bin", "bash.exe"),
    path.join(directory, "..", "usr", "bin", "bash.exe"),
  ];
}

function findGitBash(env) {
  const candidates = [];
  const seen = new Set();

  addCandidate(candidates, seen, env.TEST_BASH_PATH);

  for (const base of [
    env.ProgramFiles,
    env["ProgramFiles(x86)"],
    env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, "Programs"),
  ]) {
    if (base) {
      addCandidate(candidates, seen, path.join(base, "Git", "bin", "bash.exe"));
    }
  }

  if (env.UserProfile) {
    addCandidate(
      candidates,
      seen,
      path.join(
        env.UserProfile,
        "scoop",
        "apps",
        "git",
        "current",
        "bin",
        "bash.exe",
      ),
    );
  }

  for (const gitPath of findOnPath(["git.exe"], env)) {
    for (const candidate of bashCandidatesFromGit(gitPath)) {
      addCandidate(candidates, seen, candidate);
    }
  }

  for (const bashPath of findOnPath(["bash.exe"], env)) {
    addCandidate(candidates, seen, bashPath);
  }

  return candidates[0] || null;
}

function withBashPath(env, bashPath) {
  const key = pathKey(env);
  const directory = path.dirname(bashPath);
  const current = env[key] || "";
  return {
    ...env,
    [key]: [directory, current].filter(Boolean).join(path.delimiter),
  };
}

/**
 * Make Pi's shell tools usable without requiring the user to edit settings.
 *
 * Windows always has PowerShell available, so a machine without Git Bash can
 * still run commands through Pi's powershell tool. If Git Bash exists, inject
 * its directory into PATH so Pi's own shell resolver finds it, including
 * non-standard installs such as D:\Git.
 */
function prepareShellRuntime(env = process.env, options = {}) {
  const platform = options.platform || process.platform;
  if (platform !== "win32") {
    return {
      bashPath: null,
      env: { ...env },
      mode: "native",
      toolArgs: [],
    };
  }

  const bashPath =
    env.TEST_FORCE_POWERSHELL === "1" ? null : findGitBash(env);
  if (bashPath) {
    return {
      bashPath,
      env: withBashPath(env, bashPath),
      mode: "bash",
      toolArgs: [],
    };
  }

  return {
    bashPath: null,
    env: { ...env },
    mode: "powershell",
    toolArgs: ["--tools", "-bash,+powershell"],
  };
}

module.exports = {
  findGitBash,
  prepareShellRuntime,
};
