const { contextBridge, ipcRenderer, webUtils } = require("electron");

const listeners = new Set();
const terminalListeners = new Set();

ipcRenderer.on("tesT:record", (_event, record) => {
  for (const listener of listeners) {
    try {
      listener(record);
    } catch (error) {
      console.error(error);
    }
  }
});

ipcRenderer.on("tesT:records", (_event, records) => {
  if (!Array.isArray(records)) {
    return;
  }
  for (const record of records) {
    for (const listener of listeners) {
      try {
        listener(record);
      } catch (error) {
        console.error(error);
      }
    }
  }
});

ipcRenderer.on("tesT:terminal-data", (_event, data) => {
  for (const listener of terminalListeners) {
    try {
      listener(data);
    } catch (error) {
      console.error(error);
    }
  }
});

contextBridge.exposeInMainWorld("tesT", {
  isShell: true,
  nativeLogin: true,

  onRecord(listener) {
    if (typeof listener === "function") {
      listeners.add(listener);
    }
  },

  offRecord(listener) {
    listeners.delete(listener);
  },

  onTerminalData(listener) {
    if (typeof listener === "function") {
      terminalListeners.add(listener);
    }
    return () => terminalListeners.delete(listener);
  },

  offTerminalData(listener) {
    terminalListeners.delete(listener);
  },

  terminalStart(payload) {
    return ipcRenderer.invoke("tesT:terminal-start", payload);
  },

  terminalInput(payload) {
    return ipcRenderer.invoke("tesT:terminal-input", payload);
  },

  terminalResize(payload) {
    return ipcRenderer.invoke("tesT:terminal-resize", payload);
  },

  terminalStop(payload) {
    return ipcRenderer.invoke("tesT:terminal-stop", payload);
  },

  setPlanMode(enabled) {
    return ipcRenderer.invoke("tesT:set-plan-mode", { enabled });
  },

  readLog() {
    return ipcRenderer.invoke("tesT:read-log");
  },

  openDataDir() {
    return ipcRenderer.invoke("tesT:open-data-dir");
  },

  behaviorGet() {
    return ipcRenderer.invoke("tesT:behavior-get");
  },

  behaviorSet(payload) {
    return ipcRenderer.invoke("tesT:behavior-set", payload);
  },

  send(command) {
    ipcRenderer.send("tesT:pi-command", command);
  },

  ready() {
    ipcRenderer.send("tesT:ready");
  },

  windowAction(action) {
    ipcRenderer.send("tesT:window", action);
  },

  beginDrag(x, y) {
    ipcRenderer.send("tesT:drag", { action: "begin", x, y });
  },

  dragTo(x, y) {
    ipcRenderer.send("tesT:drag", { action: "move", x, y });
  },

  endDrag() {
    ipcRenderer.send("tesT:drag", { action: "end" });
  },

  openModelsConfig() {
    return ipcRenderer.invoke("tesT:open-models");
  },

  pickContext() {
    return ipcRenderer.invoke("tesT:pick-context");
  },

  pickContextFolder() {
    return ipcRenderer.invoke("tesT:pick-context-folder");
  },

  readContext(paths) {
    return ipcRenderer.invoke("tesT:read-context", paths);
  },

  listFiles(payload) {
    return ipcRenderer.invoke("tesT:list-files", payload);
  },

  readFile(payload) {
    return ipcRenderer.invoke("tesT:read-file", payload);
  },

  openPath(payload) {
    return ipcRenderer.invoke("tesT:open-path", payload);
  },

  revealPath(payload) {
    return ipcRenderer.invoke("tesT:reveal-path", payload);
  },

  saveProvider(provider) {
    return ipcRenderer.invoke("tesT:save-provider", provider);
  },

  fetchModels(payload) {
    return ipcRenderer.invoke("tesT:fetch-models", payload);
  },

  clearProviders() {
    return ipcRenderer.invoke("tesT:clear-providers");
  },

  importPi() {
    return ipcRenderer.invoke("tesT:import-pi");
  },

  openPiLogin() {
    return ipcRenderer.invoke("tesT:open-pi-login");
  },

  piAuthStatus() {
    return ipcRenderer.invoke("tesT:pi-auth-status");
  },

  loginProviders() {
    return ipcRenderer.invoke("tesT:login-providers");
  },

  listModelCatalog() {
    return ipcRenderer.invoke("tesT:list-model-catalog");
  },

  loginStart(payload) {
    return ipcRenderer.invoke("tesT:login-start", payload);
  },

  loginPromptResponse(payload) {
    return ipcRenderer.invoke("tesT:login-prompt-response", payload);
  },

  loginCancel() {
    return ipcRenderer.invoke("tesT:login-cancel");
  },

  loginClose() {
    return ipcRenderer.invoke("tesT:login-close");
  },

  logoutProvider(payload) {
    return ipcRenderer.invoke("tesT:logout-provider", payload);
  },

  openExternal(url) {
    return ipcRenderer.invoke("tesT:open-external", url);
  },

  listSessions() {
    return ipcRenderer.invoke("tesT:list-sessions");
  },

  readSessionMessages(path) {
    return ipcRenderer.invoke("tesT:read-session-messages", { path });
  },

  searchSessions(payload) {
    return ipcRenderer.invoke("tesT:search-sessions", payload);
  },

  usageStats() {
    return ipcRenderer.invoke("tesT:usage-stats");
  },

  gitInfo(payload) {
    return ipcRenderer.invoke("tesT:git-info", payload);
  },

  gitCheckout(payload) {
    return ipcRenderer.invoke("tesT:git-checkout", payload);
  },

  gitStatus(payload) {
    return ipcRenderer.invoke("tesT:git-status", payload);
  },

  gitWorktreeList(payload) {
    return ipcRenderer.invoke("tesT:git-worktree-list", payload);
  },

  gitWorktreeCreate(payload) {
    return ipcRenderer.invoke("tesT:git-worktree-create", payload);
  },

  gitWorktreeRemove(payload) {
    return ipcRenderer.invoke("tesT:git-worktree-remove", payload);
  },

  gitWorktreeMerge(payload) {
    return ipcRenderer.invoke("tesT:git-worktree-merge", payload);
  },

  gitWorktreeMergeAbort(payload) {
    return ipcRenderer.invoke("tesT:git-worktree-merge-abort", payload);
  },

  gitWorktreeMergeContinue(payload) {
    return ipcRenderer.invoke("tesT:git-worktree-merge-continue", payload);
  },

  gitDiff(payload) {
    return ipcRenderer.invoke("tesT:git-diff", payload);
  },

  gitStage(payload) {
    return ipcRenderer.invoke("tesT:git-stage", payload);
  },

  gitStageHunk(payload) {
    return ipcRenderer.invoke("tesT:git-stage-hunk", payload);
  },

  gitRevertHunk(payload) {
    return ipcRenderer.invoke("tesT:git-revert-hunk", payload);
  },

  gitRevertFile(payload) {
    return ipcRenderer.invoke("tesT:git-revert-file", payload);
  },

  gitBranchCreate(payload) {
    return ipcRenderer.invoke("tesT:git-branch-create", payload);
  },

  gitBranchDelete(payload) {
    return ipcRenderer.invoke("tesT:git-branch-delete", payload);
  },

  gitUnstage(payload) {
    return ipcRenderer.invoke("tesT:git-unstage", payload);
  },

  gitCommit(payload) {
    return ipcRenderer.invoke("tesT:git-commit", payload);
  },

  exportSession(payload) {
    return ipcRenderer.invoke("tesT:export-session", payload);
  },

  archiveSession(payload) {
    return ipcRenderer.invoke("tesT:archive-session", payload);
  },

  listArchivedSessions() {
    return ipcRenderer.invoke("tesT:list-archived");
  },

  restoreArchivedSession(payload) {
    return ipcRenderer.invoke("tesT:restore-archived", payload);
  },

  getWorkspace() {
    return ipcRenderer.invoke("tesT:get-workspace");
  },

  chooseWorkspace() {
    return ipcRenderer.invoke("tesT:choose-workspace");
  },

  setWorkspace(payload) {
    return ipcRenderer.invoke("tesT:set-workspace", payload);
  },

  remoteStatus() {
    return ipcRenderer.invoke("tesT:remote-status");
  },

  newAgentWindow() {
    return ipcRenderer.invoke("tesT:new-agent-window");
  },

  permissionRules() {
    return ipcRenderer.invoke("tesT:permission-rules");
  },

  clearPermissionRules() {
    return ipcRenderer.invoke("tesT:permission-rules-clear");
  },

  dataLocation() {
    return ipcRenderer.invoke("tesT:data-location");
  },

  migrateDataLocation() {
    return ipcRenderer.invoke("tesT:data-location-migrate");
  },

  remoteChannels() {
    return ipcRenderer.invoke("tesT:remote-channels");
  },

  feishuConfig() {
    return ipcRenderer.invoke("tesT:feishu-config");
  },

  verifyFeishuConfig(payload) {
    return ipcRenderer.invoke("tesT:feishu-verify", payload);
  },

  saveFeishuConfig(payload) {
    return ipcRenderer.invoke("tesT:feishu-config-save", payload);
  },

  startRemote() {
    return ipcRenderer.invoke("tesT:remote-start");
  },

  stopRemote() {
    return ipcRenderer.invoke("tesT:remote-stop");
  },

  refreshRemoteToken() {
    return ipcRenderer.invoke("tesT:remote-refresh-token");
  },

  startRemoteTunnel() {
    return ipcRenderer.invoke("tesT:remote-start-tunnel");
  },

  stopRemoteTunnel() {
    return ipcRenderer.invoke("tesT:remote-stop-tunnel");
  },

  deleteSession(payload) {
    return ipcRenderer.invoke("tesT:delete-session", payload);
  },

  renameSession(payload) {
    return ipcRenderer.invoke("tesT:rename-session", payload);
  },

  getPathForFile(file) {
    try {
      return webUtils.getPathForFile(file);
    } catch {
      return "";
    }
  },

  listExtensions() {
    return ipcRenderer.invoke("tesT:list-extensions");
  },

  trustWorkspace() {
    return ipcRenderer.invoke("tesT:trust-workspace");
  },

  installExtension(payload) {
    return ipcRenderer.invoke("tesT:install-extension", payload);
  },

  toggleExtension(payload) {
    return ipcRenderer.invoke("tesT:toggle-extension", payload);
  },

  removeExtension(payload) {
    return ipcRenderer.invoke("tesT:remove-extension", payload);
  },

  openExtensionsFolder(payload) {
    return ipcRenderer.invoke("tesT:open-extensions-folder", payload);
  },

  updateStatus() {
    return ipcRenderer.invoke("tesT:update-status");
  },

  checkUpdate() {
    return ipcRenderer.invoke("tesT:check-update");
  },

  downloadUpdate() {
    return ipcRenderer.invoke("tesT:download-update");
  },

  installUpdate() {
    return ipcRenderer.invoke("tesT:install-update");
  },

  saveUpdateFeed(payload) {
    return ipcRenderer.invoke("tesT:save-update-feed", payload);
  },

  clearUpdateFeed() {
    return ipcRenderer.invoke("tesT:clear-update-feed");
  },

  piUpdateStatus() {
    return ipcRenderer.invoke("tesT:pi-update-status");
  },

  checkPiUpdate() {
    return ipcRenderer.invoke("tesT:pi-check-update");
  },

  installPiUpdate() {
    return ipcRenderer.invoke("tesT:pi-install-update");
  },

  restorePiKernel() {
    return ipcRenderer.invoke("tesT:pi-restore-kernel");
  },
});
