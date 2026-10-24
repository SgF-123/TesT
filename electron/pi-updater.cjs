const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const https = require("node:https");
const { app } = require("electron");
const paths = require("./paths.cjs");
const kernelDeps = require("./kernel-deps.cjs");
const { extractTarball } = require("./tarball.cjs");

const PACKAGE_NAME = "@earendil-works/pi-coding-agent";
const LATEST_URL =
  "https://registry.npmjs.org/@earendil-works%2Fpi-coding-agent/latest";

let onStatus = () => {};
let busy = false;
let status = {
  state: "idle",
  message: "Pi 内核跟随官方 npm 源",
  currentVersion: "",
  latestVersion: "",
  percent: 0,
  source: "https://registry.npmjs.org",
};

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function currentPointerPath() {
  return path.join(paths.piKernelRoot(), "current.json");
}

function rollbackPointerPath() {
  return path.join(paths.piKernelRoot(), "rollback.json");
}

function writeRollbackSnapshot() {
  const previous = readJson(currentPointerPath());
  fs.writeFileSync(
    rollbackPointerPath(),
    `${JSON.stringify(
      {
        previous,
        createdAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

function sourcePackagePath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "pi", "package.json");
  }
  return path.join(
    paths.DEV_ROOT,
    "pi",
    "packages",
    "coding-agent",
    "package.json",
  );
}

function currentVersion() {
  const installed = paths.installedPiKernel();
  if (installed?.version) {
    return String(installed.version);
  }
  const pkg = readJson(sourcePackagePath());
  return typeof pkg?.version === "string" ? pkg.version : "内置";
}

function compareVersions(left, right) {
  const parse = (value) =>
    String(value || "0")
      .split("-")[0]
      .split(".")
      .map((part) => Number.parseInt(part, 10) || 0);
  const a = parse(left);
  const b = parse(right);
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const diff = (a[index] || 0) - (b[index] || 0);
    if (diff !== 0) {
      return diff > 0 ? 1 : -1;
    }
  }
  return 0;
}

function publish(next) {
  status = {
    ...status,
    ...next,
    currentVersion: currentVersion(),
  };
  onStatus(status);
  return status;
}

function requestJson(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: {
            "User-Agent": `TesT/${app.getVersion()}`,
            Accept: "application/json",
          },
        },
        (response) => {
          if (
            response.statusCode >= 300 &&
            response.statusCode < 400 &&
            response.headers.location &&
            redirects < 5
          ) {
            response.resume();
            resolve(
              requestJson(
                new URL(response.headers.location, url).toString(),
                redirects + 1,
              ),
            );
            return;
          }
          if (response.statusCode !== 200) {
            response.resume();
            reject(new Error(`HTTP ${response.statusCode}`));
            return;
          }
          let body = "";
          response.setEncoding("utf8");
          response.on("data", (chunk) => {
            body += chunk;
          });
          response.on("end", () => {
            try {
              resolve(JSON.parse(body));
            } catch (error) {
              reject(error);
            }
          });
        },
      )
      .on("error", reject);
  });
}

function download(url, target, onProgress, redirects = 0) {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: {
            "User-Agent": `TesT/${app.getVersion()}`,
          },
        },
        (response) => {
          if (
            response.statusCode >= 300 &&
            response.statusCode < 400 &&
            response.headers.location &&
            redirects < 5
          ) {
            response.resume();
            resolve(
              download(
                new URL(response.headers.location, url).toString(),
                target,
                onProgress,
                redirects + 1,
              ),
            );
            return;
          }
          if (response.statusCode !== 200) {
            response.resume();
            reject(new Error(`下载失败：HTTP ${response.statusCode}`));
            return;
          }

          const total = Number(response.headers["content-length"] || 0);
          let received = 0;
          const file = fs.createWriteStream(target);
          response.on("data", (chunk) => {
            received += chunk.length;
            if (total > 0) {
              onProgress(Math.round((received / total) * 100));
            }
          });
          response.pipe(file);
          file.on("finish", () => {
            file.close(() => resolve({ bytes: received }));
          });
          file.on("error", reject);
        },
      )
      .on("error", reject);
  });
}

function safeVersion(version) {
  return String(version || "latest").replace(/[^\w.-]/g, "_");
}

function pruneVersions(root, keep = 3) {
  try {
    const entries = fs
      .readdirSync(path.join(root, "versions"), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => ({
        name: entry.name,
        time: fs.statSync(path.join(root, "versions", entry.name)).mtimeMs,
      }))
      .sort((a, b) => b.time - a.time);
    for (const entry of entries.slice(keep)) {
      fs.rmSync(path.join(root, "versions", entry.name), {
        recursive: true,
        force: true,
      });
    }
  } catch {
    // Pruning is best-effort.
  }
}

async function check() {
  if (busy) {
    return { error: "Pi 内核正在更新中" };
  }
  publish({
    state: "checking",
    message: "正在连接 Pi 官方源…",
    latestVersion: status.latestVersion,
  });
  try {
    const data = await requestJson(LATEST_URL);
    const latestVersion = String(data?.version || "");
    if (!latestVersion) {
      throw new Error("官方源没有返回版本号");
    }
    const current = currentVersion();
    const hasUpdate = compareVersions(latestVersion, current) > 0;
    publish({
      state: hasUpdate ? "available" : "latest",
      latestVersion,
      percent: 0,
      message: hasUpdate
        ? `发现 Pi ${latestVersion}，当前 ${current}`
        : `Pi 已是最新（${current}）`,
    });
    return {
      ok: true,
      currentVersion: current,
      latestVersion,
      hasUpdate,
    };
  } catch (error) {
    const message = String(error?.message || error);
    publish({
      state: "error",
      message: `检查 Pi 更新失败：${message}`,
    });
    return { error: message };
  }
}

async function install() {
  if (busy) {
    return { error: "Pi 内核正在更新中" };
  }
  busy = true;
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "tesT-pi-update-"));
  try {
    publish({
      state: "checking",
      message: "正在获取 Pi 官方版本…",
      percent: 0,
    });
    const data = await requestJson(LATEST_URL);
    const version = String(data?.version || "");
    const tarball = String(data?.dist?.tarball || "");
    if (!version || !tarball) {
      throw new Error("官方源缺少版本或下载地址");
    }

    const current = currentVersion();
    if (compareVersions(version, current) <= 0) {
      publish({
        state: "latest",
        latestVersion: version,
        message: `Pi 已是最新（${current}）`,
      });
      return { ok: true, currentVersion: current, latestVersion: version };
    }

    const tarballPath = path.join(temp, "pi-coding-agent.tgz");
    publish({
      state: "downloading",
      latestVersion: version,
      percent: 0,
      message: `正在下载 Pi ${version}…`,
    });
    await download(tarball, tarballPath, (percent) => {
      publish({
        state: "downloading",
        latestVersion: version,
        percent,
        message: `正在下载 Pi ${version}（${percent}%）`,
      });
    });

    publish({
      state: "installing",
      latestVersion: version,
      percent: 100,
      message: "正在安装 Pi 内核…",
    });
    const extracted = path.join(temp, "extracted");
    extractTarball(tarballPath, extracted);
    const packageSource = path.join(extracted, "package");
    const bundleSource = path.join(packageSource, "dist", "bundle");
    if (
      !fs.existsSync(path.join(bundleSource, "cli.js")) ||
      !fs.existsSync(path.join(bundleSource, "index.js"))
    ) {
      throw new Error("官方包中缺少 dist/bundle/cli.js 或 index.js");
    }

    const root = paths.piKernelRoot();
    const versionDir = path.join(
      root,
      "versions",
      safeVersion(version),
    );
    fs.rmSync(versionDir, { recursive: true, force: true });
    fs.mkdirSync(versionDir, { recursive: true });
    const packageTarget = path.join(versionDir, "package");
    fs.cpSync(packageSource, packageTarget, { recursive: true });
    kernelDeps.stageRuntimeDependencies(packageTarget, paths.vendorDir());
    const bundleTarget = path.join(packageTarget, "dist", "bundle");
    fs.copyFileSync(
      path.join(packageSource, "package.json"),
      path.join(versionDir, "package.json"),
    );

    const pointer = {
      version,
      bundleDir: bundleTarget,
      official: true,
      installedAt: new Date().toISOString(),
      source: "https://registry.npmjs.org",
    };
    writeRollbackSnapshot();
    fs.writeFileSync(
      currentPointerPath(),
      `${JSON.stringify(pointer, null, 2)}\n`,
      "utf8",
    );
    publish({
      state: "done",
      latestVersion: version,
      percent: 100,
      message: `Pi ${version} 已安装，重启内核后生效`,
    });
    return { ok: true, ...pointer };
  } catch (error) {
    const message = String(error?.message || error);
    publish({
      state: "error",
      message: `Pi 内核更新失败：${message}`,
    });
    return { error: message };
  } finally {
    busy = false;
    try {
      fs.rmSync(temp, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

function restore() {
  try {
    fs.rmSync(currentPointerPath(), { force: true });
    fs.rmSync(rollbackPointerPath(), { force: true });
    publish({
      state: "idle",
      latestVersion: "",
      percent: 0,
      message: "已恢复内置 Pi 内核",
    });
    return { ok: true, currentVersion: currentVersion() };
  } catch (error) {
    return { error: String(error?.message || error) };
  }
}

function commit() {
  try {
    fs.rmSync(rollbackPointerPath(), { force: true });
    pruneVersions(paths.piKernelRoot());
    return { ok: true };
  } catch (error) {
    return { error: String(error?.message || error) };
  }
}

function rollback() {
  try {
    const snapshot = readJson(rollbackPointerPath());
    if (!snapshot) {
      return { error: "没有可回退的内核快照" };
    }
    const previous = snapshot.previous;
    const previousCli =
      previous?.bundleDir &&
      path.join(String(previous.bundleDir), "cli.js");
    if (previous && previousCli && fs.existsSync(previousCli)) {
      fs.writeFileSync(
        currentPointerPath(),
        `${JSON.stringify(previous, null, 2)}\n`,
        "utf8",
      );
    } else {
      fs.rmSync(currentPointerPath(), { force: true });
    }
    fs.rmSync(rollbackPointerPath(), { force: true });
    const version = currentVersion();
    publish({
      state: "rolled-back",
      latestVersion: "",
      percent: 0,
      message: previous
        ? `新内核启动失败，已回退到 Pi ${version}`
        : `新内核启动失败，已回退到内置 Pi ${version}`,
    });
    return { ok: true, currentVersion: version };
  } catch (error) {
    return { error: String(error?.message || error) };
  }
}

function getStatus() {
  return {
    ...status,
    currentVersion: currentVersion(),
    packageName: PACKAGE_NAME,
    rollbackPending: fs.existsSync(rollbackPointerPath()),
  };
}

function init(options = {}) {
  onStatus = options.onStatus || onStatus;
  const recovered = fs.existsSync(rollbackPointerPath())
    ? rollback()
    : null;
  publish({
    state: recovered?.ok ? "rolled-back" : "idle",
    message: recovered?.ok
      ? `检测到未完成的内核更新，已回退到 Pi ${recovered.currentVersion}`
      : "Pi 内核跟随官方 npm 源，可独立更新",
  });
}

module.exports = {
  check,
  commit,
  currentVersion,
  getStatus,
  init,
  install,
  restore,
  rollback,
};
