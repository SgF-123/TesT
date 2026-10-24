const fs = require("node:fs");
const crypto = require("node:crypto");
const path = require("node:path");
const { execFile } = require("node:child_process");
const {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  screen,
  Tray,
  nativeImage,
  shell,
} = require("electron");
const { PiBridge, piNodePath } = require("./pi-bridge.cjs");
const paths = require("./paths.cjs");
const piConfig = require("./pi-config.cjs");
const discovery = require("./model-discovery.cjs");
const login = require("./login.cjs");
const { NativeLogin } = require("./native-login.cjs");
const {
  listSessions,
  searchSessions,
  usageStats,
  readSessionMessages,
} = require("./sessions.cjs");
const extensions = require("./extensions.cjs");
const updater = require("./updater.cjs");
const piUpdater = require("./pi-updater.cjs");
const { RemoteServer } = require("./remote-server.cjs");
const feishuConfig = require("./channels/feishu-config.cjs");
const { FeishuAgent } = require("./feishu-agent.cjs");
const git = require("./git.cjs");
const gitWorktree = require("./git-worktree.cjs");
const files = require("./files.cjs");
const { PtyTerminalManager } = require("./pty-terminal.cjs");
const sessionActions = require("./session-actions.cjs");
const behavior = require("./behavior.cjs");
const permissionRules = require("./permission-rules.cjs");
const dataLocation = require("./data-location.cjs");
const windowState = require("./window-state.cjs");

app.setName("TesT");
const sharedUserData = path.join(app.getPath("appData"), "TesT");
const isAgentWindow = process.argv.includes("--agent-window");
app.setPath(
  "userData",
  isAgentWindow
    ? path.join(sharedUserData, "agent-windows", String(process.pid))
    : sharedUserData,
);
app.setAppUserModelId("com.testdesktop.app");
if (isAgentWindow) {
  const sessionData = path.join(
    app.getPath("temp"),
    `TesT-agent-${process.pid}`,
  );
  app.setPath("sessionData", sessionData);
}

app.commandLine.appendSwitch("disable-renderer-backgrounding");
app.commandLine.appendSwitch("disable-background-timer-throttling");
app.commandLine.appendSwitch("disable-backgrounding-occluded-windows");
app.commandLine.appendSwitch(
  "disable-features",
  "CalculateNativeWinOcclusion",
);
const captureLaunch = process.argv.some((arg) =>
  arg.startsWith("--capture"),
);
const forceGpu = process.argv.includes("--gpu");
const forceSoftware = process.argv.includes("--software");
if ((captureLaunch && !forceGpu) || forceSoftware) {
  // Electron's capturePage() is unreliable with GPU compositing on this host.
  app.commandLine.appendSwitch("disable-gpu");
} else {
  app.commandLine.appendSwitch("enable-gpu-rasterization");
  app.commandLine.appendSwitch("ignore-gpu-blocklist");
}

const isDev = process.argv.includes("--dev");
const shouldCapture = process.argv.includes("--capture");
const shouldCaptureSettings = process.argv.includes("--capture-settings");
const shouldCaptureFeishu = process.argv.includes("--capture-feishu");
const shouldCaptureLogin = process.argv.includes("--capture-login");
const shouldCaptureLoginDetail = process.argv.includes(
  "--capture-login-detail",
);
const shouldCaptureLoginStart = process.argv.includes(
  "--capture-login-start",
);
const shouldCaptureLoginAuth = process.argv.includes("--capture-login-auth");
const shouldCaptureSheet = process.argv.includes("--capture-sheet");
const shouldCaptureSwitch = process.argv.includes("--capture-switch-session");
const shouldCaptureCustom = process.argv.includes("--capture-custom");
const shouldCaptureRename = process.argv.includes("--capture-rename");
const shouldCaptureUpdate = process.argv.includes("--capture-update");
const shouldCaptureModels = process.argv.includes("--capture-models");
const shouldCaptureModelSelect = process.argv.includes(
  "--capture-model-select",
);
const shouldCaptureModelMenu = process.argv.includes(
  "--capture-model-menu",
);
const shouldCaptureWorkspace = process.argv.includes("--capture-workspace");
const shouldCaptureWorkspaceSwitch = process.argv.includes(
  "--capture-workspace-switch",
);
const shouldCapturePiUpdate = process.argv.includes(
  "--capture-pi-update",
);
const shouldCaptureRemote = process.argv.includes("--capture-remote");
const shouldCaptureSlash = process.argv.includes("--capture-slash");
const shouldCaptureStatus = process.argv.includes("--capture-status");
const shouldCaptureFiles = process.argv.includes("--capture-files");
const shouldCaptureTerminal = process.argv.includes("--capture-terminal");
const shouldCaptureBranches = process.argv.includes("--capture-branches");
const shouldCaptureFind = process.argv.includes("--capture-find");
const shouldCaptureMention = process.argv.includes("--capture-mention");
const shouldCaptureExt = process.argv.includes("--capture-ext");
const shouldCaptureTools = process.argv.includes("--capture-tools");
const shouldCaptureGeneral = process.argv.includes("--capture-general");
const shouldAutoRemote = process.argv.includes("--remote");
const shouldCaptureMobile = process.argv.includes("--capture-mobile");
const shouldCaptureMore = process.argv.includes("--capture-more");
const shouldAutoTunnel = process.argv.includes("--remote-tunnel");
const shouldOpenDevTools = process.argv.includes("--devtools");
const shouldOpenLogin = process.argv.includes("--open-login");
const shouldBench = process.argv.includes("--bench");
const shouldBenchStream = process.argv.includes("--bench-stream");
const shouldBenchClick = process.argv.includes("--bench-click");
const installTestIndex = process.argv.indexOf("--install-test");
const captureMode =
  shouldCapture ||
  shouldCaptureSettings ||
  shouldCaptureFeishu ||
  shouldCaptureLogin ||
  shouldCaptureLoginDetail ||
  shouldCaptureLoginStart ||
  shouldCaptureLoginAuth ||
  shouldCaptureSheet ||
  shouldCaptureSwitch ||
  shouldCaptureCustom ||
  shouldCaptureRename ||
  shouldCaptureUpdate ||
  shouldCaptureModels ||
  shouldCaptureModelSelect ||
  shouldCaptureModelMenu ||
  shouldCaptureWorkspace ||
  shouldCaptureWorkspaceSwitch ||
  shouldCapturePiUpdate ||
  shouldCaptureRemote ||
  shouldCaptureSlash ||
  shouldCaptureStatus ||
  shouldCaptureFiles ||
  shouldCaptureTerminal ||
  shouldCaptureBranches ||
  shouldCaptureFind ||
  shouldCaptureMention ||
  shouldCaptureExt ||
  shouldCaptureTools ||
  shouldCaptureGeneral ||
  shouldCaptureMore;

log(
  `argv:${process.argv.slice(1).join(" ")} captureModels=${shouldCaptureModels} captureMode=${captureMode}`,
);

let window = null;
let bridge = null;
let bridgeRestartTimer = null;
let rendererReady = false;
let pending = [];
let drag = null;
let nativeLogin = null;
let workspaceCwd = "";
let recentWorkspaces = [];
let remoteServer = null;
let terminalManager = null;
let feishuAgent = null;
let tray = null;
let isQuitting = false;
let trayHintShown = false;
let recordQueue = [];
let recordTimer = null;
let sessionWatcher = null;
let sessionWatchTimer = null;
let rendererCrashTimes = [];

function log(message) {
  try {
    fs.appendFileSync(
      path.join(paths.dataDir(), "electron.log"),
      `${new Date().toISOString()} ${message}\n`,
    );
  } catch {
    // Logging is best-effort.
  }
}

