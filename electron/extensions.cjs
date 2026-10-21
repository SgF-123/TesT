const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const paths = require("./paths.cjs");

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function sanitize(value) {
  return String(value || "item")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80) || "item";
}

function parseFrontmatter(file) {
  if (!fs.existsSync(file)) {
    return {};
  }

  try {
    const text = fs.readFileSync(file, "utf8");
    const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) {
      return {};
    }

    const result = {};
    let current = "";
    for (const line of match[1].split(/\r?\n/)) {
      const pair = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
      if (pair) {
        current = pair[1];
        result[current] = pair[2].replace(/^["']|["']$/g, "").trim();
      } else if (current && line.trim()) {
        result[current] = `${result[current] || ""} ${line.trim()}`.trim();
      }
    }
    return result;
  } catch {
    return {};
  }
}

function skillInfo(target, enabled, scope = "global") {
  const stat = fs.statSync(target);
  if (stat.isFile()) {
    if (!/\.md$/i.test(target)) {
      return null;
    }
    const meta = parseFrontmatter(target);
    return {
      kind: "skill",
      name: String(
        meta.name || path.basename(target, path.extname(target)),
      ),
      desc: String(meta.description || "Pi 技能"),
      path: target,
      enabled,
      scope,
      readonly: scope === "project",
    };
  }

  const skillFile = path.join(target, "SKILL.md");
  if (!fs.existsSync(skillFile)) {
    return null;
  }

  const meta = parseFrontmatter(skillFile);
  return {
    kind: "skill",
    name: String(meta.name || path.basename(target)),
    desc: String(meta.description || "Pi 技能"),
    path: target,
    enabled,
    scope,
    readonly: scope === "project",
  };
}

function extensionInfo(dir, enabled, scope = "global") {
  const stat = fs.statSync(dir);
  if (stat.isFile()) {
    if (!/\.(js|ts|mjs|cjs)$/i.test(dir)) {
      return null;
    }
    return {
      kind: "extension",
      name: path.basename(dir).replace(/\.(js|ts|mjs|cjs)$/i, ""),
      desc: "Pi 扩展",
      path: dir,
      enabled,
      scope,
      readonly: scope === "project",
    };
  }

  const pkg = readJson(path.join(dir, "package.json"));
  const hasEntry =
    fs.existsSync(path.join(dir, "index.js")) ||
    fs.existsSync(path.join(dir, "index.ts")) ||
    fs.existsSync(path.join(dir, "index.mjs")) ||
    Boolean(pkg?.pi?.extensions?.length);
  if (!pkg && !hasEntry) {
    return null;
  }

  return {
    kind: "extension",
    name: String(pkg?.name || path.basename(dir)),
    desc: String(pkg?.description || "Pi 扩展"),
    path: dir,
    enabled,
    scope,
    readonly: scope === "project",
  };
}

function scan(dir, enabled, kind, scope = "global") {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) {
      continue;
    }
    const full = path.join(dir, entry.name);
    const info =
      kind === "skill"
        ? skillInfo(full, enabled, scope)
        : extensionInfo(full, enabled, scope);
    if (info) {
      result.push(info);
    }
  }
  return result;
}

function canonicalPath(target) {
  try {
    return fs.realpathSync(path.resolve(String(target || "")));
  } catch {
    return path.resolve(String(target || ""));
  }
}

function readTrust(workspace) {
  if (!workspace) {
    return false;
  }
  const data =
    readJson(path.join(paths.piDataDir(), "trust.json")) || {};
  const target = canonicalPath(workspace).toLowerCase();
  return Object.entries(data).some(
    ([key, value]) =>
      value === true && canonicalPath(key).toLowerCase() === target,
  );
}

function trust(workspace) {
  const target = canonicalPath(workspace);
  if (!target) {
    return { error: "没有当前工作区" };
  }
  const file = path.join(paths.piDataDir(), "trust.json");
  const data = readJson(file) || {};
  data[target] = true;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  return { cwd: target, trustFile: file, trusted: true };
}

