/// <reference types="vite/client" />

interface TesTRemoteStatus {
  running: boolean;
  port: number;
  token: string;
  url: string;
  urls: Array<{
    name: string;
    address: string;
    url: string;
    kind?: "lan" | "tailscale";
  }>;
  qrSvg: string;
  publicUrl?: string;
  publicBaseUrl?: string;
  tailscaleUrl?: string;
  tunnelState?: string;
  tunnelError?: string;
  tunnelMessage?: string;
  tunnelPercent?: number;
  clients: number;
  startedAt?: string | null;
  workspace?: string;
  localOnly?: boolean;
  error?: string;
  ok?: boolean;
}

interface TesTChannelStatus {
  id: string;
  label: string;
  state:
    | "not_configured"
    | "stopped"
    | "starting"
    | "online"
    | "reconnecting"
    | "error"
    | "not_implemented";
  configured: boolean;
  message?: string;
  lastError?: string;
  since?: number | null;
  capabilities: Record<string, boolean>;
}

interface TesTFeishuConfig {
  appId: string;
  appSecret: string;
  enabled: boolean;
  longConnection: boolean;
  autoPair: boolean;
  receiveIdType: "chat_id" | "open_id" | "user_id" | "email";
  receiveId: string;
  allowedOpenIds: string[];
  allowAll: boolean;
}

interface TesTFeishuConfigResult {
  config?: TesTFeishuConfig;
  hasSecret?: boolean;
  validation?: { ok: boolean; errors: string[] };
  path?: string;
  enabled?: boolean;
  error?: string;
}

interface TesTContextFile {
  id: string;
  path: string;
  name: string;
  size: number;
  kind: "text" | "image";
  mimeType?: string;
  text?: string;
  data?: string;
}

interface TesTSessionSearchResult {
  path: string;
  id: string;
  cwd: string;
  parentSessionPath: string | null;
  name: string | null;
  firstMessage: string | null;
  messageCount: number;
  created: string | null;
  modified: string;
  snippet: string;
  role: string;
}

interface TesTUsageBucket {
  date?: string;
  provider?: string;
  model?: string;
  cost: number;
  tokens: number;
  requests: number;
}

interface TesTUsageStats {
  total: {
    cost: number;
    tokens: number;
    requests: number;
  };
  days: TesTUsageBucket[];
  models: TesTUsageBucket[];
  error?: string;
}