function showDataSetup() {
  return new Promise((resolve) => {
    let chosen = dataLocation.savedDir() || dataLocation.defaultDir();
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const setupWindow = new BrowserWindow({
      width: 660,
      height: 520,
      resizable: false,
      minimizable: false,
      maximizable: false,
      backgroundColor: "#f1f3f1",
      title: "TesT · 数据目录",
      webPreferences: {
        preload: path.join(__dirname, "setup-preload.cjs"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    setupWindow.removeMenu();
    const infoHandler = () => ({
      dataDir: chosen,
      portable: Boolean(process.env.PORTABLE_EXECUTABLE_DIR),
    });
    const chooseHandler = async () => {
      const result = await dialog.showOpenDialog(setupWindow, {
        title: "选择 TesT 数据目录",
        defaultPath: chosen,
        properties: ["openDirectory", "createDirectory"],
      });
      if (!result.canceled && result.filePaths[0]) {
        chosen = path.resolve(result.filePaths[0]);
      }
      return { dataDir: chosen };
    };
    const confirmHandler = (_event, payload) => {
      const selected = dataLocation.saveDir(payload?.dataDir || chosen);
      finish(selected);
      if (!setupWindow.isDestroyed()) setupWindow.close();
      return { ok: true, dataDir: selected };
    };
    ipcMain.handle("tesT:setup-info", infoHandler);
    ipcMain.handle("tesT:setup-choose", chooseHandler);
    ipcMain.handle("tesT:setup-confirm", confirmHandler);
    setupWindow.on("closed", () => {
      ipcMain.removeHandler("tesT:setup-info");
      ipcMain.removeHandler("tesT:setup-choose");
      ipcMain.removeHandler("tesT:setup-confirm");
      finish(null);
    });
    void setupWindow.loadFile(path.join(__dirname, "setup.html"));
  });
}

function startSessionWatcher() {
  if (sessionWatcher) {
    return;
  }
  try {
    sessionWatcher = fs.watch(
      paths.sessionsDir(),
      { recursive: true },
      (_event, filename) => {
        if (filename && !String(filename).toLowerCase().endsWith(".jsonl")) {
          return;
        }
        if (sessionWatchTimer !== null) {
          clearTimeout(sessionWatchTimer);
        }
        sessionWatchTimer = setTimeout(() => {
          sessionWatchTimer = null;
          push({ type: "sessions_changed" });
        }, 350);
      },
    );
    sessionWatcher.on("error", (error) => {
      log(`sessions:watch-error ${error}`);
    });
  } catch (error) {
    log(`sessions:watch-start-error ${error}`);
  }
}

function workspaceStorePath() {
  return path.join(paths.dataDir(), "workspaces.json");
}

function isDirectory(target) {
  try {
    return fs.statSync(target).isDirectory();
  } catch {
    return false;
  }
}

function normalizeWorkspace(target) {
  return path.resolve(String(target || ""));
}

function workspaceName(target) {
  const clean = String(target || "").replace(/[\\/]+$/, "");
  return clean.split(/[\\/]/).pop() || clean || "工作区";
}

function workspacePayload() {
  return {
    cwd: workspaceCwd,
    name: workspaceName(workspaceCwd),
    recent: recentWorkspaces,
    scratch: path.join(paths.dataDir(), "不在项目"),
  };
}

function expandContextPaths(input, limit = 40) {
  const output = [];
  const queue = input.map((item) => ({ target: item, depth: 0 }));
  const skip = new Set([
    ".git",
    "node_modules",
    "dist",
    "release",
    "build",
    "work",
    ".cache",
    "coverage",
  ]);
  while (queue.length > 0 && output.length < limit) {
    const { target, depth } = queue.shift();
    let stat;
    try {
      stat = fs.statSync(target);
    } catch {
      continue;
    }
    if (stat.isFile()) {
      output.push(target);
      continue;
    }
    if (!stat.isDirectory() || depth >= 4) {
      continue;
    }
    let entries = [];
    try {
      entries = fs.readdirSync(target, { withFileTypes: true });
    } catch {
      continue;
    }
    entries.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
    for (const entry of entries) {
      if (output.length + queue.length >= limit * 2) {
        break;
      }
      if (entry.name.startsWith(".")) {
        continue;
      }
      if (entry.isDirectory() && skip.has(entry.name)) {
        continue;
      }
      queue.push({
        target: path.join(target, entry.name),
        depth: depth + 1,
      });
    }
  }
  return output.slice(0, limit);
}

function remoteStatus() {
  return (
    remoteServer?.status() || {
      running: false,
      port: 0,
      token: "",
      url: "",
      urls: [],
      qrSvg: "",
      clients: 0,
      workspace: workspaceCwd,
      localOnly: false,
      error: "",
    }
  );
}

function readWorkspaceStore() {
  try {
    const data = JSON.parse(fs.readFileSync(workspaceStorePath(), "utf8"));
    return {
      current: typeof data?.current === "string" ? data.current : "",
      recent: Array.isArray(data?.recent)
        ? data.recent.filter((item) => typeof item === "string")
        : [],
    };
  } catch {
    return { current: "", recent: [] };
  }
}

function writeWorkspaceStore() {
  try {
    fs.writeFileSync(
      workspaceStorePath(),
      JSON.stringify(
        {
          current: workspaceCwd,
          recent: recentWorkspaces,
        },
        null,
        2,
      ),
      "utf8",
    );
  } catch (error) {
    log(`workspace:save-error ${error}`);
  }
}

function initWorkspace() {
  const fallback = app.isPackaged
    ? app.getPath("home")
    : paths.projectRoot();
  const store = readWorkspaceStore();
  const candidates = [store.current, ...store.recent]
    .filter(Boolean)
    .map(normalizeWorkspace);

  workspaceCwd =
    candidates.find((candidate) => isDirectory(candidate)) ||
    normalizeWorkspace(fallback);

  recentWorkspaces = [];
  for (const candidate of [workspaceCwd, ...candidates]) {
    if (!isDirectory(candidate)) {
      continue;
    }
    if (
      recentWorkspaces.some(
        (item) => item.toLowerCase() === candidate.toLowerCase(),
      )
    ) {
      continue;
    }
    recentWorkspaces.push(candidate);
  }
  recentWorkspaces = recentWorkspaces.slice(0, 8);
  writeWorkspaceStore();
  log(`workspace:init ${workspaceCwd}`);
}

function setWorkspace(target, options = {}) {
  const resolved = normalizeWorkspace(target);
  if (!isDirectory(resolved)) {
    return { error: "目录不存在或不可访问" };
  }

  const changed =
    !workspaceCwd ||
    resolved.toLowerCase() !== workspaceCwd.toLowerCase();
  workspaceCwd = resolved;
  if (!options.transient) {
    recentWorkspaces = [
      resolved,
      ...recentWorkspaces.filter(
        (item) => item.toLowerCase() !== resolved.toLowerCase(),
      ),
    ].slice(0, 8);
    writeWorkspaceStore();
  }

  if (changed) {
    if (bridge) {
      bridge.setCwd(resolved, { fresh: true });
    } else {
      ensureBridge();
    }
    push({
      type: "workspace_changed",
      ...workspacePayload(),
    });
    log(`workspace:set ${resolved}`);
  }

  return workspacePayload();
}

function noteWorkspace(target) {
  const resolved = normalizeWorkspace(target);
  if (!isDirectory(resolved)) {
    return { error: "目录不存在或不可访问" };
  }
  workspaceCwd = resolved;
  const scratch = path.join(paths.dataDir(), "不在项目");
  if (resolved.toLowerCase() !== scratch.toLowerCase()) {
    recentWorkspaces = [
      resolved,
      ...recentWorkspaces.filter(
        (item) => item.toLowerCase() !== resolved.toLowerCase(),
      ),
    ].slice(0, 8);
    writeWorkspaceStore();
  }
  return workspacePayload();
}

async function chooseWorkspace() {
  const result = await dialog.showOpenDialog(window, {
    title: "选择工作目录",
    defaultPath: workspaceCwd || undefined,
    properties: ["openDirectory"],
  });
  if (result.canceled || !result.filePaths?.[0]) {
    return { canceled: true, ...workspacePayload() };
  }

  const selected = setWorkspace(result.filePaths[0]);
  return selected.error
    ? selected
    : { canceled: false, ...selected };
}

function send(record) {
  if (!window || window.isDestroyed()) {
    return;
  }

  window.webContents.send("tesT:record", record);
}

function push(record) {
  if (remoteServer && record?.type !== "remote_status") {
    remoteServer.broadcast(record);
  }

  if (!rendererReady || !window) {
    pending.push(record);
    return;
  }

  if (
    record.type === "message_update" ||
    record.type === "tool_execution_update"
  ) {
    recordQueue.push(record);
    if (recordTimer === null) {
      recordTimer = setTimeout(() => {
        recordTimer = null;
        const batch = recordQueue;
        recordQueue = [];
        if (batch.length > 0 && window && !window.isDestroyed()) {
          window.webContents.send("tesT:records", batch);
        }
      }, 30);
    }
    return;
  }

  send(record);
}

function flushPending() {
  if (pending.length === 0) {
    return;
  }

  const records = pending;
  pending = [];
  for (const record of records) {
    send(record);
  }
}

function showWindow() {
  if (!window) {
    return;
  }
  if (window.isMinimized()) {
    window.restore();
  }
  window.show();
  window.focus();
}

function notifyTray(title, content) {
  if (!tray) {
    return;
  }
  try {
    tray.displayBalloon({ title, content });
  } catch {
    // Balloons are optional.
  }
}

function createTray() {
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, "icon.png")
    : path.join(__dirname, "..", "build", "icon.png");
  const trayPath = app.isPackaged
    ? path.join(process.resourcesPath, "tray.png")
    : path.join(__dirname, "..", "build", "tray.png");
  const trayImage = nativeImage.createFromPath(trayPath);
  const icon = trayImage.isEmpty()
    ? nativeImage.createFromPath(iconPath)
    : trayImage;
  tray = new Tray(icon);
  tray.setToolTip("TesT");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "显示 TesT", click: showWindow },
      { label: "隐藏到托盘", click: () => window?.hide() },
      { type: "separator" },
      {
        label: "检查更新",
        click: () => {
          void updater.check();
        },
      },
      { type: "separator" },
      {
        label: "退出 TesT",
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]),
  );
  tray.on("click", showWindow);
}

