const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { app } = require("electron");

const DEV_ROOT = path.resolve(__dirname, "..", "..");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function projectRoot() {
  return app.isPackaged ? process.resourcesPath : DEV_ROOT;
}

function distDir() {
  return path.join(__dirname, "..", "dist");
}

function distEntry() {
  return path.join(distDir(), "index.html");
}

function piKernelRoot() {
  return ensureDir(path.join(dataDir(), "pi-kernel"));
}

function installedPiKernel() {
  try {
    const pointer = JSON.parse(
      fs.readFileSync(path.join(piKernelRoot(), "current.json"), "utf8"),
    );
    if (!pointer?.bundleDir) {
      return null;
    }
    const cli = path.join(pointer.bundleDir, "cli.js");
    const index = path.join(pointer.bundleDir, "index.js");
    if (!fs.existsSync(cli) || !fs.existsSync(index)) {
      return null;
    }
    return { ...pointer, cli, index };
  } catch {
    return null;
  }
}

function piCli() {
  const installed = installedPiKernel();
  if (installed) {
    return installed.cli;
  }

  const packaged = path.join(process.resourcesPath, "pi", "cli.js");
  if (app.isPackaged && fs.existsSync(packaged)) {
    return packaged;
  }

  return path.join(
    DEV_ROOT,
    "pi",
    "packages",
    "coding-agent",
    "dist",
    "bundle",
    "cli.js",
  );
}

function bundleIndex() {
  const installed = installedPiKernel();
  if (installed) {
    return installed.index;
  }

  const packaged = path.join(process.resourcesPath, "pi", "index.js");
  if (app.isPackaged && fs.existsSync(packaged)) {
    return packaged;
  }

  return path.join(
    DEV_ROOT,
    "pi",
    "packages",
    "coding-agent",
    "dist",
    "bundle",
    "index.js",
  );
}

function nodeExe() {
  const binaryName = process.platform === "win32" ? "node.exe" : "node";
  const packaged = path.join(process.resourcesPath, "node", binaryName);
  if (app.isPackaged && fs.existsSync(packaged)) {
    return packaged;
  }

  const configured = process.env.TEST_NODE;
  return configured && fs.existsSync(configured) ? configured : "node";
}

function dataDir() {
  const shared = process.env.TEST_DATA_DIR;
  if (shared) {
    return ensureDir(shared);
  }
  if (!app.isPackaged) {
    return ensureDir(path.join(DEV_ROOT, "tesT", "data"));
  }

  const target = ensureDir(app.getPath("userData"));
  migrateLegacyData(target);
  return target;
}

function migrateLegacyData(target) {
  try {
    const agentTarget = path.join(target, "pi-agent");
    fs.mkdirSync(agentTarget, { recursive: true });
    const candidates = [
      path.join(app.getPath("appData"), "test-desktop"),
      path.join(DEV_ROOT, "tesT", "data"),
    ];

    for (const candidate of candidates) {
      const agentSource = path.join(candidate, "pi-agent");
      if (!fs.existsSync(agentSource)) {
        continue;
      }

      for (const name of [
        "models.json",
        "auth.json",
        "settings.json",
        "models-store.json",
      ]) {
        const source = path.join(agentSource, name);
        const destination = path.join(agentTarget, name);
        if (fs.existsSync(source) && !fs.existsSync(destination)) {
          fs.copyFileSync(source, destination);
        }
      }

      const sessionsSource = path.join(agentSource, "sessions");
      const sessionsTarget = path.join(agentTarget, "sessions");
      if (
        fs.existsSync(sessionsSource) &&
        (!fs.existsSync(sessionsTarget) ||
          fs.readdirSync(sessionsTarget).length === 0)
      ) {
        fs.cpSync(sessionsSource, sessionsTarget, { recursive: true });
      }
    }
  } catch {
    // Migration is best-effort; a fresh data directory still works.
  }
}

function piDataDir() {
  return ensureDir(path.join(dataDir(), "pi-agent"));
}

function sessionsDir() {
  return ensureDir(path.join(piDataDir(), "sessions"));
}

function sessionsArchiveDir() {
  return ensureDir(path.join(piDataDir(), "sessions-archive"));
}

function extensionsDir() {
  return ensureDir(path.join(piDataDir(), "extensions"));
}

function skillsDir() {
  return ensureDir(path.join(piDataDir(), "skills"));
}

function disabledDir(kind) {
  return ensureDir(
    path.join(piDataDir(), kind === "skill" ? "skills-disabled" : "extensions-disabled"),
  );
}

function nativeAgentDir() {
  return (
    process.env.TEST_PI_AGENT_DIR ||
    path.join(os.homedir(), ".pi", "agent")
  );
}

function modelsPath() {
  return path.join(piDataDir(), "models.json");
}

function authPath() {
  return path.join(piDataDir(), "auth.json");
}

function loginInjectScript() {
  const packaged = path.join(
    process.resourcesPath,
    "tools",
    "login-inject.ps1",
  );
  if (app.isPackaged && fs.existsSync(packaged)) {
    return packaged;
  }

  return path.join(__dirname, "login-inject.ps1");
}

module.exports = {
  DEV_ROOT,
  authPath,
  bundleIndex,
  dataDir,
  distDir,
  distEntry,
  disabledDir,
  extensionsDir,
  loginInjectScript,
  modelsPath,
  nativeAgentDir,
  nodeExe,
  installedPiKernel,
  piCli,
  piDataDir,
  piKernelRoot,
  projectRoot,
  sessionsDir,
  sessionsArchiveDir,
  skillsDir,
};