function list(workspace) {
  const projectRoot = workspace ? path.join(workspace, ".pi") : "";
  const projectSkillsDir = projectRoot
    ? path.join(projectRoot, "skills")
    : "";
  const projectExtensionsDir = projectRoot
    ? path.join(projectRoot, "extensions")
    : "";

  const skills = [
    ...scan(paths.skillsDir(), true, "skill", "global"),
    ...scan(paths.disabledDir("skill"), false, "skill", "global"),
    ...(projectSkillsDir
      ? scan(projectSkillsDir, true, "skill", "project")
      : []),
  ];
  const extensions = [
    ...scan(paths.extensionsDir(), true, "extension", "global"),
    ...scan(paths.disabledDir("extension"), false, "extension", "global"),
    ...(projectExtensionsDir
      ? scan(projectExtensionsDir, true, "extension", "project")
      : []),
  ];

  const dedupe = (items) => {
    const seen = new Set();
    return items.filter((item) => {
      const key = `${item.scope}:${item.kind}:${item.name}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  };

  return {
    skills: dedupe(skills),
    extensions: dedupe(extensions),
    project: {
      cwd: workspace || "",
      trusted: readTrust(workspace),
      skillsDir: projectSkillsDir,
      extensionsDir: projectExtensionsDir,
      hasResources: Boolean(
        projectSkillsDir &&
          (fs.existsSync(projectSkillsDir) ||
            fs.existsSync(projectExtensionsDir)),
      ),
    },
  };
}

function extractZip(source) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "tesT-ext-"));
  const script =
    `Expand-Archive -LiteralPath '${source.replace(/'/g, "''")}' ` +
    `-DestinationPath '${temp.replace(/'/g, "''")}' -Force`;
  execFileSync("powershell.exe", ["-NoProfile", "-Command", script], {
    windowsHide: true,
    stdio: "ignore",
  });
  return temp;
}

function findSkillRoot(dir, depth = 0) {
  if (depth > 4) {
    return null;
  }
  if (fs.existsSync(path.join(dir, "SKILL.md"))) {
    return dir;
  }

  const entries = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."));
  for (const entry of entries) {
    const found = findSkillRoot(path.join(dir, entry.name), depth + 1);
    if (found) {
      return found;
    }
  }
  return null;
}

function uniqueTarget(root, name) {
  let target = path.join(root, name);
  let index = 2;
  while (fs.existsSync(target)) {
    target = path.join(root, `${name}-${index}`);
    index += 1;
  }
  return target;
}

function install(kind, source) {
  const original = path.resolve(String(source || ""));
  if (!fs.existsSync(original)) {
    throw new Error(`路径不存在：${original}`);
  }

  let temp = null;
  let root = original;
  try {
    if (/\.zip$/i.test(original)) {
      temp = extractZip(original);
      root = temp;
    }

    if (kind === "skill") {
      const skillRoot = findSkillRoot(root);
      if (!skillRoot) {
        throw new Error("没有找到 SKILL.md");
      }
      const meta = parseFrontmatter(path.join(skillRoot, "SKILL.md"));
      const name = sanitize(meta.name || path.basename(skillRoot));
      const target = uniqueTarget(paths.skillsDir(), name);
      fs.cpSync(skillRoot, target, { recursive: true });
      return { name: path.basename(target), path: target };
    }

    if (/\.(js|ts|mjs|cjs)$/i.test(root)) {
      const target = uniqueTarget(
        paths.extensionsDir(),
        path.basename(root),
      );
      fs.copyFileSync(root, target);
      return { name: path.basename(target), path: target };
    }

    const pkg = readJson(path.join(root, "package.json"));
    const name = sanitize(pkg?.name || path.basename(root));
    const target = uniqueTarget(paths.extensionsDir(), name);
    fs.cpSync(root, target, { recursive: true });
    return { name: path.basename(target), path: target };
  } finally {
    if (temp) {
      fs.rmSync(temp, { recursive: true, force: true });
    }
  }
}

function toggle(kind, name, enabled) {
  const activeRoot = kind === "skill" ? paths.skillsDir() : paths.extensionsDir();
  const disabledRoot =
    kind === "skill" ? paths.disabledDir("skill") : paths.disabledDir("extension");
  const sourceRoot = enabled ? disabledRoot : activeRoot;
  const targetRoot = enabled ? activeRoot : disabledRoot;
  const source = path.join(sourceRoot, name);
  if (!fs.existsSync(source)) {
    throw new Error(`找不到 ${name}`);
  }
  const target = path.join(targetRoot, name);
  if (fs.existsSync(target)) {
    throw new Error(`目标已存在：${name}`);
  }
  fs.renameSync(source, target);
  return { name, path: target, enabled };
}

function remove(kind, name) {
  const roots =
    kind === "skill"
      ? [paths.skillsDir(), paths.disabledDir("skill")]
      : [paths.extensionsDir(), paths.disabledDir("extension")];

  for (const root of roots) {
    const target = path.join(root, name);
    if (fs.existsSync(target)) {
      fs.rmSync(target, { recursive: true, force: true });
      return { removed: true, path: target };
    }
  }
  return { removed: false };
}

module.exports = { install, list, remove, toggle, trust };
