const fs = require("node:fs");
const path = require("node:path");
const { app } = require("electron");

let autoUpdater = null;
let feedUrl = null;
let onStatus = () => {};
let status = {
  state: "unconfigured",
  message: "未配置更新地址",
  version: app.getVersion(),
  percent: 0,
  feedUrl: null,
};

function configPath() {
  return path.join(app.getPath("userData"), "update.json");
}

function readFeedUrl() {
  const fromEnv = String(process.env.TEST_UPDATE_URL || "").trim();
  if (fromEnv) {
    return fromEnv;
  }

  try {
    const file = configPath();
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, "utf8"));
      if (typeof data?.feedUrl === "string" && data.feedUrl.trim()) {
        return data.feedUrl.trim();
      }
    }
  } catch {
    // Invalid update.json is treated as unconfigured.
  }
  return null;
}

function publish(next) {
  status = {
    ...status,
    ...next,
    version: app.getVersion(),
    feedUrl,
  };
  onStatus(status);
}

function attachEvents(updater) {
  updater.on("checking-for-update", () => {
    publish({ state: "checking", message: "正在检查更新…" });
  });
  updater.on("update-available", (info) => {
    publish({
      state: "available",
      message: `发现新版本 ${info?.version || ""}`.trim(),
      availableVersion: info?.version || null,
    });
  });
  updater.on("update-not-available", () => {
    publish({ state: "latest", message: "已经是最新版本" });
  });
  updater.on("download-progress", (progress) => {
    publish({
      state: "downloading",
      message: `正在下载 ${Math.round(progress?.percent || 0)}%`,
      percent: Math.round(progress?.percent || 0),
    });
  });
  updater.on("update-downloaded", (info) => {
    publish({
      state: "downloaded",
      message: `新版本 ${info?.version || ""} 已下载，重启后安装`,
      percent: 100,
    });
  });
  updater.on("error", (error) => {
    publish({
      state: "error",
      message: String(error?.message || error),
    });
  });
}

function setup() {
  if (autoUpdater) {
    autoUpdater.removeAllListeners();
    autoUpdater = null;
  }

  if (!app.isPackaged) {
    publish({
      state: "dev",
      message: feedUrl
        ? "开发模式不执行自动更新"
        : "开发模式：未配置更新地址",
    });
    return;
  }

  if (!feedUrl) {
    publish({
      state: "unconfigured",
      message: "未配置更新地址",
    });
    return;
  }

  try {
    const updaterModule = require("electron-updater");
    autoUpdater = updaterModule.autoUpdater;
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.setFeedURL({ provider: "generic", url: feedUrl });
    attachEvents(autoUpdater);
    publish({ state: "idle", message: "已配置更新源" });
  } catch (error) {
    publish({
      state: "error",
      message: String(error?.message || error),
    });
  }
}

function init(options = {}) {
  onStatus = options.onStatus || onStatus;
  feedUrl = readFeedUrl();
  setup();
}

function configureFeed(url) {
  const value = String(url || "").trim();
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return { error: "更新地址不是合法 URL" };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { error: "更新地址必须是 http/https" };
  }

  try {
    fs.mkdirSync(app.getPath("userData"), { recursive: true });
    fs.writeFileSync(
      configPath(),
      `${JSON.stringify({ feedUrl: value }, null, 2)}\n`,
      "utf8",
    );
    feedUrl = value;
    setup();
    return { ok: true, status: getStatus() };
  } catch (error) {
    return { error: String(error) };
  }
}

function clearFeed() {
  try {
    const file = configPath();
    if (fs.existsSync(file)) {
      fs.rmSync(file, { force: true });
    }
    feedUrl = null;
    setup();
    return { ok: true, status: getStatus() };
  } catch (error) {
    return { error: String(error) };
  }
}

function getStatus() {
  return { ...status, feedUrl };
}

async function check() {
  if (!autoUpdater) {
    return {
      error:
        status.state === "dev"
          ? "开发模式不执行自动更新"
          : "未配置更新地址",
    };
  }

  try {
    await autoUpdater.checkForUpdates();
    return { ok: true };
  } catch (error) {
    return { error: String(error?.message || error) };
  }
}

async function download() {
  if (!autoUpdater) {
    return { error: "更新未配置" };
  }

  try {
    await autoUpdater.downloadUpdate();
    return { ok: true };
  } catch (error) {
    return { error: String(error?.message || error) };
  }
}

function install() {
  if (!autoUpdater) {
    return { error: "更新未配置" };
  }

  try {
    autoUpdater.quitAndInstall(false, true);
    return { ok: true };
  } catch (error) {
    return { error: String(error?.message || error) };
  }
}

module.exports = {
  check,
  clearFeed,
  configureFeed,
  download,
  getStatus,
  init,
  install,
};
