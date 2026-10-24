const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { app } = require("electron");
const { downloadWithResume } = require("./update-downloader.cjs");

const DEFAULT_FEED_URL =
  "https://github.com/SgF-123/TesT/releases/latest/download/";

let autoUpdater = null;
let feedUrl = null;
let onStatus = () => {};
let onLog = () => {};
let availableInfo = null;
let downloadedFile = null;
let downloading = false;
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
    // Invalid update.json falls back to the built-in feed.
  }
  return DEFAULT_FEED_URL;
}

function publish(next) {
  status = {
    ...status,
    ...next,
    version: app.getVersion(),
    feedUrl,
  };
  if (next.state === "error") {
    onLog(`update:error ${next.message || ""}`);
  }
  onStatus(status);
}

function attachEvents(updater) {
  updater.on("checking-for-update", () => {
    publish({ state: "checking", message: "正在检查更新…" });
  });
  updater.on("update-available", (info) => {
    availableInfo = info || null;
    downloadedFile = null;
    publish({
      state: "available",
      message: `发现新版本 ${info?.version || ""}`.trim(),
      availableVersion: info?.version || null,
    });
  });
  updater.on("update-not-available", () => {
    availableInfo = null;
    downloadedFile = null;
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
    onLog(`update:error ${String(error?.stack || error)}`);
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
  onLog = options.onLog || onLog;
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
    feedUrl = DEFAULT_FEED_URL;
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
  if (!autoUpdater || !availableInfo) {
    return { error: "更新未配置" };
  }
  if (downloading) {
    return { error: "更新正在下载中" };
  }

  downloading = true;
  try {
    const files = Array.isArray(availableInfo.files)
      ? availableInfo.files
      : [];
    const file =
      files.find((item) => String(item?.url || "").toLowerCase().endsWith(".exe")) ||
      files[0];
    if (!file?.url) {
      throw new Error("更新清单中没有可下载的安装包");
    }

    const url = new URL(String(file.url), feedUrl).toString();
    const version = String(availableInfo.version || "update").replace(
      /[^\w.-]/g,
      "_",
    );
    const target = path.join(
      app.getPath("userData"),
      "updates",
      `TesT-Setup-${version}.exe`,
    );
    publish({
      state: "downloading",
      message: `正在下载 ${version}…`,
      percent: 0,
      availableVersion: availableInfo.version || null,
    });
    const result = await downloadWithResume({
      url,
      target,
      sha512: file.sha512,
      size: Number(file.size || 0) || undefined,
      log: onLog,
      onProgress: ({ percent }) => {
        publish({
          state: "downloading",
          message: `正在下载 ${version}（${percent}%）`,
          percent,
          availableVersion: availableInfo.version || null,
        });
      },
      onRetry: ({ attempt, retries, wait, error }) => {
        publish({
          state: "downloading",
          message: `下载中断，${Math.ceil(wait / 1000)} 秒后续传（${attempt}/${retries}）：${error}`,
          availableVersion: availableInfo.version || null,
        });
      },
    });
    downloadedFile = result.path;
    publish({
      state: "downloaded",
      message: `新版本 ${version} 已下载，重启后安装`,
      percent: 100,
      availableVersion: availableInfo.version || null,
    });
    return { ok: true, path: result.path };
  } catch (error) {
    const message = String(error?.message || error);
    publish({
      state: "error",
      message: `更新下载失败：${message}`,
      availableVersion: availableInfo?.version || null,
    });
    return { error: message };
  } finally {
    downloading = false;
  }
}

function install() {
  if (!autoUpdater) {
    return { error: "更新未配置" };
  }

  try {
    if (downloadedFile && fs.existsSync(downloadedFile)) {
      const installDir = path.dirname(process.execPath);
      const child = spawn(
        downloadedFile,
        ["--updated", "/S", "--force-run", `/D=${installDir}`],
        {
          detached: true,
          stdio: "ignore",
          windowsHide: false,
        },
      );
      child.unref();
      publish({
        state: "installing",
        message: "安装程序已启动，TesT 即将退出",
        percent: 100,
      });
      setTimeout(() => app.quit(), 350);
      return { ok: true };
    }
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