function createWindow() {
  const stateFile = path.join(
    paths.dataDir(),
    isAgentWindow ? "window-state-agent.json" : "window-state.json",
  );
  const workArea = screen.getPrimaryDisplay().workArea;
  const boundsArg = process.argv.find((arg) =>
    arg.startsWith("--window-bounds="),
  );
  const parsedBounds = boundsArg
    ? boundsArg
        .slice("--window-bounds=".length)
        .split(",")
        .map((value) => Number(value))
    : [];
  const savedState =
    parsedBounds.length === 4 &&
    parsedBounds.every((value) => Number.isFinite(value))
      ? {
          x: parsedBounds[0],
          y: parsedBounds[1],
          width: parsedBounds[2],
          height: parsedBounds[3],
        }
      : windowState.load(stateFile, workArea);
  window = new BrowserWindow({
    width: savedState.width,
    height: savedState.height,
    x: savedState.x,
    y: savedState.y,
    minWidth: Math.min(1100, Math.max(900, workArea.width - 32)),
    minHeight: Math.min(700, Math.max(600, workArea.height - 32)),
    show: true,
    frame: false,
    roundedCorners: true,
    backgroundColor: "#eeeeeb",
    title: "TesT",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });
  const saveWindowState = windowState.attach(window, stateFile);

  window.removeMenu();
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", (event, url) => {
    if (url === window.webContents.getURL()) {
      return;
    }
    event.preventDefault();
    if (/^https?:\/\//i.test(url)) {
      void shell.openExternal(url);
    }
  });
  window.webContents.on("will-attach-webview", (event) => {
    event.preventDefault();
  });
  window.once("ready-to-show", () => {
    window.show();
    if (savedState?.maximized) {
      window.maximize();
    }
    setTimeout(() => {
      saveWindowState();
    }, 700);
  });
  window.on("show", () => {
    window?.webContents.setBackgroundThrottling(false);
  });
  window.on("hide", () => {
    window?.webContents.setBackgroundThrottling(true);
  });
  window.on("minimize", () => {
    window?.webContents.setBackgroundThrottling(true);
  });
  window.on("restore", () => {
    window?.webContents.setBackgroundThrottling(false);
  });
  window.on("close", (event) => {
    if (!isQuitting) {
      if (!behavior.read().closeToTray) {
        isQuitting = true;
        app.quit();
        return;
      }
      event.preventDefault();
      window.hide();
      if (tray && !trayHintShown) {
        trayHintShown = true;
        try {
          notifyTray("TesT", "TesT 已最小化到托盘，双击图标可以恢复。");
        } catch {
          // Balloons are optional.
        }
      }
    }
  });
  window.on("closed", () => {
    window = null;
  });
  window.on("maximize", () => {
    if (window) {
      window.webContents.send("tesT:maximized", true);
    }
  });
  window.on("unmaximize", () => {
    if (window) {
      window.webContents.send("tesT:maximized", false);
    }
  });

  window.webContents.on("console-message", (_event, ...args) => {
    const details = args[0];
    if (details && typeof details === "object") {
      log(
        `renderer[${details.level ?? "?"}] ${details.message ?? ""}`,
      );
      return;
    }
    log(`renderer[${args[0] ?? "?"}] ${args[1] ?? ""}`);
  });

  window.on("unresponsive", () => {
    log("window:unresponsive");
  });
  window.on("responsive", () => {
    log("window:responsive");
  });

  window.webContents.on("did-finish-load", () => {
    if (!window.webContents.getURL().includes("index.html")) {
      return;
    }
    log("renderer:loaded");
    window.show();
    window.focus();
    if (captureMode) {
      window.show();
    }
    if (shouldBench) {
      window.show();
      window.focus();
      window.setAlwaysOnTop(true);
      window.webContents.setBackgroundThrottling(false);
      log(
        `bench:window visible=${window.isVisible()} focused=${window.isFocused()} minimized=${window.isMinimized()}`,
      );
      setTimeout(() => window?.setAlwaysOnTop(false), 4000);
      setTimeout(() => {
        void window.webContents
          .executeJavaScript(
            `new Promise((resolve) => {
              let frames = 0;
              const start = performance.now();
              const tick = (now) => {
                frames += 1;
                if (now - start < 2000) {
                  requestAnimationFrame(tick);
                } else {
                  resolve({
                    fps: Math.round((frames / (now - start)) * 10000) / 10,
                    frames,
                    durationMs: Math.round(now - start),
                  });
                }
              };
              requestAnimationFrame(tick);
            })`,
          )
          .then((result) => {
            log(`bench:${JSON.stringify(result)}`);
            app.quit();
          })
          .catch((error) => {
            log(`bench:error ${error}`);
            app.quit();
          });
      }, 2500);
    }
    if (shouldBenchStream) {
      window.show();
      window.focus();
      setTimeout(() => {
        const frames = window.webContents.executeJavaScript(
          `new Promise((resolve) => {
            let count = 0;
            const start = performance.now();
            const tick = (now) => {
              count += 1;
              if (now - start < 2000) requestAnimationFrame(tick);
              else resolve({
                fps: Math.round((count / (now - start)) * 10000) / 10,
                frames: count,
                durationMs: Math.round(now - start),
              });
            };
            requestAnimationFrame(tick);
          })`,
        );
        let sent = 0;
        const timer = setInterval(() => {
          for (let index = 0; index < 2; index += 1) {
            push({
              type: "message_update",
              assistantMessageEvent: {
                type: "text_delta",
                delta: "x",
              },
            });
            sent += 1;
          }
          if (sent >= 200) {
            clearInterval(timer);
          }
        }, 16);
        frames
          .then((result) => {
            log(
              `bench-stream:${JSON.stringify({
                ...result,
                records: sent,
              })}`,
            );
            app.quit();
          })
          .catch((error) => {
            log(`bench-stream:error ${error}`);
            app.quit();
          });
      }, 2500);
    }
    if (shouldCaptureLoginDetail) {
      setTimeout(() => {
        void window.webContents
          .executeJavaScript(
            `(async () => {
              const rows = [...document.querySelectorAll('.login-provider')];
              const target = rows.find((row) => row.innerText.includes('Anthropic'));
              if (target) target.click();
              await new Promise((resolve) => setTimeout(resolve, 700));
              return {
                clicked: Boolean(target),
                mode: [...document.querySelectorAll('.login-mode button')].map((button) => ({
                  text: button.innerText,
                  className: button.className,
                })),
                hasKeyInput: Boolean(document.querySelector('.login-flow input[type="password"]')),
              };
            })()`,
          )
          .then((result) => log(`login-detail:${JSON.stringify(result)}`))
          .catch((error) => log(`login-detail:error ${error}`));
      }, 2600);
    }
    if (shouldCaptureLoginStart) {
      setTimeout(() => {
        void window.webContents
          .executeJavaScript(
            `(async () => {
              const row = [...document.querySelectorAll('.login-provider')]
                .find((item) => item.innerText.includes('Anthropic'));
              row?.click();
              await new Promise((resolve) => setTimeout(resolve, 700));
              const start = [...document.querySelectorAll('.login-flow button')]
                .find((item) => item.innerText.includes('开始登录'));
              start?.click();
              return { row: Boolean(row), start: Boolean(start) };
            })()`,
          )
          .then((result) => log(`login-start:${JSON.stringify(result)}`))
          .catch((error) => log(`login-start:error ${error}`));
      }, 2400);
    }
    if (shouldCaptureLoginAuth) {
      setTimeout(() => {
        void window.webContents
          .executeJavaScript(
            `(async () => {
              const row = [...document.querySelectorAll('.login-provider')]
                .find((item) => item.innerText.includes('Anthropic'));
              row?.click();
              await new Promise((resolve) => setTimeout(resolve, 700));
              const start = [...document.querySelectorAll('.login-flow button')]
                .find((item) => item.innerText.includes('开始登录'));
              start?.click();
              await new Promise((resolve) => setTimeout(resolve, 3600));
              const option = document.querySelector('.login-prompt-option');
              option?.click();
              return {
                row: Boolean(row),
                start: Boolean(start),
                option: Boolean(option),
              };
            })()`,
          )
          .then((result) => log(`login-auth:${JSON.stringify(result)}`))
          .catch((error) => log(`login-auth:error ${error}`));
      }, 2400);
    }
    if (shouldCaptureSwitch) {
      setTimeout(() => {
        void window.webContents
          .executeJavaScript(
            `(async () => {
              let rows = [];
              for (let attempt = 0; attempt < 30; attempt += 1) {
                rows = [...document.querySelectorAll('.tree-session')];
                if (rows.length > 0) break;
                await new Promise((resolve) => setTimeout(resolve, 500));
              }
              const target =
                rows.find((row) =>
                  row.innerText.includes('真实会话测试'),
                ) ||
                rows.find((row) => !row.classList.contains('active'));
              target?.click();
              await new Promise((resolve) => setTimeout(resolve, 2600));
              return {
                count: rows.length,
                clicked: Boolean(target),
                empty: Boolean(document.querySelector('.empty-bug')),
                text: document.querySelector('.thread')?.innerText.slice(0, 240),
              };
            })()`,
          )
          .then((result) => log(`switch-session:${JSON.stringify(result)}`))
          .catch((error) => log(`switch-session:error ${error}`));
      }, 4200);
    }
    if (shouldCaptureRename) {
      setTimeout(() => {
        void window.webContents
          .executeJavaScript(
            `window.tesT.send({ type: "set_session_name", name: "已重命名会话" }); true`,
          )
          .then((result) => log(`rename-test:${result}`))
          .catch((error) => log(`rename-test:error ${error}`));
      }, 5200);
    }
    if (shouldCaptureModelSelect) {
      setTimeout(() => {
        void window.webContents
          .executeJavaScript(
            `document.querySelector(".settings-dialog .select-trigger")?.click(); true`,
          )
          .then((result) => log(`model-select:${result}`))
          .catch((error) => log(`model-select:error ${error}`));
      }, 4500);
    }
    if (shouldCaptureModelMenu) {
      setTimeout(() => {
        void window.webContents
          .executeJavaScript(
            `(async () => {
              const started = Date.now();
              while (Date.now() - started < 14000) {
                const pill = document.querySelector(".composer-tools button.pill");
                if (pill && !pill.textContent.includes("未配置")) {
                  pill.click();
                  await new Promise((resolve) => setTimeout(resolve, 400));
                  const scroller = document.querySelector(".model-menu-scroll");
                  return JSON.stringify({
                    clicked: pill.textContent.trim(),
                    settings: Boolean(document.querySelector(".settings-dialog")),
                    modelMenu: Boolean(document.querySelector(".model-menu")),
                    scroll: scroller
                      ? {
                          scrollHeight: scroller.scrollHeight,
                          clientHeight: scroller.clientHeight,
                          hasScroll:
                            scroller.scrollHeight > scroller.clientHeight,
                        }
                      : null,
                  });
                }
                await new Promise((resolve) => setTimeout(resolve, 250));
              }
              document.querySelector(".composer-tools button.pill")?.click();
              return "timeout";
            })()`,
          )
          .then((result) => log(`model-menu:${result}`))
          .catch((error) => log(`model-menu:error ${error}`));
      }, 2500);
    }
    if (shouldCaptureWorkspaceSwitch) {
      setTimeout(() => {
        void window.webContents
          .executeJavaScript(
            `(() => {
              const items = [...document.querySelectorAll(".workspace-list .menu-item")];
              const target = items.find((item) => item.textContent.includes("\\\\pi")) || items[1] || items[0];
              target?.click();
              return target?.textContent?.trim() || "none";
            })()`,
          )
          .then((result) => log(`workspace-switch:${result}`))
          .catch((error) => log(`workspace-switch:error ${error}`));
      }, 2500);
    }
    if (shouldCapturePiUpdate) {
      setTimeout(() => {
        void window.webContents
          .executeJavaScript(
            `(() => {
              const buttons = [...document.querySelectorAll(".pi-update-section button")];
              const target = buttons.find((button) =>
                button.textContent.includes("检查 Pi 更新"),
              );
              target?.click();
              return target?.textContent?.trim() || "none";
            })()`,
          )
          .then((result) => log(`pi-update-check:${result}`))
          .catch((error) => log(`pi-update-check:error ${error}`));
      }, 2500);
    }
    if (shouldCaptureRemote) {
      setTimeout(() => {
        void window.webContents
          .executeJavaScript(
            `(() => {
              const buttons = [...document.querySelectorAll(".remote-start button")];
              const target = buttons.find((button) =>
                button.textContent.includes("启动手机远程"),
              );
              target?.click();
              return target?.textContent?.trim() || "none";
            })()`,
          )
          .then((result) => log(`remote-start:${result}`))
          .catch((error) => log(`remote-start:error ${error}`));
      }, 2500);
    }
    if (shouldCaptureMore) {
      setTimeout(() => {
        void window.webContents
          .executeJavaScript(
            `(() => {
              const buttons = [...document.querySelectorAll(".chat-actions button")];
              const target = buttons.find((button) =>
                button.textContent.includes("更多"),
              );
              target?.dispatchEvent(
                new PointerEvent("pointerdown", {
                  bubbles: true,
                  cancelable: true,
                  button: 0,
                  pointerType: "mouse",
                }),
              );
              return target?.textContent?.trim() || "none";
            })()`,
          )
          .then((result) => log(`more-menu:${result}`))
          .catch((error) => log(`more-menu:error ${error}`));
      }, 2500);
    }
    if (shouldBenchClick) {
      window.show();
      window.focus();
      setTimeout(() => {
        void window.webContents
          .executeJavaScript(
            `(async () => {
              const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
              const nextFrame = () =>
                new Promise((resolve) =>
                  requestAnimationFrame(() =>
                    requestAnimationFrame(resolve),
                  ),
                );
              const chip = document.querySelector(".project-chip");
              const t0 = performance.now();
              chip?.click();
              const t1 = performance.now();
              await nextFrame();
              const t2 = performance.now();
              const workspaceOpen = Boolean(
                document.querySelector(".workspace-menu"),
              );
              chip?.click();
              await wait(120);
              const pill = document.querySelector(
                ".composer-tools button.pill",
              );
              const t3 = performance.now();
              pill?.click();
              const t4 = performance.now();
              await nextFrame();
              const t5 = performance.now();
              const modelOpen = Boolean(
                document.querySelector(".model-menu"),
              );
              return {
                workspaceSync: +(t1 - t0).toFixed(1),
                workspaceFrames: +(t2 - t0).toFixed(1),
                workspaceOpen,
                modelSync: +(t4 - t3).toFixed(1),
                modelFrames: +(t5 - t3).toFixed(1),
                modelOpen,
              };
            })()`,
          )
          .then((result) => {
            log(`bench-click:${JSON.stringify(result)}`);
            app.quit();
          })
          .catch((error) => {
            log(`bench-click:error ${error}`);
            app.quit();
          });
      }, 4000);
    }
    if (captureMode) {
      setTimeout(
        () => captureWindow(),
        shouldCaptureLoginStart
          ? 9500
          : shouldCaptureRename
            ? 9000
          : shouldCaptureModels
            ? 7600
          : shouldCaptureModelMenu
            ? 13000
          : shouldCaptureWorkspaceSwitch
            ? 14000
          : shouldCapturePiUpdate
            ? 9000
          : shouldCaptureRemote
            ? 7000
          : shouldCaptureSlash ||
              shouldCaptureStatus ||
              shouldCaptureFiles ||
              shouldCaptureTerminal ||
              shouldCaptureBranches ||
              shouldCaptureFind ||
              shouldCaptureMention ||
              shouldCaptureExt ||
              shouldCaptureTools ||
              shouldCaptureGeneral
            ? 4500
          : shouldCaptureMore
            ? 5500
          : shouldCaptureWorkspace
            ? 4500
          : shouldCaptureModelSelect
            ? 8000
          : shouldCaptureSettings || shouldCaptureFeishu
            ? 8500
          : shouldCaptureSwitch
            ? 18000
          : shouldCaptureLoginAuth
            ? 13000
          : shouldCaptureLoginDetail
            ? 6200
            : 4500,
      );
    }
  });

  const query = { shell: "1" };
  if (process.argv.includes("--dark") || process.argv.includes("--light")) {
    query.theme = process.argv.includes("--dark") ? "dark" : "light";
  }
  if (shouldCaptureSettings) {
    query.settings = "1";
    query.tab = "models";
  }
  if (shouldCaptureFeishu) {
    query.settings = "1";
    query.tab = "feishu";
  }
  if (shouldCaptureLogin) {
    query.login = "1";
  }
  if (shouldCaptureLoginDetail) {
    query.login = "1";
  }
  if (shouldCaptureLoginStart) {
    query.login = "1";
  }
  if (shouldCaptureLoginAuth) {
    query.login = "1";
  }
  if (shouldCaptureSheet) {
    query.sheet = "extensions";
  }
  if (shouldCaptureCustom) {
    query.custom = "1";
  }
  if (shouldCaptureUpdate) {
    query.settings = "1";
    query.tab = "update";
  }
  if (shouldCaptureModels) {
    query.models = "1";
  }
  if (shouldCaptureModelSelect) {
    query.settings = "1";
    query.tab = "models";
  }
  if (shouldCaptureWorkspace || shouldCaptureWorkspaceSwitch) {
    query.workspace = "1";
  }
  if (shouldCapturePiUpdate) {
    query.settings = "1";
    query.tab = "update";
  }
  if (shouldCaptureRemote) {
    query.remote = "1";
  }
  if (shouldCaptureSlash) {
    query.slash = "1";
  }
  if (shouldCaptureStatus) {
    query.status = "1";
  }
  if (shouldCaptureFiles) {
    query.files = "1";
  }
  if (shouldCaptureTerminal) {
    query.terminal = "1";
  }
  if (shouldCaptureBranches) {
    query.branches = "1";
  }
  if (shouldCaptureFind) {
    query.find = "你好";
  }
  if (shouldCaptureMention) {
    query.mention = "1";
  }
  if (shouldCaptureExt) {
    query.ext = "1";
  }
  if (shouldCaptureTools) {
    query.settings = "1";
    query.tab = "tools";
  }
  if (shouldCaptureGeneral) {
    query.settings = "1";
    query.tab = "appearance";
  }

  const splash = `data:text/html;charset=utf-8,${encodeURIComponent(`<!doctype html>