interface TesTBridge {
  isShell: true;
  nativeLogin?: boolean;
  send: (command: unknown) => void;
  onRecord: (listener: (record: any) => void) => void;
  offRecord: (listener: (record: any) => void) => void;
  onTerminalData?: (
    listener: (data: {
      id?: string;
      type: "data" | "command" | "done" | "exit" | "error";
      text?: string;
      data?: string;
      code?: number;
    }) => void,
  ) => (() => void) | void;
  offTerminalData?: (listener: (data: any) => void) => void;
  terminalStart?: (payload: {
    id?: string;
    cwd?: string;
    cols?: number;
    rows?: number;
  }) => Promise<{
    ok?: boolean;
    id?: string;
    pid?: number;
    shell?: string;
    cwd?: string;
    running?: boolean;
    error?: string;
  }>;
  terminalInput?: (payload: {
    id?: string;
    data?: string;
    command?: string;
  }) => Promise<{
    ok?: boolean;
    queued?: number;
    error?: string;
  }>;
  terminalResize?: (payload: {
    id?: string;
    cols: number;
    rows: number;
  }) => Promise<{ ok?: boolean; error?: string }>;
  terminalStop?: (payload?: {
    id?: string;
  }) => Promise<{ ok?: boolean; error?: string }>;
  setPlanMode?: (enabled: boolean) => Promise<{
    ok?: boolean;
    enabled?: boolean;
    error?: string;
  }>;
  readLog?: () => Promise<{
    text: string;
    path?: string;
    error?: string;
  }>;
  openDataDir?: () => Promise<{
    ok?: boolean;
    path?: string;
    error?: string;
  }>;
  behaviorGet?: () => Promise<{
    closeToTray: boolean;
    notifyOnComplete: boolean;
  }>;
  behaviorSet?: (payload: {
    closeToTray?: boolean;
    notifyOnComplete?: boolean;
  }) => Promise<{
    ok?: boolean;
    behavior?: { closeToTray: boolean; notifyOnComplete: boolean };
    error?: string;
  }>;
  ready: () => void;
  windowAction: (action: "minimize" | "maximize" | "close") => void;
  beginDrag: (x: number, y: number) => void;
  dragTo: (x: number, y: number) => void;
  endDrag: () => void;
  openModelsConfig: () => void;
  pickContext: () => Promise<{
    canceled: boolean;
    files: string[];
  }>;
  pickContextFolder?: () => Promise<{
    canceled: boolean;
    files: string[];
  }>;
  readContext: (paths: string[]) => Promise<{
    files: TesTContextFile[];
    error?: string | null;
  }>;
  listFiles?: (payload?: { cwd?: string }) => Promise<{
    files: Array<{ path: string; name: string; size: number }>;
    truncated?: boolean;
    root?: string;
    error?: string;
  }>;
  readFile?: (payload: { cwd?: string; path: string }) => Promise<{
    path?: string;
    size?: number;
    mtime?: number;
    binary?: boolean;
    text?: string;
    error?: string;
  }>;
  openPath?: (payload: { cwd?: string; path: string }) => Promise<{
    ok?: boolean;
    error?: string;
  }>;
  revealPath?: (payload: { cwd?: string; path: string }) => Promise<{
    ok?: boolean;
    error?: string;
  }>;
  saveProvider: (provider: unknown) => Promise<{
    key?: string;
    error?: string;
  }>;
  fetchModels: (payload: {
    requestId: string;
    baseUrl: string;
    api: string;
    apiKey: string;
    apiKeyField?: string;
    headers?: Record<string, string>;
  }) => void;
  clearProviders: () => void;
  openPiLogin: () => void;
  piAuthStatus: () => void;
  loginProviders: () => Promise<{
    providers: Array<{
      id: string;
      name: string;
      hasOAuth: boolean;
      oauthName?: string | null;
      hasApiKey: boolean;
      configured: boolean;
      source?: string | null;
      credentialType?: string | null;
      modelCount: number;
    }>;
    error?: string;
  }>;
  listModelCatalog?: () => Promise<{
    models: Array<{
      id: string;
      name: string;
      provider: string;
      providerName: string;
      contextWindow: number | null;
      reasoning: boolean;
      available: boolean;
    }>;
    providers: Array<{
      id: string;
      name: string;
      available: boolean;
      modelCount: number;
    }>;
    error?: string | null;
  }>;
  loginStart: (payload: {
    provider: string;
    mode: "oauth" | "api_key";
    apiKey?: string;
  }) => Promise<{ ok?: boolean; error?: string }>;
  loginPromptResponse: (payload: {
    id: string;
    value: string;
    cancelled?: boolean;
  }) => Promise<{ ok: boolean }>;
  loginCancel: () => Promise<{ ok: boolean }>;
  loginClose: () => Promise<{ ok: boolean }>;
  logoutProvider?: (payload: { provider: string }) => Promise<{
    ok?: boolean;
    error?: string;
  }>;
  openExternal: (url: string) => Promise<{ ok?: boolean; error?: string }>;
  listSessions: () => Promise<{
    sessions: Array<{
      path: string;
      id: string;
      cwd: string;
      parentSessionPath: string | null;
      name: string | null;
      firstMessage: string | null;
      messageCount: number;
      created: string | null;
      modified: string;
    }>;
    error?: string;
  }>;
  readSessionMessages?: (path: string) => Promise<{
    messages: Array<{
      id: string;
      role: "user" | "assistant";
      text: string;
    }>;
    error?: string;
  }>;
  searchSessions: (payload: {
    query: string;
    limit?: number;
  }) => Promise<{
    results: TesTSessionSearchResult[];
    error?: string;
  }>;
  usageStats?: () => Promise<TesTUsageStats>;
  gitInfo?: (payload?: { cwd?: string }) => Promise<{
    repo: boolean;
    branch: string | null;
    branches: string[];
    error?: string;
  }>;
  gitCheckout?: (payload: { cwd?: string; branch: string }) => Promise<{
    ok?: boolean;
    branch?: string;
    error?: string;
    info?: {
      repo: boolean;
      branch: string | null;
      branches: string[];
    };
  }>;
  gitStatus?: (payload?: { cwd?: string }) => Promise<{
    repo: boolean;
    files: Array<{
      path: string;
      status: string;
      additions: number;
      deletions: number;
    }>;
    error?: string;
  }>;
  gitWorktreeList?: (payload?: { cwd?: string }) => Promise<{
    worktrees: Array<{
      path: string;
      branch: string;
      head: string;
      changes?: number;
      ahead?: number;
      behind?: number;
    }>;
    error?: string | null;
  }>;
  gitWorktreeCreate?: (payload?: {
    cwd?: string;
    name?: string;
  }) => Promise<{
    ok?: boolean;
    path?: string;
    branch?: string;
    name?: string;
    error?: string;
  }>;
  gitWorktreeRemove?: (payload?: {
    cwd?: string;
    path?: string;
    deleteBranch?: boolean;
  }) => Promise<{
    ok?: boolean;
    branch?: string;
    branchDeleted?: boolean;
    branchError?: string | null;
    error?: string;
  }>;
  gitWorktreeMerge?: (payload?: {
    cwd?: string;
    branch?: string;
  }) => Promise<{
    ok?: boolean;
    root?: string;
    branch?: string;
    conflicts?: string[];
    error?: string;
  }>;
  gitWorktreeMergeAbort?: (payload?: {
    cwd?: string;
  }) => Promise<{
    ok?: boolean;
    root?: string;
    error?: string;
  }>;
  gitWorktreeMergeContinue?: (payload?: {
    cwd?: string;
  }) => Promise<{
    ok?: boolean;
    root?: string;
    error?: string;
  }>;
  gitDiff?: (payload: { cwd?: string; path: string }) => Promise<{
    patch: string;
    source?: "worktree" | "index" | "file";
    error?: string | null;
  }>;
  gitStage?: (payload: { cwd?: string; path: string }) => Promise<{
    ok?: boolean;
    error?: string;
  }>;
  gitStageHunk?: (payload: { cwd?: string; patch: string }) => Promise<{
    ok?: boolean;
    error?: string;
  }>;
  gitRevertHunk?: (payload: { cwd?: string; patch: string }) => Promise<{
    ok?: boolean;
    error?: string;
  }>;
  gitRevertFile?: (payload: { cwd?: string; path: string }) => Promise<{
    ok?: boolean;
    error?: string;
  }>;
  gitBranchCreate?: (payload: {
    cwd?: string;
    branch: string;
  }) => Promise<{
    ok?: boolean;
    branch?: string;
    info?: { repo: boolean; branch: string | null; branches: string[] };
    error?: string;
  }>;
  gitBranchDelete?: (payload: {
    cwd?: string;
    branch: string;
  }) => Promise<{
    ok?: boolean;
    info?: { repo: boolean; branch: string | null; branches: string[] };
    error?: string;
  }>;
  gitUnstage?: (payload: { cwd?: string; path: string }) => Promise<{
    ok?: boolean;
    error?: string;
  }>;
  gitCommit?: (payload: { cwd?: string; message: string }) => Promise<{
    ok?: boolean;
    output?: string;
    error?: string;
  }>;
  exportSession?: (payload: {
    path: string;
    title?: string;
  }) => Promise<{ ok?: boolean; path?: string; canceled?: boolean; error?: string }>;
  archiveSession?: (payload: { path: string }) => Promise<{
    ok?: boolean;
    path?: string;
    error?: string;
  }>;
  listArchivedSessions?: () => Promise<{
    sessions: Array<{
      path: string;
      name: string;
      cwd: string;
      messageCount: number;
      modified: string;
      size: number;
    }>;
    error?: string;
  }>;
  restoreArchivedSession?: (payload: { path: string }) => Promise<{
    ok?: boolean;
    path?: string;
    error?: string;
  }>;
  getWorkspace?: () => Promise<{
    cwd: string;
    name?: string;
    recent: string[];
    error?: string;
  }>;
  chooseWorkspace?: () => Promise<{
    cwd?: string;
    name?: string;
    recent?: string[];
    canceled?: boolean;
    error?: string;
  }>;
  setWorkspace?: (payload: { cwd: string }) => Promise<{
    cwd?: string;
    name?: string;
    recent?: string[];
    error?: string;
  }>;
  remoteStatus?: () => Promise<TesTRemoteStatus>;
  newAgentWindow?: () => Promise<{
    ok?: boolean;
    pid?: number | null;
    error?: string;
  }>;
  permissionRules?: () => Promise<{
    rules: string[];
    path: string;
  }>;
  clearPermissionRules?: () => Promise<{
    ok?: boolean;
    rules: string[];
  }>;
  dataLocation?: () => Promise<{
    dataDir: string;
    packaged: boolean;
    pointerFile: string;
  }>;
  migrateDataLocation?: () => Promise<{
    ok?: boolean;
    canceled?: boolean;
    dataDir?: string;
    error?: string;
  }>;
  remoteChannels?: () => Promise<TesTChannelStatus[]>;
  feishuConfig?: () => Promise<TesTFeishuConfigResult>;
  verifyFeishuConfig?: (payload: {
    appId: string;
    appSecret: string;
  }) => Promise<{ ok?: boolean; error?: string; appId?: string }>;
  saveFeishuConfig?: (
    payload: Partial<TesTFeishuConfig> & { clearSecret?: boolean },
  ) => Promise<TesTFeishuConfigResult>;
  startRemote?: () => Promise<TesTRemoteStatus>;
  stopRemote?: () => Promise<TesTRemoteStatus>;
  refreshRemoteToken?: () => Promise<TesTRemoteStatus>;
  startRemoteTunnel?: () => Promise<TesTRemoteStatus>;
  stopRemoteTunnel?: () => Promise<TesTRemoteStatus>;
  deleteSession?: (payload: { path: string }) => Promise<{
    ok?: boolean;
    error?: string;
  }>;
  renameSession?: (payload: {
    path: string;
    name: string;
  }) => Promise<{ ok?: boolean; name?: string; error?: string }>;
  getPathForFile?: (file: File) => string;
  listExtensions?: () => Promise<{
    skills: Array<{
      kind: string;
      name: string;
      desc: string;
      path: string;
      enabled: boolean;
      scope?: "global" | "project";
      readonly?: boolean;
    }>;
    extensions: Array<{
      kind: string;
      name: string;
      desc: string;
      path: string;
      enabled: boolean;
      scope?: "global" | "project";
      readonly?: boolean;
    }>;
    project?: {
      cwd: string;
      trusted: boolean;
      skillsDir?: string;
      extensionsDir?: string;
      hasResources: boolean;
    };
    error?: string;
  }>;
  trustWorkspace?: () => Promise<{
    cwd?: string;
    trustFile?: string;
    trusted?: boolean;
    error?: string;
  }>;
  installExtension?: (payload: {
    kind: "skill" | "extension";
    path: string;
  }) => Promise<{ name?: string; path?: string; error?: string }>;
  toggleExtension?: (payload: {
    kind: "skill" | "extension";
    name: string;
    enabled: boolean;
  }) => Promise<{ name?: string; path?: string; enabled?: boolean; error?: string }>;
  removeExtension?: (payload: {
    kind: "skill" | "extension";
    name: string;
  }) => Promise<{ removed?: boolean; path?: string; error?: string }>;
  openExtensionsFolder?: (payload: {
    kind: "skill" | "extension";
    scope?: "global" | "project";
  }) => Promise<{
    path?: string;
    error?: string;
  }>;
  updateStatus?: () => Promise<{
    state: string;
    message?: string;
    version?: string;
    feedUrl?: string | null;
    availableVersion?: string | null;
    percent?: number;
  }>;
  checkUpdate?: () => Promise<{ ok?: boolean; error?: string }>;
  downloadUpdate?: () => Promise<{ ok?: boolean; error?: string }>;
  installUpdate?: () => Promise<{ ok?: boolean; error?: string }>;
  saveUpdateFeed?: (payload: { feedUrl: string }) => Promise<{
    ok?: boolean;
    error?: string;
    status?: {
      state: string;
      message?: string;
      feedUrl?: string | null;
    };
  }>;
  clearUpdateFeed?: () => Promise<{
    ok?: boolean;
    error?: string;
    status?: {
      state: string;
      message?: string;
      feedUrl?: string | null;
    };
  }>;
  piUpdateStatus?: () => Promise<{
    state: string;
    message?: string;
    currentVersion?: string;
    latestVersion?: string;
    percent?: number;
    source?: string;
    packageName?: string;
  }>;
  checkPiUpdate?: () => Promise<{
    ok?: boolean;
    error?: string;
    currentVersion?: string;
    latestVersion?: string;
    hasUpdate?: boolean;
  }>;
  installPiUpdate?: () => Promise<{
    ok?: boolean;
    error?: string;
    version?: string;
    bundleDir?: string;
  }>;
  restorePiKernel?: () => Promise<{
    ok?: boolean;
    error?: string;
    currentVersion?: string;
  }>;
  importPi: () => void;
}

interface Window {
  tesT?: TesTBridge;
}