<html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><style>
html,body{height:100%;margin:0;background:#eeeeeb;font-family:"Segoe UI",sans-serif}
body{display:grid;place-items:center;color:#0a0a0a}
.splash{display:flex;flex-direction:column;align-items:center;gap:14px}
.mark{width:54px;height:54px;border-radius:14px;background:#121212;color:#fff;display:grid;place-items:center;font-size:30px;font-weight:700;box-shadow:0 10px 30px rgba(16,20,18,.16)}
.label{font-size:13px;color:#6f6f6b;letter-spacing:.02em}
.bar{width:120px;height:3px;border-radius:99px;background:#dcdcd6;overflow:hidden}
.bar span{display:block;width:45%;height:100%;border-radius:99px;background:#1f9d74;animation:slide 1.1s ease-in-out infinite}
@keyframes slide{0%{transform:translateX(-110%)}100%{transform:translateX(260%)}}
</style></head><body><div class="splash"><div class="mark">T</div><div class="label">正在启动 TesT…</div><div class="bar"><span></span></div></div></body></html>`)}`;
  window.loadURL(splash);
  setTimeout(() => {
    if (window && !window.isDestroyed()) {
      window.loadFile(paths.distEntry(), { query });
    }
  }, 120);

  if (shouldOpenDevTools) {
    window.webContents.openDevTools({ mode: "detach" });
  }
}

async function captureWindow() {
  try {
    if (shouldCaptureSlash) {
      const slashUi = await window.webContents.executeJavaScript(
        `JSON.stringify({
          items: [...document.querySelectorAll(".slash-item")].map((item) => item.innerText),
          footer: Boolean(document.querySelector(".slash-foot")),
          scrollable: (() => {
            const list = document.querySelector(".slash-list");
            return list ? list.scrollHeight > list.clientHeight : false;
          })(),
        })`,
      );
      log(`slash-ui:${slashUi}`);
    }
    if (shouldCaptureModelMenu) {
      const ui = await window.webContents.executeJavaScript(
        `JSON.stringify({
          search: location.search,
          settings: Boolean(document.querySelector(".settings-dialog")),
          modelMenu: Boolean(document.querySelector(".model-menu")),
          dialogs: document.querySelectorAll('[role="dialog"]').length,
          popovers: document.querySelectorAll(".popover").length,
        })`,
      );
      log(`ui:${ui}`);
    }
    if (shouldCaptureModelSelect) {
      const selectUi = await window.webContents.executeJavaScript(
        `(() => {
          const viewport = document.querySelector(".select-viewport");
          return JSON.stringify({
            found: Boolean(viewport),
            scrollHeight: viewport?.scrollHeight ?? 0,
            clientHeight: viewport?.clientHeight ?? 0,
            scrollTop: viewport?.scrollTop ?? 0,
            hasScroll: viewport
              ? viewport.scrollHeight > viewport.clientHeight
              : false,
          });
        })()`,
      );
      log(`select-ui:${selectUi}`);
    }
    const probe = await window.webContents.executeJavaScript(
      `JSON.stringify({
        text: document.body.innerText.slice(0, 300),
        rootLength: document.getElementById("root")?.innerHTML.length ?? -1,
        scripts: [...document.scripts].map((script) => script.src),
      })`,
    );
    log(`probe:${probe}`);
    const image = await window.webContents.capturePage();
    const target = path.join(
      paths.dataDir(),
      shouldCaptureRename
        ? "electron-capture-rename.png"
        : shouldCaptureSlash
        ? "electron-capture-slash.png"
        : shouldCaptureStatus
        ? "electron-capture-status.png"
        : shouldCaptureFiles
        ? "electron-capture-files.png"
        : shouldCaptureTerminal
        ? "electron-capture-terminal.png"
        : shouldCaptureBranches
        ? "electron-capture-branches.png"
        : shouldCaptureFind
        ? "electron-capture-find.png"
        : shouldCaptureMention
        ? "electron-capture-mention.png"
        : shouldCaptureExt
        ? "electron-capture-ext.png"
        : shouldCaptureTools
        ? "electron-capture-tools.png"
        : shouldCaptureGeneral
        ? "electron-capture-general.png"
        : shouldCaptureModels
        ? "electron-capture-models.png"
        : shouldCaptureModelMenu
        ? "electron-capture-model-menu.png"
        : shouldCaptureWorkspaceSwitch
        ? "electron-capture-workspace-switch.png"
        : shouldCapturePiUpdate
        ? "electron-capture-pi-update.png"
        : shouldCaptureRemote
        ? "electron-capture-remote.png"
        : shouldCaptureMore
        ? "electron-capture-more.png"
        : shouldCaptureWorkspace
        ? "electron-capture-workspace.png"
        : shouldCaptureModelSelect
        ? "electron-capture-model-select.png"
        : shouldCaptureUpdate
        ? "electron-capture-update.png"
        : shouldCaptureCustom
        ? "electron-capture-custom.png"
        : shouldCaptureSwitch
        ? "electron-capture-switch.png"
        : shouldCaptureSheet
        ? "electron-capture-sheet.png"
        : shouldCaptureLoginAuth
        ? "electron-capture-login-auth.png"
        : shouldCaptureLoginStart
        ? "electron-capture-login-start.png"
        : shouldCaptureLoginDetail
        ? "electron-capture-login-detail.png"
        : shouldCaptureLogin
        ? "electron-capture-login.png"
        : shouldCaptureFeishu
          ? "electron-capture-feishu.png"
        : shouldCaptureSettings
          ? "electron-capture-settings.png"
          : "electron-capture.png",
    );
    fs.writeFileSync(target, image.toPNG());
    log(`capture:${target}`);
  } catch (error) {
    log(`capture:error ${error}`);
  } finally {
    if (captureMode) {
      setTimeout(() => app.quit(), 500);
    }
  }
}

function installBundledExtensions() {
  const names = [
    "tesT-plan-mode",
    "tesT-permission-gate",
    "tesT-runtime",
  ];
  for (const name of names) {
    try {
      const source = path.join(__dirname, "assets", `${name}.ts`);
      if (!fs.existsSync(source)) {
        continue;
      }
      const target = path.join(
        paths.extensionsDir(),
        name,
        "index.ts",
      );
      fs.mkdirSync(path.dirname(target), { recursive: true });
      const existing = fs.existsSync(target)
        ? fs.readFileSync(target, "utf8")
        : "";
      const next = fs.readFileSync(source, "utf8");
      if (existing !== next) {
        fs.writeFileSync(target, next);
      }
    } catch (error) {
      log(`bundled-extension:error ${name} ${error}`);
    }
  }
}

function setPlanModeFlag(enabled) {
  const file = path.join(paths.piDataDir(), "plan-mode");
  try {
    if (enabled) {
      fs.writeFileSync(file, "1\n");
    } else {
      fs.rmSync(file, { force: true });
    }
    return { ok: true, enabled: Boolean(enabled) };
  } catch (error) {
    return { error: String(error?.message || error) };
  }
}

function startFeishuFromConfig() {
  if (!feishuAgent) {
    return;
  }
  try {
    const config = feishuConfig.readConfig();
    void feishuAgent.start(config).then((status) => {
      push({ type: "channel_status", status });
    });
  } catch (error) {
    log(`feishu:start-error ${error}`);
  }
}

function startBridge() {
  if (bridge) {
    return;
  }
  installBundledExtensions();
  bridge = new PiBridge({
    cli: paths.piCli(),
    cwd:
      workspaceCwd ||
      (app.isPackaged ? app.getPath("home") : paths.projectRoot()),
    dataDir: paths.piDataDir(),
    node: paths.nodeExe(),
    vendorDir: paths.vendorDir(),
    onRecord: (record) => {
      if (record?.type === "bridge_status") {
        log(`bridge:${record.status}`);
      } else if (record?.type === "bridge_log") {
        log(`bridge-log:${record.text}`);
      }
    if (
      record?.type === "agent_settled" &&
      window &&
      !window.isFocused() &&
      behavior.read().notifyOnComplete
    ) {
      notifyTray("Pi 已完成", "任务已结束，回到 TesT 查看结果。");
    }
      if (feishuAgent) {
        void Promise.resolve(feishuAgent.handleRecord(record)).catch(
          (error) => log(`feishu:record-error ${error}`),
        );
      }
      push(record);
    },
  });
  bridge.start();
  log("pi:started");
}

function restartBridgeWithCurrentKernel() {
  return new Promise((resolve) => {
    if (bridgeRestartTimer) {
      clearTimeout(bridgeRestartTimer);
    }
    const previous = bridge;
    bridge = null;
    try {
      previous?.stop();
    } catch {
      // The old process may already be gone.
    }
    bridgeRestartTimer = setTimeout(async () => {
      bridgeRestartTimer = null;
      if (!bridge) {
        startBridge();
      }
      const candidate = bridge;
      if (!candidate) {
        resolve(false);
        return;
      }
      const probeId = `kernel-health-${Date.now()}`;
      const responsePromise = candidate.waitForResponse(probeId, 14000);
      const sent = await candidate.sendWhenReady(
        { id: probeId, type: "get_state" },
        10000,
      );
      if (!sent) {
        candidate.rejectResponseWaiters();
        resolve(false);
        return;
      }
      const response = await responsePromise;
      resolve(
        response?.success === true &&
          candidate === bridge &&
          Boolean(candidate.child),
      );
    }, 300);
  });
}

function packageCommandCwd() {
  return (
    workspaceCwd ||
    (app.isPackaged ? app.getPath("home") : paths.projectRoot())
  );
}

function stripSourceQuotes(value) {
  let source = String(value || "")
    .replace(/^\uFEFF/, "")
    .trim();
  if (!source) {
    return "";
  }

  source = source
    .replace(/^(?:PS\s+[^>\r\n]*>|>)\s*/i, "")
    .trim();
  if (
    source.length >= 2 &&
    source.startsWith("`") &&
    source.endsWith("`")
  ) {
    source = source.slice(1, -1).trim();
  }
  if (
    source.length >= 2 &&
    source.startsWith("<") &&
    source.endsWith(">")
  ) {
    source = source.slice(1, -1).trim();
  }
  if (source.length < 2) {
    return source;
  }
  const first = source[0];
  const last = source[source.length - 1];
  return (first === '"' && last === '"') ||
    (first === "'" && last === "'")
    ? source.slice(1, -1).trim()
    : source;
}

function packageSpecFromNpmCommand(value) {
  const source = String(value || "").trim();
  const command = source.match(/^(?:npm|pnpm|yarn|bun)\s+([\s\S]*)$/i);
  if (!command) {
    return null;
  }

  const tokens = (command[1].match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [])
    .map(stripSourceQuotes)
    .filter(Boolean);
  const installIndex = tokens.findIndex((token) =>
    /^(?:i|install|add)$/i.test(token),
  );
  if (installIndex < 0) {
    return null;
  }

  const optionsWithValue = new Set([
    "--cache",
    "--include",
    "--omit",
    "--prefix",
    "--registry",
    "--tag",
    "--workspace",
    "-w",
  ]);
  const specs = [];
  const args = tokens.slice(installIndex + 1);
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === "--") {
      continue;
    }
    if (token.startsWith("-")) {
      if (
        !token.includes("=") &&
        optionsWithValue.has(token) &&
        index + 1 < args.length
      ) {
        index += 1;
      }
      continue;
    }
    specs.push(token);
  }
  if (specs.length === 0) {
    throw new Error(
      "请在 npm 命令后面写明要安装的包名，例如 npm i pi-hermes-memory。",
    );
  }
  if (specs.length > 1) {
    throw new Error("一次只能安装一个 Pi 包，请去掉多余的包名。");
  }
  return specs[0];
}

function normalizePackageSource(value) {
  let source = stripSourceQuotes(value);
  if (!source) {
    return "";
  }

  const commandSpec = packageSpecFromNpmCommand(source);
  if (commandSpec !== null) {
    source = commandSpec;
  }

  const npmPage = source.match(
    /^https?:\/\/(?:www\.)?npmjs\.(?:com|org)\/package\/(@[^/?#]+\/[^/?#]+|[^/?#]+)(?:\/v\/([^/?#]+))?/i,
  );
  if (npmPage) {
    const name = decodeURIComponent(npmPage[1]);
    const version = npmPage[2] ? decodeURIComponent(npmPage[2]) : "";
    return `npm:${name}${version ? `@${version}` : ""}`;
  }

  const registryPage = source.match(
    /^https?:\/\/registry\.(?:npmjs\.org|npmmirror\.com)\/([^?#]+)/i,
  );
  if (registryPage) {
    const pathParts = decodeURIComponent(registryPage[1])
      .replace(/^\/+|\/+$/g, "")
      .split("/")
      .filter(Boolean);
    let name = pathParts[0] || "";
    let version = "";
    if (name.startsWith("@") && pathParts.length >= 2) {
      name = `${name}/${pathParts[1]}`;
      version = pathParts[2] || "";
    } else {
      version = pathParts[1] || "";
    }
    if (name && !name.startsWith("-") && !/^[-.]/.test(version)) {
      return `npm:${name}${version ? `@${version}` : ""}`;
    }
  }

  if (/^git\+/i.test(source)) {
    source = source.slice(4);
  }
  if (/^github:/i.test(source)) {
    source = `git:github.com/${source.slice("github:".length).replace(/^\/+/, "")}`;
  }
  if (/^github\.com\//i.test(source)) {
    source = `git:${source}`;
  }
  if (/^git@/i.test(source)) {
    source = `git:${source}`;
  }
  if (/^npm:/i.test(source)) {
    return `npm:${stripSourceQuotes(source.slice(4))}`;
  }

  const npmSpec = source.match(
    /^(?:@[a-z0-9][a-z0-9._~-]*\/[a-z0-9][a-z0-9._~-]*|[a-z0-9][a-z0-9._~-]*)(?:@[^\s/]+)?$/i,
  );
  if (npmSpec) {
    return `npm:${source}`;
  }
  return source;
}

function compactPackageError(value) {
  const text = String(value || "")
    .replace(/\r\n?/g, "\n")
    .trim();
  if (!text) {
    return "";
  }

  const lines = text
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.trim());
  const interesting = lines.filter((line) =>
    /(?:npm (?:error|err!)|error:|err!|not found|notarget|enoent|eacces|eperm|e404|eresolve|eintegrity|ebusy|etimedout|econn|enotfound|eai_again|node-gyp|gyp err!|better-sqlite3|prebuild-install|permission denied|operation not permitted)/i.test(
      line,
    ),
  );
  let detail = (interesting.length ? interesting : lines).slice(-16).join("\n");
  if (detail.length > 2200) {
    detail = `…\n${detail.slice(-2200)}`;
  }
  return detail;
}

function formatPackageInstallError(error) {
  const raw = String(error?.message || error || "").trim();
  const lower = raw.toLowerCase();
  let title = "安装失败，请查看 npm 输出后重试。";

  if (/e404|404 not found|is not in this registry|notarget/.test(lower)) {
    title = "npm 上找不到这个包或版本，请检查包名和版本号。";
  } else if (
    /eacces|eperm/.test(lower) &&
    /(?:npm|_cacache|node_cache|cache)/.test(lower)
  ) {
    title =
      "npm 无法写入缓存目录，请检查磁盘空间和 npm 缓存目录权限。";
  } else if (
    /eintegrity/.test(lower)
  ) {
    title = "npm 缓存内容损坏，请清理 npm 缓存后重试。";
  } else if (
    /enospc|ebusy|resource busy|being used by another process/.test(lower)
  ) {
    title = "安装文件正被其他程序占用，请关闭相关程序后重试。";
  } else if (
    /etimedout|econnreset|econnrefused|enotfound|eai_again|fetch failed|network/.test(
      lower,
    )
  ) {
    title = "连接 npm 源失败，请检查网络或代理设置后重试。";
  } else if (
    /node-gyp|gyp err!|better-sqlite3|prebuild-install/.test(lower)
  ) {
    title =
      "插件的原生依赖构建失败，可能需要重新安装 Node.js 构建工具。";
  } else if (/eresolve|peer dep|conflicting peer/.test(lower)) {
    title = "插件依赖版本冲突，无法完成安装。";
  }

  const detail = compactPackageError(raw);
  return detail ? `${title}\n\n${detail}` : title;
}

function sourceNeedsGit(source) {
  if (/^(git:|ssh:\/\/|git@)/i.test(source)) {
    return true;
  }
  return /^https?:\/\//i.test(source) && !/npmjs\./i.test(source);
}

function commandAvailable(command, args = ["--version"]) {
  return new Promise((resolve) => {
    execFile(
      command,
      args,
      { windowsHide: true, timeout: 5000 },
      (error) => resolve(!error),
    );
  });
}

function githubRepoFromSource(source) {
  let raw = String(source || "").trim();
  if (raw.startsWith("git:")) {
    raw = raw.slice(4).trim();
  }
  if (raw.startsWith("git@")) {
    const match = raw.match(/^git@github\.com:(.+)$/i);
    if (!match) {
      return null;
    }
    raw = match[1];
  } else {
    try {
      const parsed = new URL(raw);
      if (!/^github\.com$/i.test(parsed.hostname)) {
        return null;
      }
      raw = parsed.pathname.replace(/^\/+/, "");
    } catch {
      if (!/^github\.com\//i.test(raw)) {
        return null;
      }
      raw = raw.slice("github.com/".length);
    }
  }

  const repoPath = raw.replace(/\.git$/i, "").replace(/\/+$/, "");
  const [owner, repo] = repoPath.split("/");
  return owner && repo ? { owner, repo } : null;
}

async function npmSourceForGithub(source) {
  const repoInfo = githubRepoFromSource(source);
  if (!repoInfo) {
    return "";
  }

  try {
    const response = await fetch(
      `https://registry.npmjs.org/${encodeURIComponent(repoInfo.repo)}`,
      {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!response.ok) {
      return "";
    }
    const data = await response.json();
    const latest = String(data?.["dist-tags"]?.latest || "");
    const version = latest ? data?.versions?.[latest] : null;
    const repository =
      version?.repository?.url ||
      data?.repository?.url ||
      "";
    const normalized = String(repository)
      .replace(/^git\+/i, "")
      .replace(/^git@github\.com:/i, "")
      .replace(/^https?:\/\/github\.com\//i, "")
      .replace(/\.git$/i, "")
      .toLowerCase();
    const expected =
      `${repoInfo.owner}/${repoInfo.repo}`.toLowerCase();
    if (!data?.name || !normalized.includes(expected)) {
      return "";
    }
    return `npm:${data.name}${latest ? `@${latest}` : ""}`;
  } catch {
    return "";
  }
}

function runPiPackageCommand(args) {
  return new Promise((resolve, reject) => {
    const cli = paths.piCli();
    if (!fs.existsSync(cli)) {
      reject(new Error(`Pi CLI 不存在：${cli}`));
      return;
    }

    const env = {
      ...process.env,
      PI_CODING_AGENT_DIR: paths.piDataDir(),
      PI_SKIP_VERSION_CHECK: "1",
      NO_COLOR: "1",
      NODE_PATH: piNodePath(cli, paths.vendorDir()),
    };

    execFile(
      paths.nodeExe(),
      [cli, ...args],
      {
        cwd: packageCommandCwd(),
        env,
        windowsHide: true,
        timeout: 10 * 60 * 1000,
        maxBuffer: 8 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        const output = String(stdout || "").trim();
        const errors = String(stderr || "").trim();
        if (error) {
          const detail = [errors, output].filter(Boolean).join("\n");
          reject(new Error(detail || error.message));
          return;
        }
        resolve({ output, stderr: errors });
      },
    );
  });
}

function ensureBridge() {
  if (!bridge) {
    startBridge();
  }
}

function openPiLogin() {
  const result = login.open({
    onClosed: () => {
      bridge?.restart();
      const status = piConfig.authStatus();
      push({
        type: "pi_login_closed",
        providers: status.providers,
        oauthProviders: status.oauthProviders,
      });
    },
  });
  push({
    type: "pi_login_opened",
    error: result.error,
    alreadyOpen: result.alreadyOpen,
  });
  return result;
}

function registerIpc() {
  ipcMain.on("tesT:ready", () => {
    ensureBridge();
    rendererReady = true;
    flushPending();
  });

  ipcMain.on("tesT:pi-command", (_event, command) => {
    ensureBridge();
    if (
      command?.type === "extension_ui_response" &&
      command.id &&
      feishuAgent
    ) {
      feishuAgent.resolveApproval(command.id);
    }
    bridge?.send(command);
  });

  ipcMain.handle("tesT:get-workspace", () => workspacePayload());

  ipcMain.handle("tesT:choose-workspace", () => chooseWorkspace());

  ipcMain.handle("tesT:set-workspace", (_event, payload) =>
    setWorkspace(payload?.cwd),
  );

  ipcMain.handle("tesT:note-workspace", (_event, payload) =>
    noteWorkspace(payload?.cwd),
  );

  ipcMain.handle("tesT:new-project-session", async (_event, payload) => {
    try {
      const target = String(payload?.cwd || "");
      if (!target) {
        return { error: "缺少项目目录" };
      }
      const wasCurrent =
        workspaceCwd &&
        normalizeWorkspace(workspaceCwd).toLowerCase() ===
          normalizeWorkspace(target).toLowerCase();
      const result = setWorkspace(target);
      if (result?.error) {
        return result;
      }
      const sent = bridge
        ? await bridge.sendWhenReady(
            wasCurrent
              ? {
                  id: `new-project-${Date.now()}`,
                  type: "new_session",
                }
              : {
                  id: `project-ready-${Date.now()}`,
                  type: "get_state",
                },
            10000,
          )
        : false;
      if (!sent) {
        return { error: "项目会话启动超时，请重试" };
      }
      return { ...result, project: true };
    } catch (error) {
      return { error: String(error?.message || error) };
    }
  });

  ipcMain.handle("tesT:new-scratch-session", async () => {
    try {
      const scratch = path.join(paths.dataDir(), "不在项目");
      fs.mkdirSync(scratch, { recursive: true });
      const wasScratch =
        workspaceCwd &&
        normalizeWorkspace(workspaceCwd).toLowerCase() ===
          normalizeWorkspace(scratch).toLowerCase();
      const result = setWorkspace(scratch, { transient: true });
      if (result?.error) {
        return result;
      }
      const sent = bridge
        ? await bridge.sendWhenReady(
            wasScratch
              ? {
                  id: `new-scratch-${Date.now()}`,
                  type: "new_session",
                }
              : {
                  id: `scratch-ready-${Date.now()}`,
                  type: "get_state",
                },
            10000,
          )
        : false;
      if (!sent) {
        return { error: "临时会话启动超时，请重试" };
      }
      return { ...result, scratch: true };
    } catch (error) {
      return { error: String(error?.message || error) };
    }
  });

  ipcMain.handle("tesT:remote-status", () => remoteStatus());

  ipcMain.handle("tesT:new-agent-window", () => {
    try {
      const args = app.isPackaged
        ? ["--agent-window", "--software"]
        : [app.getAppPath(), "--agent-window", "--software"];
      if (window && !window.isDestroyed()) {
        const bounds = window.getBounds();
        const workArea = screen.getDisplayMatching(bounds).workArea;
        const width = Math.max(800, Math.floor(workArea.width / 2));
        args.push(
          `--window-bounds=${workArea.x + Math.floor(workArea.width / 2)},${workArea.y},${width},${workArea.height}`,
        );
      }
      const child = require("node:child_process").spawn(
        process.execPath,
        args,
        {
          cwd: workspaceCwd || process.cwd(),
          detached: true,
          stdio: "ignore",
          windowsHide: false,
          env: {
            ...process.env,
            TEST_PARALLEL: "1",
            TEST_DATA_DIR: paths.dataDir(),
          },
        },
      );
      child.unref();
      return { ok: true, pid: child.pid || null };
    } catch (error) {
      return { error: String(error?.message || error) };
    }
  });

  ipcMain.handle("tesT:permission-rules", () => ({
    rules: permissionRules.list(),
    path: permissionRules.file(),
  }));

  ipcMain.handle("tesT:permission-rules-clear", () =>
    permissionRules.clear(),
  );

  ipcMain.handle("tesT:data-location", () => ({
    dataDir: paths.dataDir(),
    packaged: app.isPackaged,
    pointerFile: dataLocation.pointerFile(),
  }));

  ipcMain.handle("tesT:data-location-migrate", async () => {
    const source = paths.dataDir();
    const result = await dialog.showOpenDialog(window, {
      title: "选择新的 TesT 数据目录",
      defaultPath: source,
      properties: ["openDirectory", "createDirectory"],
    });
    if (result.canceled || !result.filePaths[0]) {
      return { canceled: true };
    }
    const target = path.resolve(result.filePaths[0]);
    if (target.toLowerCase() === source.toLowerCase()) {
      return { error: "新目录与当前数据目录相同" };
    }
    if (target.toLowerCase().startsWith(`${source.toLowerCase()}${path.sep}`)) {
      return { error: "新目录不能位于当前数据目录内部" };
    }
    try {
      remoteServer?.stop();
      terminalManager?.dispose();
      feishuAgent?.stop?.();
      bridge?.stop();
      fs.cpSync(source, target, { recursive: true, force: true });
      const saved = dataLocation.saveDir(target);
      // The current process already exported the old data directory at startup.
      // app.relaunch inherits this environment, so update it or the new process
      // will keep using the old directory even though the pointer file changed.
      process.env.TEST_DATA_DIR = saved;
      log(`data:migrate source=${source} target=${saved} relaunch=1`);
      setTimeout(() => {
        app.relaunch();
        app.exit(0);
      }, 350);
      return { ok: true, dataDir: saved };
    } catch (error) {
      return { error: String(error?.message || error) };
    }
  });

  ipcMain.handle("tesT:remote-channels", () => {
    return feishuAgent ? [feishuAgent.status()] : [];
  });

  ipcMain.handle("tesT:feishu-config", () => feishuConfig.readForRenderer());

  ipcMain.handle("tesT:feishu-verify", (_event, payload) =>
    feishuConfig.verifyCredentials(payload),
  );

  ipcMain.handle("tesT:feishu-config-save", (_event, payload) => {
    if (isAgentWindow) {
      return { error: "并行窗口不管理飞书长连接，请在主窗口配置" };
    }
    try {
      const result = feishuConfig.saveConfig(payload);
      startFeishuFromConfig();
      return result;
    } catch (error) {
      return { error: String(error?.message || error) };
    }
  });

  ipcMain.handle("tesT:remote-start", async () => {
    if (isAgentWindow) {
      return { error: "并行窗口不运行全局远程服务，请在主窗口启动" };
    }
    if (!remoteServer) {
      return { error: "远程服务未初始化" };
    }
    try {
      const status = await remoteServer.start();
      return { ...status, ok: true };
    } catch (error) {
      return { error: String(error?.message || error) };
    }
  });

  ipcMain.handle("tesT:remote-stop", () => {
    if (!remoteServer) {
      return { error: "远程服务未初始化" };
    }
    return remoteServer.stop();
  });

  ipcMain.handle("tesT:remote-refresh-token", () => {
    if (!remoteServer) {
      return { error: "远程服务未初始化" };
    }
    return remoteServer.refreshToken();
  });

  ipcMain.handle("tesT:remote-start-tunnel", async () => {
    if (isAgentWindow) {
      return { error: "并行窗口不运行全局公网隧道，请在主窗口启动" };
    }
    if (!remoteServer) {
      return { error: "远程服务未初始化" };
    }
    try {
      const status = await remoteServer.startTunnel();
      return { ...status, ok: true };
    } catch (error) {
      return { error: String(error?.message || error) };
    }
  });

  ipcMain.handle("tesT:remote-stop-tunnel", () => {
    if (!remoteServer) {
      return { error: "远程服务未初始化" };
    }
    return remoteServer.stopTunnel();
  });

  ipcMain.handle("tesT:terminal-start", (_event, payload) => {
    try {
      if (!terminalManager) {
        terminalManager = new PtyTerminalManager((data) => {
          if (window && !window.isDestroyed()) {
            window.webContents.send("tesT:terminal-data", data);
          }
        });
      }
      return terminalManager.start({
        ...payload,
        cwd: payload?.cwd || workspaceCwd || process.cwd(),
      });
    } catch (error) {
      return { error: String(error?.message || error) };
    }
  });

  ipcMain.handle("tesT:terminal-input", (_event, payload) => {
    try {
      if (!terminalManager) {
        return { error: "终端尚未启动" };
      }
      return terminalManager.write(payload);
    } catch (error) {
      return { error: String(error?.message || error) };
    }
  });

  ipcMain.handle("tesT:terminal-resize", (_event, payload) => {
    try {
      if (!terminalManager) {
        return { error: "终端尚未启动" };
      }
      return terminalManager.resize(payload);
    } catch (error) {
      return { error: String(error?.message || error) };
    }
  });

  ipcMain.handle("tesT:terminal-stop", (_event, payload) => {
    try {
      terminalManager?.stop(payload?.id);
      return { ok: true };
    } catch (error) {
      return { error: String(error?.message || error) };
    }
  });

  ipcMain.handle("tesT:set-plan-mode", (_event, payload) => {
    return setPlanModeFlag(Boolean(payload?.enabled));
  });

  ipcMain.handle("tesT:behavior-get", () => behavior.read());

  ipcMain.handle("tesT:behavior-set", (_event, payload) => {
    try {
      return { ok: true, behavior: behavior.write(payload || {}) };
    } catch (error) {
      return { error: String(error?.message || error) };
    }
  });

  ipcMain.handle("tesT:read-log", () => {
    try {
      const file = path.join(paths.dataDir(), "electron.log");
      if (!fs.existsSync(file)) {
        return { text: "", path: file };
      }
      const stat = fs.statSync(file);
      const start = Math.max(0, stat.size - 240 * 1024);
      const length = stat.size - start;
      const buffer = Buffer.alloc(length);
      const fd = fs.openSync(file, "r");
      try {
        fs.readSync(fd, buffer, 0, length, start);
      } finally {
        fs.closeSync(fd);
      }
      return { text: buffer.toString("utf8"), path: file };
    } catch (error) {
      return { text: "", error: String(error?.message || error) };
    }
  });

  ipcMain.handle("tesT:open-data-dir", async () => {
    try {
      const error = await shell.openPath(paths.dataDir());
      return error ? { error } : { ok: true, path: paths.dataDir() };
    } catch (error) {
      return { error: String(error?.message || error) };
    }
  });

  ipcMain.on("tesT:window", (_event, action) => {
    if (!window) {
      return;
    }

    if (action === "minimize") {
      window.minimize();
    } else if (action === "maximize") {
      if (window.isMaximized()) {
        window.unmaximize();
      } else {
        window.maximize();
      }
    } else if (action === "close") {
      window.close();
    }
  });

  ipcMain.on("tesT:drag", (_event, payload) => {
    if (!window) {
      return;
    }

    if (payload.action === "begin") {
      const bounds = window.getBounds();
      drag = {
        x: payload.x,
        y: payload.y,
        windowX: bounds.x,
        windowY: bounds.y,
      };
      return;
    }

    if (payload.action === "end") {
      drag = null;
      return;
    }

    if (payload.action === "move" && drag) {
      window.setPosition(
        Math.round(drag.windowX + (payload.x - drag.x)),
        Math.round(drag.windowY + (payload.y - drag.y)),
      );
    }
  });

  ipcMain.handle("tesT:save-provider", (_event, provider) => {
    const result = piConfig.saveProvider(provider);
    if (!result.error) {
      nativeLogin?.invalidateCatalog();
      bridge?.restart();
    }
    push({
      type: "provider_saved",
      key: result.key,
      name: provider?.name,
      error: result.error,
    });
    return result;
  });

  ipcMain.handle("tesT:import-pi", () => {
    const result = piConfig.importPi();
    if (!result.error) {
      nativeLogin?.invalidateCatalog();
      bridge?.restart();
    }
    push({
      type: "pi_import",
      providers: result.providers,
      auth: result.auth,
      settings: result.settings,
      source: result.source,
      error: result.error,
    });
    return result;
  });

  ipcMain.handle("tesT:clear-providers", () => {
    const result = piConfig.clearProviders();
    if (!result.error) {
      nativeLogin?.invalidateCatalog();
      bridge?.restart();
    }
    push({
      type: "providers_cleared",
      error: result.error,
    });
    return result;
  });

  ipcMain.handle("tesT:fetch-models", async (_event, payload) => {
    const startedAt = Date.now();
    const result = await discovery.fetchModels(payload);
    const ms = Date.now() - startedAt;
    push({
      type: "models_fetched",
      requestId: payload?.requestId,
      count: result.models.length,
      models: result.models,
      endpoint: result.endpoint,
      ms,
      error: result.error,
    });
    return { ...result, ms };
  });

  ipcMain.handle("tesT:pi-auth-status", () => {
    const status = piConfig.authStatus();
    push({
      type: "pi_auth_status",
      providers: status.providers,
      oauthProviders: status.oauthProviders,
    });
    return status;
  });

  ipcMain.handle("tesT:open-pi-login", () => {
    return openPiLogin();
  });

  ipcMain.handle("tesT:open-models", async () => {
    const file = paths.modelsPath();
    if (!fs.existsSync(file)) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(
        file,
        JSON.stringify(
          {
            $schema: "https://pi.dev/schemas/models.schema.json",
            providers: {},
          },
          null,
          2,
        ),
      );
    }
    const error = await shell.openPath(file);
    return { error: error || null, path: file };
  });

  ipcMain.handle("tesT:pick-context", async () => {
    const result = await dialog.showOpenDialog({
      title: "添加上下文",
      properties: ["openFile", "multiSelections"],
      filters: [
        {
          name: "文本与图片",
          extensions: [
            "txt",
            "md",
            "json",
            "jsonl",
            "toml",
            "yaml",
            "yml",
            "js",
            "jsx",
            "ts",
            "tsx",
            "css",
            "html",
            "py",
            "rs",
            "go",
            "java",
            "c",
            "cpp",
            "h",
            "sh",
            "ps1",
            "png",
            "jpg",
            "jpeg",
            "webp",
            "gif",
          ],
        },
        { name: "所有文件", extensions: ["*"] },
      ],
    });
    return {
      canceled: result.canceled,
      files: result.canceled ? [] : result.filePaths,
    };
  });

  ipcMain.handle("tesT:pick-context-folder", async () => {
    const result = await dialog.showOpenDialog({
      title: "添加文件夹到上下文",
      properties: ["openDirectory", "multiSelections"],
    });
    return {
      canceled: result.canceled,
      files: result.canceled ? [] : result.filePaths,
    };
  });

  ipcMain.handle("tesT:read-context", async (_event, filePaths) => {
    const requested = Array.isArray(filePaths)
      ? filePaths.slice(0, 12)
      : [];
    const list = expandContextPaths(requested, 40);
    const files = [];
    let total = 0;
    for (const filePath of list) {
      try {
        const stat = fs.statSync(filePath);
        if (!stat.isFile() || stat.size > 4 * 1024 * 1024) {
          continue;
        }
        const ext = path.extname(filePath).toLowerCase();
        const imageMime =
          {
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".webp": "image/webp",
            ".gif": "image/gif",
          }[ext] || null;
        if (imageMime) {
          if (total + stat.size > 8 * 1024 * 1024) {
            continue;
          }
          files.push({
            id: crypto.randomUUID(),
            path: filePath,
            name: path.basename(filePath),
            size: stat.size,
            kind: "image",
            mimeType: imageMime,
            data: fs.readFileSync(filePath).toString("base64"),
          });
          total += stat.size;
          continue;
        }
        if (stat.size > 512 * 1024) {
          continue;
        }
        const buffer = fs.readFileSync(filePath);
        if (buffer.includes(0)) {
          continue;
        }
        files.push({
          id: crypto.randomUUID(),
          path: filePath,
          name: path.basename(filePath),
          size: stat.size,
          kind: "text",
          mimeType: "text/plain",
          text: buffer.toString("utf8").slice(0, 200000),
        });
        total += stat.size;
      } catch {
        // Ignore unreadable files; the renderer shows what was read.
      }
    }
    return {
      files,
      error: files.length > 0 ? null : "没有可读取的文本或图片文件",
    };
  });

  ipcMain.handle("tesT:list-files", (_event, payload) => {
    try {
      return files.listFiles(payload?.cwd || workspaceCwd);
    } catch (error) {
      return { files: [], error: String(error?.message || error) };
    }
  });

  ipcMain.handle("tesT:read-file", (_event, payload) => {
    try {
      return files.readFile(
        payload?.cwd || workspaceCwd,
        payload?.path,
      );
    } catch (error) {
      return { error: String(error?.message || error) };
    }
  });

  ipcMain.handle("tesT:delete-path", (_event, payload) => {
    try {
      return files.removePath(
        payload?.cwd || workspaceCwd,
        payload?.path,
      );
    } catch (error) {
      return { error: String(error?.message || error) };
    }
  });

  ipcMain.handle("tesT:revert-tool-edits", (_event, payload) => {
    try {
      return files.revertEdits(
        payload?.cwd || workspaceCwd,
        payload?.operations,
      );
    } catch (error) {
      return { error: String(error?.message || error) };
    }
  });

  ipcMain.handle(
    "tesT:choose-delete-directory",
    async (_event, payload) => {
      try {
        const cwd = payload?.cwd || workspaceCwd;
        if (!cwd) {
          return { error: "缺少当前工作区路径" };
        }
        const root = path.resolve(cwd);
        const picked = await dialog.showOpenDialog(window, {
          title: "选择要删除的文件夹",
          defaultPath: root,
          properties: ["openDirectory"],
        });
        if (picked.canceled || !picked.filePaths[0]) {
          return { canceled: true };
        }

        const absolute = path.resolve(picked.filePaths[0]);
        const relative = path.relative(root, absolute);
        if (
          !relative ||
          relative.startsWith("..") ||
          path.isAbsolute(relative)
        ) {
          return {
            error: "只能删除当前工作区内的子文件夹，不能删除工作区根目录",
          };
        }

        const confirmation = await dialog.showMessageBox(window, {
          type: "warning",
          title: "删除文件夹",
          message: "永久删除这个文件夹？",
          detail: `${absolute}\n\n文件夹内的所有内容都会被删除，此操作不可撤销。`,
          buttons: ["取消", "删除"],
          defaultId: 0,
          cancelId: 0,
          noLink: true,
        });
        if (confirmation.response !== 1) {
          return { canceled: true };
        }
        return files.removePath(root, relative);
      } catch (error) {
        return { error: String(error?.message || error) };
      }
    },
  );

  ipcMain.handle("tesT:open-path", async (_event, payload) => {
    try {
      const root = path.resolve(payload?.cwd || workspaceCwd || "");
      const absolute = path.resolve(root, payload?.path || "");
      const relative = path.relative(root, absolute);
      if (!root || relative.startsWith("..") || path.isAbsolute(relative)) {
        return { error: "文件不在当前工作区内" };
      }
      const error = await shell.openPath(absolute);
      return error ? { error } : { ok: true };
    } catch (error) {
      return { error: String(error?.message || error) };
    }
  });

  ipcMain.handle("tesT:reveal-path", (_event, payload) => {
    try {
      const root = path.resolve(payload?.cwd || workspaceCwd || "");
      const absolute = path.resolve(root, payload?.path || "");
      const relative = path.relative(root, absolute);
      if (!root || relative.startsWith("..") || path.isAbsolute(relative)) {
        return { error: "文件不在当前工作区内" };
      }
      shell.showItemInFolder(absolute);
      return { ok: true };
    } catch (error) {
      return { error: String(error?.message || error) };
    }
  });

  ipcMain.handle("tesT:login-providers", async () => {
    if (!nativeLogin) {
      return { providers: [] };
    }

    try {
      const providers = await nativeLogin.ensureStarted();
      return { providers: providers || [] };
    } catch (error) {
      return { providers: [], error: String(error) };
    }
  });

  ipcMain.handle("tesT:list-model-catalog", async () => {
    if (!nativeLogin) {
      return { models: [], providers: [], error: "登录服务未启动" };
    }
    try {
      const startedAt = Date.now();
      log("catalog:request");
      const result = await nativeLogin.catalog();
      log(
        `catalog:done models=${result?.models?.length ?? 0} providers=${result?.providers?.length ?? 0} ms=${Date.now() - startedAt}`,
      );
      return result;
    } catch (error) {
      log(`catalog:error ${error}`);
      return { models: [], providers: [], error: String(error) };
    }
  });

  ipcMain.handle("tesT:list-sessions", async () => {
    try {
      return { sessions: await listSessions() };
    } catch (error) {
      return { sessions: [], error: String(error) };
    }
  });

  ipcMain.handle("tesT:read-session-messages", async (_event, payload) => {
    try {
      const requested = String(payload?.path || "");
      if (!requested) {
        return { messages: [], error: "missing path" };
      }
      const file = path.resolve(requested);
      const root = path.resolve(paths.sessionsDir());
      if (
        !file.startsWith(`${root}${path.sep}`) ||
        !file.toLowerCase().endsWith(".jsonl")
      ) {
        return { messages: [], error: "invalid session path" };
      }
      return { messages: await readSessionMessages(file) };
    } catch (error) {
      return { messages: [], error: String(error) };
    }
  });

  ipcMain.handle("tesT:search-sessions", async (_event, payload) => {
    try {
      return {
        results: await searchSessions(payload?.query, payload?.limit),
      };
    } catch (error) {
      return { results: [], error: String(error) };
    }
  });

  ipcMain.handle("tesT:usage-stats", async () => {
    try {
      return await usageStats();
    } catch (error) {
      return {
        total: { cost: 0, tokens: 0, requests: 0 },
        days: [],
        models: [],
        error: String(error),
      };
    }
  });

  ipcMain.handle("tesT:git-info", async (_event, payload) => {
    try {
      return await git.info(payload?.cwd || workspaceCwd);
    } catch (error) {
      return { repo: false, branch: null, branches: [], error: String(error) };
    }
  });

  ipcMain.handle("tesT:git-checkout", async (_event, payload) => {
    try {
      return await git.checkout(
        payload?.cwd || workspaceCwd,
        payload?.branch,
      );
    } catch (error) {
      return { error: String(error?.message || error) };
    }
  });

  ipcMain.handle("tesT:git-status", async (_event, payload) => {
    try {
      return await git.status(payload?.cwd || workspaceCwd);
    } catch (error) {
      return { repo: false, files: [], error: String(error) };
    }
  });

  ipcMain.handle("tesT:git-worktree-list", (_event, payload) =>
    gitWorktree.list(payload?.cwd || workspaceCwd),
  );

  ipcMain.handle("tesT:git-worktree-create", (_event, payload) =>
    gitWorktree.create(
      payload?.cwd || workspaceCwd,
      payload?.name,
    ),
  );

  ipcMain.handle("tesT:git-worktree-remove", (_event, payload) =>
    gitWorktree.remove(
      payload?.cwd || workspaceCwd,
      payload?.path,
      { deleteBranch: payload?.deleteBranch !== false },
    ),
  );

  ipcMain.handle("tesT:git-worktree-merge", (_event, payload) =>
    gitWorktree.merge(
      payload?.cwd || workspaceCwd,
      payload?.branch,
    ),
  );

  ipcMain.handle("tesT:git-worktree-merge-abort", (_event, payload) =>
    gitWorktree.abortMerge(payload?.cwd || workspaceCwd),
  );

  ipcMain.handle("tesT:git-worktree-merge-continue", (_event, payload) =>
    gitWorktree.continueMerge(payload?.cwd || workspaceCwd),
  );

  ipcMain.handle("tesT:git-diff", async (_event, payload) => {
    try {
      return await git.diff(
        payload?.cwd || workspaceCwd,
        payload?.path,
      );
    } catch (error) {
      return { patch: "", error: String(error?.message || error) };
    }
  });

  ipcMain.handle("tesT:git-stage", async (_event, payload) => {
    try {
      return await git.stage(
        payload?.cwd || workspaceCwd,
        payload?.path,
      );
    } catch (error) {
      return { error: String(error?.message || error) };
    }
  });

  ipcMain.handle("tesT:git-stage-hunk", async (_event, payload) => {
    try {
      return await git.stageHunk(
        payload?.cwd || workspaceCwd,
        payload?.patch,
      );
    } catch (error) {
      return { error: String(error?.message || error) };
    }
  });

  ipcMain.handle("tesT:git-revert-hunk", async (_event, payload) => {
    try {
      return await git.revertHunk(
        payload?.cwd || workspaceCwd,
        payload?.patch,
      );
    } catch (error) {
      return { error: String(error?.message || error) };
    }
  });

  ipcMain.handle("tesT:git-revert-file", async (_event, payload) => {
    try {
      return await git.revertFile(
        payload?.cwd || workspaceCwd,
        payload?.path,
      );
    } catch (error) {
      return { error: String(error?.message || error) };
    }
  });

  ipcMain.handle("tesT:git-branch-create", async (_event, payload) => {
    try {
      return await git.createBranch(
        payload?.cwd || workspaceCwd,
        payload?.branch,
      );
    } catch (error) {
      return { error: String(error?.message || error) };
    }
  });

  ipcMain.handle("tesT:git-branch-delete", async (_event, payload) => {
    try {
      return await git.deleteBranch(
        payload?.cwd || workspaceCwd,
        payload?.branch,
      );
    } catch (error) {
      return { error: String(error?.message || error) };
    }
  });

  ipcMain.handle("tesT:git-unstage", async (_event, payload) => {
    try {
      return await git.unstage(
        payload?.cwd || workspaceCwd,
        payload?.path,
      );
    } catch (error) {
      return { error: String(error?.message || error) };
    }
  });

  ipcMain.handle("tesT:git-commit", async (_event, payload) => {
    try {
      return await git.commit(
        payload?.cwd || workspaceCwd,
        payload?.message,
      );
    } catch (error) {
      return { error: String(error?.message || error) };
    }
  });

  ipcMain.handle("tesT:export-session", async (_event, payload) => {
    const source = path.resolve(String(payload?.path || ""));
    const root = path.resolve(paths.sessionsDir());
    if (
      !source.startsWith(`${root}${path.sep}`) ||
      !source.endsWith(".jsonl")
    ) {
      return { error: "拒绝导出会话目录之外的文件" };
    }
    const rawTitle = String(payload?.title || path.basename(source, ".jsonl"));
    const safeTitle =
      rawTitle
        .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 80) || "session";
    const result = await dialog.showSaveDialog(window, {
      title: "导出会话",
      defaultPath: path.join(app.getPath("documents"), `${safeTitle}.md`),
      filters: [{ name: "Markdown", extensions: ["md"] }],
    });
    if (result.canceled || !result.filePath) {
      return { canceled: true };
    }
    return sessionActions.exportMarkdown({
      sessionPath: source,
      targetPath: result.filePath,
      title: rawTitle,
    });
  });

  ipcMain.handle("tesT:archive-session", (_event, payload) => {
    const source = path.resolve(String(payload?.path || ""));
    const root = path.resolve(paths.sessionsDir());
    if (
      !source.startsWith(`${root}${path.sep}`) ||
      !source.endsWith(".jsonl")
    ) {
      return { error: "拒绝归档会话目录之外的文件" };
    }
    return sessionActions.archive({
      sessionPath: source,
      sessionsDir: paths.sessionsDir(),
      archiveDir: paths.sessionsArchiveDir(),
    });
  });

  ipcMain.handle("tesT:list-archived", () => {
    return sessionActions.listArchived({
      archiveDir: paths.sessionsArchiveDir(),
    });
  });

  ipcMain.handle("tesT:restore-archived", (_event, payload) => {
    return sessionActions.restoreArchived({
      archivePath: payload?.path,
      archiveDir: paths.sessionsArchiveDir(),
      sessionsDir: paths.sessionsDir(),
    });
  });

  ipcMain.handle("tesT:delete-session", (_event, payload) => {
    try {
      const target = path.resolve(String(payload?.path || ""));
      const root = path.resolve(paths.sessionsDir());
      if (
        !target.startsWith(`${root}${path.sep}`) ||
        !target.endsWith(".jsonl")
      ) {
        return { error: "拒绝删除会话目录之外的文件" };
      }
      fs.rmSync(target, { force: true });
      return { ok: true };
    } catch (error) {
      return { error: String(error) };
    }
  });

  ipcMain.handle("tesT:rename-session", (_event, payload) => {
    try {
      const target = path.resolve(String(payload?.path || ""));
      const root = path.resolve(paths.sessionsDir());
      if (
        !target.startsWith(`${root}${path.sep}`) ||
        !target.endsWith(".jsonl")
      ) {
        return { error: "拒绝修改会话目录之外的文件" };
      }

      const name = String(payload?.name || "")
        .replace(/[\r\n]+/g, " ")
        .trim();
      if (!name) {
        return { error: "会话名称不能为空" };
      }

      const text = fs.readFileSync(target, "utf8");
      const lines = text.split(/\r?\n/).filter((line) => line.trim());
      let parentId = null;
      for (let index = lines.length - 1; index >= 0; index -= 1) {
        try {
          const entry = JSON.parse(lines[index]);
          if (typeof entry?.id === "string") {
            parentId = entry.id;
            break;
          }
        } catch {
          // Skip malformed tail lines.
        }
      }

      const entry = {
        type: "session_info",
        id: crypto.randomUUID(),
        parentId,
        timestamp: new Date().toISOString(),
        name,
      };
      const prefix = text.endsWith("\n") ? "" : "\n";
      fs.appendFileSync(
        target,
        `${prefix}${JSON.stringify(entry)}\n`,
        "utf8",
      );
      return { ok: true, name };
    } catch (error) {
      return { error: String(error) };
    }
  });

  ipcMain.handle("tesT:list-extensions", () => {
    try {
      return extensions.list(workspaceCwd);
    } catch (error) {
      return {
        skills: [],
        extensions: [],
        project: {
          cwd: workspaceCwd,
          trusted: false,
          hasResources: false,
        },
        error: String(error),
      };
    }
  });

  ipcMain.handle("tesT:trust-workspace", () => {
    try {
      const result = extensions.trust(workspaceCwd);
      if (!result.error) {
        bridge?.restart();
        push({
          type: "workspace_trusted",
          cwd: workspaceCwd,
        });
      }
      return result;
    } catch (error) {
      return { error: String(error) };
    }
  });

  ipcMain.handle("tesT:install-extension", (_event, payload) => {
    try {
      const result = extensions.install(payload?.kind, payload?.path);
      bridge?.restart();
      return { ...result, error: null };
    } catch (error) {
      return { error: String(error) };
    }
  });

  ipcMain.handle("tesT:install-package", async (_event, payload) => {
    try {
      let source = normalizePackageSource(payload?.source);
      if (
        !/^(npm:|git:|https?:\/\/|ssh:\/\/|git@)/i.test(source)
      ) {
        throw new Error(
          `无法识别安装源“${String(payload?.source || "").trim()}”。请直接输入包名（如 pi-hermes-memory）、npm:包名、npmjs 包链接，或 Git 地址。`,
        );
      }

      let note = "";
      if (sourceNeedsGit(source)) {
        const gitInstalled = await commandAvailable("git");
        if (!gitInstalled) {
          const npmSource = await npmSourceForGithub(source);
          if (npmSource) {
            source = npmSource;
            note = "未检测到 Git，已自动改用对应的 npm 包";
          } else {
            throw new Error(
              "这个链接需要 Git，但电脑上没有检测到 Git。普通用户请改用 npmjs 包链接，例如 https://www.npmjs.com/package/包名；开发者可安装 Git for Windows 后重试。",
            );
          }
        }
      }
      let result;
      try {
        result = await runPiPackageCommand(["install", source]);
      } catch (error) {
        throw new Error(formatPackageInstallError(error));
      }
      bridge?.restart();
      return { source, output: result.output, note, error: null };
    } catch (error) {
      return { error: String(error?.message || error) };
    }
  });

  ipcMain.handle("tesT:toggle-extension", (_event, payload) => {
    try {
      if (payload?.package) {
        const result = extensions.setPackageEnabled(
          workspaceCwd,
          payload?.scope === "project" ? "project" : "global",
          payload?.source,
          Boolean(payload?.enabled),
        );
        bridge?.restart();
        return { ...result, error: null };
      }
      const result = extensions.toggle(
        payload?.kind,
        payload?.name,
        Boolean(payload?.enabled),
      );
      bridge?.restart();
      return { ...result, error: null };
    } catch (error) {
      return { error: String(error) };
    }
  });

  ipcMain.handle("tesT:remove-extension", async (_event, payload) => {
    try {
      if (payload?.package) {
        const source = String(payload?.source || "").trim();
        if (!source) {
          throw new Error("缺少 package source");
        }
        await runPiPackageCommand(["remove", source]);
        bridge?.restart();
        return { removed: true, source, error: null };
      }
      const result = extensions.remove(payload?.kind, payload?.name);
      bridge?.restart();
      return { ...result, error: null };
    } catch (error) {
      return { error: String(error) };
    }
  });

  ipcMain.handle("tesT:open-extensions-folder", async (_event, payload) => {
    const projectDir =
      payload?.scope === "project" && workspaceCwd
        ? path.join(
            workspaceCwd,
            ".pi",
            payload?.kind === "skill" ? "skills" : "extensions",
          )
        : "";
    const dir = projectDir
      ? projectDir
      : payload?.kind === "skill"
        ? paths.skillsDir()
        : paths.extensionsDir();
    const error = await shell.openPath(dir);
    return { error: error || null, path: dir };
  });

  ipcMain.handle("tesT:update-status", () => updater.getStatus());

  ipcMain.handle("tesT:check-update", async () => updater.check());

  ipcMain.handle("tesT:download-update", async () => updater.download());

  ipcMain.handle("tesT:install-update", () => updater.install());

  ipcMain.handle("tesT:save-update-feed", (_event, payload) => {
    const result = updater.configureFeed(payload?.feedUrl);
    if (result?.status) {
      push({ type: "update_status", status: result.status });
    }
    return result;
  });

  ipcMain.handle("tesT:clear-update-feed", () => {
    const result = updater.clearFeed();
    if (result?.status) {
      push({ type: "update_status", status: result.status });
    }
    return result;
  });

  ipcMain.handle("tesT:pi-update-status", () => piUpdater.getStatus());

  ipcMain.handle("tesT:pi-check-update", () => piUpdater.check());

  ipcMain.handle("tesT:pi-install-update", async () => {
    const result = await piUpdater.install();
    if (result?.error) {
      return result;
    }
    const healthy = await restartBridgeWithCurrentKernel();
    if (healthy) {
      piUpdater.commit();
      return result;
    }
    const rolledBack = piUpdater.rollback();
    if (rolledBack?.error) {
      return {
        ...result,
        error: `Pi ${result.version || ""} 启动失败，自动回退也失败：${rolledBack.error}`,
      };
    }
    const restored = await restartBridgeWithCurrentKernel();
    return {
      ...result,
      rolledBack: true,
      currentVersion: rolledBack.currentVersion,
      error: restored
        ? `Pi ${result.version || ""} 启动失败，已自动回退到 ${rolledBack.currentVersion}`
        : `Pi ${result.version || ""} 启动失败；已回退到 ${rolledBack.currentVersion}，但内核未能重新启动`,
    };
  });

  ipcMain.handle("tesT:pi-restore-kernel", async () => {
    const result = piUpdater.restore();
    if (result?.error) {
      return result;
    }
    const healthy = await restartBridgeWithCurrentKernel();
    return healthy
      ? result
      : { ...result, error: "内置 Pi 内核未能正常启动" };
  });

  ipcMain.handle("tesT:login-start", async (_event, payload) => {
    if (!nativeLogin) {
      return { error: "登录服务未启动" };
    }

    try {
      await nativeLogin.ensureStarted();
      const ok = nativeLogin.start(
        payload?.provider,
        payload?.mode,
        payload?.apiKey,
      );
      return ok ? { ok: true } : { error: "登录进程未就绪" };
    } catch (error) {
      return { error: String(error) };
    }
  });

  ipcMain.handle("tesT:login-prompt-response", (_event, payload) => {
    return {
      ok: nativeLogin?.respondPrompt(
        payload?.id,
        payload?.value,
        Boolean(payload?.cancelled),
      ),
    };
  });

  ipcMain.handle("tesT:login-cancel", () => {
    return { ok: nativeLogin?.cancel() ?? false };
  });

  ipcMain.handle("tesT:login-close", () => {
    nativeLogin?.stop();
    return { ok: true };
  });

  ipcMain.handle("tesT:logout-provider", async (_event, payload) => {
    if (!nativeLogin) {
      return { error: "登录服务未启动" };
    }

    try {
      await nativeLogin.ensureStarted();
      const ok = nativeLogin.logout(payload?.provider);
      return ok ? { ok: true } : { error: "登录进程未就绪" };
    } catch (error) {
      return { error: String(error) };
    }
  });

  ipcMain.handle("tesT:open-external", async (_event, url) => {
    try {
      const target = new URL(String(url));
      if (target.protocol !== "https:" && target.protocol !== "http:") {
        return { error: "只允许打开 http/https 链接" };
      }
      await shell.openExternal(target.toString());
      return { ok: true };
    } catch (error) {
      return { error: String(error) };
    }
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    showWindow();
  });

  app.whenReady().then(async () => {
    log(`app:ready packaged=${app.isPackaged} dev=${isDev}`);
    if (app.isPackaged && !process.env.TEST_DATA_DIR) {
      const saved = dataLocation.savedDir();
      const selected = saved || (await showDataSetup());
      if (!selected) {
        app.quit();
        return;
      }
      process.env.TEST_DATA_DIR = selected;
    }
    initWorkspace();
    startSessionWatcher();
    if (!isAgentWindow) {
      updater.init({
        onStatus: (next) => {
          push({ type: "update_status", status: next });
          if (
            next?.state === "available" ||
            next?.state === "downloaded"
          ) {
            notifyTray("TesT 更新", next.message || "有可用更新");
          }
        },
        onLog: (text) => log(text),
      });
      piUpdater.init({
        onStatus: (status) => push({ type: "pi_update_status", status }),
      });
    }
    remoteServer = new RemoteServer({
      onCommand: (command) => {
        ensureBridge();
        bridge?.send(command);
      },
      onStatus: (status) => push({ type: "remote_status", status }),
      onLog: (text) => log(text),
      onClientConnect: () => {
        ensureBridge();
        const stamp = Date.now();
        bridge?.send({
          id: `remote-state-${stamp}`,
          type: "get_state",
        });
        bridge?.send({
          id: `remote-messages-${stamp}`,
          type: "get_messages",
        });
        bridge?.send({
          id: `remote-models-${stamp}`,
          type: "get_available_models",
        });
      },
      onClientChange: (count) => {
        log(`remote:clients ${count}`);
        push({ type: "remote_status", status: remoteServer?.status() });
      },
      getWorkspace: () => workspaceCwd,
      getSessions: async () => {
        const sessions = await listSessions();
        return sessions.slice(0, 60).map((session) => ({
          id: session.id,
          path: session.path,
          cwd: session.cwd,
          name: session.name,
          firstMessage: session.firstMessage,
          messageCount: session.messageCount,
          created: session.created,
          modified: session.modified,
        }));
      },
    });
    if (shouldAutoRemote) {
      void remoteServer
        .start()
        .then((status) => {
          log(`remote:auto-url ${status.url || ""}`);
        })
        .catch((error) => log(`remote:auto-error ${error}`));
    }
    if (shouldAutoTunnel) {
      void remoteServer
        .startTunnel()
        .then((status) => {
          log(`remote:tunnel-auto ${status.publicUrl || ""}`);
        })
        .catch((error) => log(`remote:tunnel-auto-error ${error}`));
    }
    if (shouldCaptureMobile) {
      void remoteServer
        .start()
        .then((remote) => {
          const mobileWindow = new BrowserWindow({
            width: 390,
            height: 844,
            show: false,
            frame: false,
            webPreferences: {
              sandbox: true,
              paintWhenInitiallyHidden: true,
              backgroundThrottling: false,
            },
          });
          mobileWindow.webContents.on("console-message", (_event, ...args) => {
            const text = args.map((item) => String(item)).join(" ");
            log(`mobile-console:${text.slice(0, 500)}`);
          });
          mobileWindow.webContents.on("did-finish-load", () => {
            log("mobile-capture:loaded");
            mobileWindow.showInactive();
            setTimeout(async () => {
              try {
                const image = await mobileWindow.webContents.capturePage();
                const target = path.join(
                  paths.dataDir(),
                  "electron-capture-mobile.png",
                );
                fs.writeFileSync(target, image.toPNG());
                log(`capture:${target}`);
              } catch (error) {
                log(`mobile-capture:error ${error}`);
              }
              mobileWindow.destroy();
              remoteServer?.stop();
              app.quit();
            }, 4200);
          });
          mobileWindow.webContents.on(
            "did-fail-load",
            (_event, code, description, url) => {
              log(`mobile-capture:fail ${code} ${description} ${url}`);
            },
          );
          mobileWindow
            .loadURL(
              `http://127.0.0.1:${remote.port}/?token=${remote.token}`,
            )
            .catch((error) => log(`mobile-capture:load-error ${error}`));
        })
        .catch((error) => {
          log(`mobile-capture:start-error ${error}`);
          app.quit();
        });
    }
    nativeLogin = new NativeLogin({
      onMessage: (message) => {
        push(message);
        if (message.type === "login_success") {
          bridge?.restart();
          const status = piConfig.authStatus();
          push({
            type: "pi_auth_status",
            providers: status.providers,
            oauthProviders: status.oauthProviders,
          });
          notifyTray("Pi 登录成功", message.provider || "登录已完成");
        }
        if (message.type === "login_logout_success") {
          bridge?.restart();
          const status = piConfig.authStatus();
          push({
            type: "pi_auth_status",
            providers: status.providers,
            oauthProviders: status.oauthProviders,
          });
          notifyTray("Pi 已退出登录", message.provider || "");
        }
      },
      onLog: (text) => log(`login-helper: ${text}`),
    });
    feishuAgent = new FeishuAgent({
      sendCommand: (command) => {
        ensureBridge();
        bridge?.send(command);
        if (
          command?.type === "extension_ui_response" &&
          command.id
        ) {
          push({
            type: "extension_ui_resolved",
            id: command.id,
          });
        }
      },
      log,
      onPair: (patch) => {
        feishuConfig.saveConfig(patch);
        push({
          type: "channel_status",
          status: feishuAgent?.status(),
        });
      },
    });
    if (!isAgentWindow) {
      startFeishuFromConfig();
    }
    registerIpc();
    createWindow();
    if (!isAgentWindow) {
      try {
        createTray();
      } catch (error) {
        log(`tray:error ${error}`);
      }
    }
    if (installTestIndex >= 0) {
      const source = process.argv[installTestIndex + 1];
      try {
        const result = extensions.install("skill", source);
        log(`install-test:${JSON.stringify(result)}`);
      } catch (error) {
        log(`install-test:error ${error}`);
      }
      setTimeout(() => app.quit(), 1000);
    }
    if (shouldOpenLogin) {
      setTimeout(() => openPiLogin(), 2500);
    }
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("activate", () => {
    showWindow();
  });

  app.on("render-process-gone", (_event, contents, details) => {
    log(
      `render-process-gone reason=${details?.reason} exitCode=${details?.exitCode}`,
    );
    if (isQuitting || !contents || contents.isDestroyed()) {
      return;
    }
    const now = Date.now();
    rendererCrashTimes = rendererCrashTimes.filter(
      (timestamp) => now - timestamp < 60_000,
    );
    rendererCrashTimes.push(now);
    if (rendererCrashTimes.length > 3) {
      log("render-process-gone crash-loop; automatic reload paused");
      return;
    }
    setTimeout(() => {
      if (!isQuitting && !contents.isDestroyed()) {
        contents.reload();
      }
    }, 900);
  });

  app.on("child-process-gone", (_event, details) => {
    log(
      `child-process-gone type=${details?.type} reason=${details?.reason} exitCode=${details?.exitCode}`,
    );
  });

  app.on("before-quit", () => {
    isQuitting = true;
    if (recordTimer !== null) {
      clearTimeout(recordTimer);
      recordTimer = null;
    }
    if (sessionWatchTimer !== null) {
      clearTimeout(sessionWatchTimer);
      sessionWatchTimer = null;
    }
    sessionWatcher?.close();
    sessionWatcher = null;
    recordQueue = [];
    remoteServer?.stop();
    remoteServer = null;
    terminalManager?.dispose();
    terminalManager = null;
    bridge?.stop();
    login.stop();
    nativeLogin?.stop();
    tray?.destroy();
  });
}
