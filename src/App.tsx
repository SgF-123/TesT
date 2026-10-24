import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type {
  CSSProperties,
  DragEvent,
  ReactNode,
} from "react";
import emptyBug from "./assets/empty-bug.png";
import brandTerminal from "./assets/brand-terminal.png";
import ArchivedSessionsDialog from "./ArchivedSessionsDialog";
import { AppFrame, AppWindow } from "./AppFrame";
import BranchDialog from "./BranchDialog";
import { Button } from "./Button";
import type { ChatMessage } from "./chat-types";
import {
  CaptionButtons,
  CodeCard,
  PlanCard,
  StreamingBubble,
} from "./ChatExtras";
import { ChatFindBar, ChatHeader } from "./ChatHeader";
import { ChatMessageFlow } from "./ChatMessageFlow";
import { copyText } from "./clipboard";
import CommitDialog from "./CommitDialog";
import { AnnotationStrip, ExtensionStrip } from "./ComposerExtras";
import CloseDialog from "./CloseDialog";
import { Composer } from "./Composer";
import type { ContextAttachment } from "./composer-types";
import {
  CommandPalette,
  type CommandAction,
} from "./CommandPalette";
import { ContextSheet } from "./ContextSheet";
import { DesignGallery } from "./DesignGallery";
import ContextCards from "./ContextCards";
import { CopyButton } from "./CopyButton";
import CustomProviderDialog from "./CustomProviderDialog";
import DeleteSessionDialog from "./DeleteSessionDialog";
import { DiffDialog } from "./DiffDialog";
import { parseDiff } from "./diff";
import { DraftStore } from "./draft-store";
import ExtensionPromptDialog, {
  type ExtensionPrompt,
} from "./ExtensionPromptDialog";
import ExtensionSheet, {
  type Extension,
  type PackageInstallOutcome,
} from "./ExtensionSheet";
import FileBrowserDialog from "./FileBrowserDialog";
import { Checkbox, Segmented, Switch } from "./form-controls";
import type { GitChange } from "./git-types";
import { DotSpinner, LoadingRing } from "./Loading";
import LoginDialog from "./LoginDialog";
import { formatBytes } from "./format";
import MarkdownText from "./Markdown";
import { MessageRow } from "./MessageRow";
import ModelBrowserDialog, {
  type CatalogModel,
  type CatalogProvider,
} from "./ModelBrowserDialog";
import { Progress } from "./Progress";
import { ProcessRail, ToolCard } from "./ProcessRail";
import {
  compactLine,
  extractPiText,
  extractPiThinking,
  fromPiModel,
  fullValue,
  previewValue,
  toolTarget,
} from "./pi-utils";
import type { LiveThinking, LiveTool } from "./process-types";
import {
  LOCAL_PROVIDER_PRESETS,
  PROVIDER_API_OPTIONS,
} from "./provider-presets";
import QueuePanel from "./QueuePanel";
import RemoteDialog from "./RemoteDialog";
import LogDialog from "./LogDialog";
import RenameDialog from "./RenameDialog";
import SelectionToolbar from "./SelectionToolbar";
import SessionSearchDialog from "./SessionSearchDialog";
import SessionSidebar from "./SessionSidebar";
import SessionTagEditor from "./SessionTagEditor";
import SessionTabs from "./SessionTabs";
import SettingsDialog from "./SettingsDialog";
import type { Session, SessionTab } from "./session-types";
import { buildSessionTree } from "./session-tree";
import { projectBasename } from "./session-utils";
import {
  accents,
  shortcutText,
  shortcuts,
  type AccentKey,
  type Density,
  type Model,
  type PiUpdateStatus,
  type UpdateStatus,
} from "./settings-config";
import {
  readAccentPreference,
  readDarkPreference,
  readDensityPreference,
  writeAccentPreference,
  writeDarkPreference,
  writeDensityPreference,
} from "./preferences";
import { reasoningStore, streamStore } from "./stream-store";
import { Tag, type Tone } from "./Tag";
import { TerminalDialog } from "./TerminalDialog";
import Toast, { type ToastData } from "./Toast";
import { TitlebarFrame } from "./TitlebarFrame";
import { Tooltip } from "./Tooltip";
import TurnNavigator from "./TurnNavigator";
import { relativeSessionTime } from "./time-format";
import UsageDialog from "./UsageDialog";
import { useGitController } from "./useGitController";
import { useSessionNavigation } from "./useSessionNavigation";
import { useWorktreeController } from "./useWorktreeController";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import {
  formatCost,
  formatTokenCount,
  messageCount,
  type SessionStats,
} from "./usage";
import {
  ANNOTATION_STORAGE_PREFIX,
  buildAnnotationContext,
  makeDraftAnnotation,
  type DraftAnnotation,
} from "./annotations";
import {
  addSessionTag,
  assignSessionTag,
  assignedTagsForPath,
  clearSessionTags,
  readSessionTagStore,
  sessionHasTag,
  sessionTagUsage,
  toggleSessionTag,
  writeSessionTagStore,
  type SessionTagStore,
} from "./session-tags";
import {
  readScrollMemory,
  writeScrollMemory,
  type ScrollMemoryStore,
} from "./scroll-memory";
import {
  appendQueueTextToDraft,
  buildQueueEntries,
  queueSignature,
  removeQueueEntry,
  type QueueEntry,
} from "./queue";
import {
  buildTurnNavigation,
  TURN_NAVIGATOR_MIN_TURNS,
} from "./turn-navigation";
import {
  bookmarksForSession,
  readTurnBookmarkStore,
  toggleTurnBookmark,
  writeTurnBookmarkStore,
  type TurnBookmarkStore,
} from "./turn-bookmarks";
import { resolveForkTarget, type ForkMessage } from "./session-fork";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import * as SelectPrimitive from "@radix-ui/react-select";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { Group, Panel, Separator } from "react-resizable-panels";
import {
  Archive,
  ArrowDown,
  ArrowRight,
  Bell,
  BookOpen,
  Brain,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  Copy,
  Cpu,
  Download,
  Eraser,
  Eye,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  Gauge,
  GitBranch,
  GitCommitHorizontal,
  GitMerge,
  Globe,
  Image as ImageIcon,
  Keyboard,
  KeyRound,
  Link2,
  LogIn,
  LogOut,
  MessagesSquare,
  Minus,
  MoreHorizontal,
  MousePointerClick,
  Package,
  PaintBucket,
  Palette,
  PanelRight,
  Paperclip,
  Pencil,
  Pin,
  Play,
  Plus,
  Power,
  Quote,
  Puzzle,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Sliders,
  Smartphone,
  Sparkles,
  Square,
  Terminal,
  ThumbsUp,
  Trash2,
  TriangleAlert,
  Wrench,
  Wifi,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import { MorphIcon } from "morphicons/react";
import "@xterm/xterm/css/xterm.css";
import {
  ArrowUp as ArrowUpNode,
  Brain as BrainNode,
  Check as CheckNode,
  Copy as CopyNode,
  FileText as FileTextNode,
  Gauge as GaugeNode,
  ListChecks as ListChecksNode,
  Moon as MoonNode,
  Paperclip as PaperclipNode,
  Play as PlayNode,
  Square as SquareNode,
  Sun as SunNode,
  X as XNode,
  Zap as ZapNode,
} from "lucide";

type PiCommandInfo = {
  name: string;
  description?: string;
  source: "extension" | "prompt" | "skill";
};

type TreeNode = {
  name: string;
  children?: TreeNode[];
  sessions?: Session[];
  fullPath?: string;
};

const tree: TreeNode = {
  name: "Pi",
  children: [
    {
      name: "桌面端",
      children: [
        {
          name: "TesT",
          children: [
            {
              name: "UI",
              children: [
                {
                  name: "组件",
                  children: [
                    {
                      name: "细节",
                      sessions: [
                        {
                          title: "TesT 桌面端设计",
                          meta: "刚刚",
                          tag: "设计",
                        },
                        {
                          title: "按钮与加载器",
                          meta: "8 分钟前",
                        },
                      ],
                    },
                  ],
                  sessions: [
                    { title: "Pi RPC 接入方案", meta: "12 分钟前", unread: true },
                  ],
                },
                {
                  name: "交互",
                  sessions: [
                    { title: "模型配置", meta: "昨天", tag: "配置" },
                  ],
                },
              ],
            },
            {
              name: "扩展",
              sessions: [{ title: "扩展与技能清单", meta: "昨天" }],
            },
          ],
        },
      ],
    },
    {
      name: "发布",
      sessions: [{ title: "发布与更新流程", meta: "10 月 16 日" }],
    },
  ],
};

const fallbackModels: Model[] = [
  {
    id: "claude-sonnet-4.5",
    label: "Claude Sonnet 4.5",
    short: "Sonnet 4.5",
    provider: "Anthropic",
    ctx: "200k",
    contextWindow: 200_000,
  },
  {
    id: "claude-opus-4.1",
    label: "Claude Opus 4.1",
    short: "Opus 4.1",
    provider: "Anthropic",
    ctx: "200k",
    contextWindow: 200_000,
  },
  {
    id: "gpt-5.6-codex",
    label: "GPT-5.6 Codex",
    short: "5.6 Codex",
    provider: "OpenAI",
    ctx: "400k",
    contextWindow: 400_000,
  },
  {
    id: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    short: "2.5 Pro",
    provider: "Google",
    ctx: "1M",
    contextWindow: 1_000_000,
  },
];

const placeholderModel: Model = {
  id: "",
  label: "未配置模型",
  short: "未配置",
  provider: "Pi",
  ctx: "—",
  contextWindow: 0,
};

function matchesShortcut(
  event: KeyboardEvent,
  id: string,
  fallback: string[],
) {
  const parts = shortcutText(id, fallback)
    .split("+")
    .map((item) => item.trim())
    .filter(Boolean);
  const key = parts.at(-1)?.toLowerCase() || "";
  const expectedKey =
    key === "comma" ? "," : key === "space" ? " " : key;
  return (
    event.key.toLowerCase() === expectedKey &&
    event.ctrlKey === parts.some((item) => item.toLowerCase() === "ctrl") &&
    event.metaKey === parts.some((item) => item.toLowerCase() === "meta") &&
    event.shiftKey === parts.some((item) => item.toLowerCase() === "shift") &&
    event.altKey === parts.some((item) => item.toLowerCase() === "alt")
  );
}

function countSessions(node: TreeNode): number {
  return (
    (node.sessions?.length ?? 0) +
    (node.children?.reduce((sum, child) => sum + countSessions(child), 0) ?? 0)
  );
}

function flattenSessions(node: TreeNode): Session[] {
  const own = node.sessions ?? [];
  const nested = (node.children ?? []).flatMap(flattenSessions);
  return [...own, ...nested];
}

type SessionInfo = {
  path: string;
  id: string;
  cwd: string;
  parentSessionPath: string | null;
  name: string | null;
  firstMessage: string | null;
  messageCount: number;
  created: string | null;
  modified: string;
};

function sameWorkspacePath(a?: string, b?: string) {
  if (!a || !b) {
    return false;
  }
  const left = a.replace(/[\\/]+$/, "").toLowerCase();
  const right = b.replace(/[\\/]+$/, "").toLowerCase();
  return left === right;
}

function pathWithinProject(cwd?: string, project?: string) {
  if (!cwd || !project) {
    return false;
  }
  const left = cwd.replace(/[\\/]+$/, "").toLowerCase();
  const right = project.replace(/[\\/]+$/, "").toLowerCase();
  return (
    left === right ||
    left.startsWith(`${right}\\`) ||
    left.startsWith(`${right}/`)
  );
}

function thinkingLabel(level: string) {
  const labels: Record<string, string> = {
    off: "关闭思考",
    minimal: "最少",
    low: "更快",
    medium: "平衡",
    high: "更深",
    xhigh: "很深",
    max: "极限",
  };
  return labels[level] ? `${level} · ${labels[level]}` : level;
}

function mentionRank(filePath: string) {
  const ranks: Record<string, number> = {
    ".ts": 0,
    ".tsx": 1,
    ".js": 2,
    ".jsx": 3,
    ".py": 4,
    ".go": 5,
    ".rs": 6,
    ".java": 7,
    ".md": 8,
    ".json": 9,
    ".css": 10,
    ".html": 11,
    ".yml": 12,
    ".yaml": 13,
    ".toml": 14,
  };
  const dot = filePath.lastIndexOf(".");
  const ext = dot >= 0 ? filePath.slice(dot).toLowerCase() : "";
  return ranks[ext] ?? 40;
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() =>
    window.matchMedia(query).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    const handler = () => setMatches(media.matches);
    handler();
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

export default function App() {
  const bridge = window.tesT;
  const isShell = Boolean(bridge?.isShell);
  const params = new URLSearchParams(window.location.search);
  const [dark, setDark] = useState(
    () => readDarkPreference(window.location.search, localStorage),
  );
  const [gallery, setGallery] = useState(params.has("gallery"));
  const [toast, setToast] = useState<ToastData | null>(null);
  const [active, setActive] = useState(0);
  const [sessionInfos, setSessionInfos] = useState<SessionInfo[]>([]);
  const [activeSessionPath, setActiveSessionPath] = useState("");
  const [sessionTabs, setSessionTabs] = useState<SessionTab[]>([]);
  const [pinnedPaths, setPinnedPaths] = useState<string[]>(() => {
    try {
      const raw = JSON.parse(
        localStorage.getItem("tesT.pinnedSessions") || "[]",
      );
      return Array.isArray(raw)
        ? raw.filter((item): item is string => typeof item === "string")
        : [];
    } catch {
      return [];
    }
  });
  const [sessionTagStore, setSessionTagStore] = useState<SessionTagStore>(
    () => readSessionTagStore(),
  );
  const [turnBookmarkStore, setTurnBookmarkStore] =
    useState<TurnBookmarkStore>(() => readTurnBookmarkStore());
  const [activeSessionTag, setActiveSessionTag] = useState<string | null>(
    null,
  );
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [contextTokens, setContextTokens] = useState(0);
  const [annotations, setAnnotations] = useState<DraftAnnotation[]>([]);

  const [liveTools, setLiveTools] = useState<LiveTool[]>([]);
  const [liveThinking, setLiveThinking] = useState<LiveThinking[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    params.has("collapsed") ? { "/Pi": false } : {},
  );
  const [draftStore] = useState(
    () =>
      new DraftStore(
        params.has("slash") ? "/" : params.has("mention") ? "@" : "",
      ),
  );
  const [contextFiles, setContextFiles] = useState<ContextAttachment[]>([]);
  const [sent, setSent] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [model, setModel] = useState<Model>(
    isShell ? placeholderModel : fallbackModels[0],
  );
  const [availableModels, setAvailableModels] = useState<Model[]>(
    isShell ? [] : fallbackModels,
  );
  const [authProviders, setAuthProviders] = useState<string[]>([]);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [piUpdateStatus, setPiUpdateStatus] =
    useState<PiUpdateStatus | null>(null);
  const [piStatus, setPiStatus] = useState<
    "offline" | "connecting" | "ready" | "error"
  >(isShell ? "connecting" : "offline");
  const [liveMessages, setLiveMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [streamActive, setStreamActive] = useState(false);
  const [interrupted, setInterrupted] = useState(false);
  const [sessionName, setSessionName] = useState("新会话");
  const [modelOpen, setModelOpen] = useState(params.has("menu"));
  const [reasoningOpen, setReasoningOpen] = useState(false);
  const [reasoning, setReasoning] = useState("medium");
  const [cmdOpen, setCmdOpen] = useState(params.has("cmd"));
  const [usageOpen, setUsageOpen] = useState(params.has("status"));
  const [planMode, setPlanMode] = useState(
    () => localStorage.getItem("tesT.planMode") === "1",
  );
  const [streaming, setStreaming] = useState(
    () => localStorage.getItem("tesT.streaming") !== "0",
  );
  const [autoCompact, setAutoCompact] = useState(
    () => localStorage.getItem("tesT.autoCompact") !== "0",
  );
  const [restoreSession, setRestoreSession] = useState(
    () => localStorage.getItem("tesT.restoreSession") !== "0",
  );
  const [queuedMessages, setQueuedMessages] = useState(0);
  const [queueItems, setQueueItems] = useState<QueueEntry[]>([]);
  const [queueMutating, setQueueMutating] = useState(false);
  const [compacting, setCompacting] = useState(false);
  const [piCommands, setPiCommands] = useState<PiCommandInfo[]>([]);
  const [extensionPrompt, setExtensionPrompt] =
    useState<ExtensionPrompt | null>(
      params.has("ext")
        ? {
            id: "preview",
            method: "select",
            title: "允许运行这条命令？",
            message: "npm run build",
            options: ["允许一次", "阻止"],
          }
        : null,
    );
  const [extensionStatuses, setExtensionStatuses] = useState<
    Record<string, string>
  >({});
  const [extensionWidgets, setExtensionWidgets] = useState<
    Record<string, { lines: string[]; placement?: string }>
  >({});
  const [thinkingLevels, setThinkingLevels] = useState<string[]>([
    "low",
    "medium",
    "high",
  ]);
  const [deleteTarget, setDeleteTarget] = useState<Session | null>(null);
  const [sessionSearchOpen, setSessionSearchOpen] = useState(false);
  const [sessionQuery, setSessionQuery] = useState("");
  const [sessionResults, setSessionResults] = useState<
    TesTSessionSearchResult[]
  >([]);
  const [sessionSearching, setSessionSearching] = useState(false);
  const [maxed, setMaxed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(params.has("settings"));
  const [nativeLoginOpen, setNativeLoginOpen] = useState(
    params.has("login"),
  );
  const [customProviderOpen, setCustomProviderOpen] = useState(
    params.has("custom"),
  );
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Session | null>(null);
  const [modelBrowserOpen, setModelBrowserOpen] = useState(
    params.has("models"),
  );
  const [settingsTab, setSettingsTab] = useState(
    params.get("tab") ?? "appearance",
  );
  const [closeOpen, setCloseOpen] = useState(params.has("close"));
  const [sheetMode, setSheetMode] = useState<null | "extensions" | "context">(
    params.get("sheet") === "context"
      ? "context"
      : params.has("sheet")
        ? "extensions"
        : null,
  );
  const [extensionData, setExtensionData] = useState<{
    skills: Extension[];
    extensions: Extension[];
  }>({ skills: [], extensions: [] });
  const [extensionProject, setExtensionProject] = useState<{
    cwd: string;
    trusted: boolean;
    hasResources: boolean;
    skillsDir?: string;
    extensionsDir?: string;
  } | null>(null);
  const [density, setDensity] = useState<Density>(() =>
    readDensityPreference(localStorage),
  );
  const [accentKey, setAccentKey] = useState<AccentKey>(() =>
    readAccentPreference(localStorage),
  );
  const [budgetUsd, setBudgetUsdState] = useState(() => {
    const raw = Number(localStorage.getItem("tesT.budgetUsd"));
    return Number.isFinite(raw) && raw > 0 ? raw : 0;
  });
  const budgetAlertedRef = useRef(false);
  const setBudgetUsd = (value: number) => {
    const next = Number.isFinite(value) ? Math.max(0, value) : 0;
    setBudgetUsdState(next);
    localStorage.setItem("tesT.budgetUsd", String(next));
  };
  const togglePlanMode = () => {
    setPlanMode((value) => {
      const next = !value;
      localStorage.setItem("tesT.planMode", next ? "1" : "0");
      bridge?.setPlanMode?.(next);
      notify(
        next ? "计划模式已开启" : "计划模式已关闭",
        next ? "Pi 会先给方案，不直接改代码" : "恢复直接执行",
      );
      return next;
    });
  };
  const changeStreaming = (value: boolean) => {
    setStreaming(value);
    localStorage.setItem("tesT.streaming", value ? "1" : "0");
  };
  const changeAutoCompact = (value: boolean) => {
    setAutoCompact(value);
    localStorage.setItem("tesT.autoCompact", value ? "1" : "0");
    bridge?.send({
      id: `auto-compact-${Date.now()}`,
      type: "set_auto_compaction",
      enabled: value,
    });
    notify(
      value ? "已开启自动压缩" : "已关闭自动压缩",
      value ? "接近上限时 Pi 会自动摘要旧消息" : "上下文会一直累积",
    );
  };
  const changeRestoreSession = (value: boolean) => {
    setRestoreSession(value);
    localStorage.setItem("tesT.restoreSession", value ? "1" : "0");
    notify(
      value ? "下次启动会恢复会话" : "下次启动从新会话开始",
      "重启 TesT 后生效",
    );
  };
  const togglePinned = (path: string) => {
    if (!path) {
      return;
    }
    setPinnedPaths((previous) => {
      const next = previous.includes(path)
        ? previous.filter((item) => item !== path)
        : [...previous, path];
      localStorage.setItem(
        "tesT.pinnedSessions",
        JSON.stringify(next),
      );
      return next;
    });
  };
  const [workspace, setWorkspace] = useState("");
  const [scratchWorkspace, setScratchWorkspace] = useState("");
  const [recentWorkspaces, setRecentWorkspaces] = useState<string[]>([]);
  const [hiddenProjects, setHiddenProjects] = useState<string[]>(() => {
    try {
      const value = JSON.parse(
        localStorage.getItem("tesT.hiddenProjects") || "[]",
      );
      return Array.isArray(value)
        ? value.filter((item): item is string => typeof item === "string")
        : [];
    } catch {
      return [];
    }
  });
  const [workspaceOpen, setWorkspaceOpen] = useState(
    params.has("workspace"),
  );
  const [filesOpen, setFilesOpen] = useState(params.has("files"));
  const [branchOpen, setBranchOpen] = useState(params.has("branches"));
  const [archiveOpen, setArchiveOpen] = useState(params.has("archive"));
  const [logOpen, setLogOpen] = useState(params.has("log"));
  const [terminalOpen, setTerminalOpen] = useState(
    params.has("terminal"),
  );
  const [remoteOpen, setRemoteOpen] = useState(params.has("remote"));
  const [remoteStatus, setRemoteStatus] =
    useState<TesTRemoteStatus | null>(null);

  useEffect(() => {
    budgetAlertedRef.current = false;
  }, [activeSessionPath, workspace]);

  useEffect(() => {
    const cost = sessionStats?.cost ?? 0;
    if (
      budgetUsd > 0 &&
      cost > budgetUsd &&
      !budgetAlertedRef.current
    ) {
      budgetAlertedRef.current = true;
      notify(
        "会话成本已超预算",
        `$${cost.toFixed(2)} / $${budgetUsd.toFixed(2)}`,
      );
    }
  }, [budgetUsd, sessionStats?.cost]);

  const toastTimer = useRef<number | null>(null);
  const replyTimer = useRef<number | null>(null);
  const bridgeStarted = useRef(false);
  const streamActiveRef = useRef(false);
  const streamingRef = useRef(streaming);
  const thinkingStartedAtRef = useRef<number | null>(null);
  const currentTurnMessageIdRef = useRef("");
  const queuedTextsRef = useRef<string[]>([]);
  const piResponseWaitersRef = useRef(
    new Map<
      string,
      {
        resolve: (record: any) => void;
        timer: number;
      }
    >(),
  );
  const resumeAfterSettleRef = useRef(false);
  const resumePiRef = useRef<() => void>(() => {});
  const extensionQueueRef = useRef<ExtensionPrompt[]>([]);
  const tabsRef = useRef<SessionTab[]>([]);
  const activePathRef = useRef("");
  const closeTabRef = useRef<(path: string) => void>(() => {});
  const cycleTabRef = useRef<(delta: number) => void>(() => {});
  const selectSessionByPathRef = useRef<(path: string) => void>(() => {});
  const sessionRefreshTimer = useRef<number | null>(null);
  const sessionLoadSeq = useRef(0);
  const messageRequestSeq = useRef(0);
  const historyCacheRef = useRef(new Map<string, ChatMessage[]>());
  const prefetchInFlightRef = useRef(new Set<string>());
  const hoverPrefetchTimerRef = useRef<number | null>(null);
  const latestMessagesRequestId = useRef("");
  const latestSwitchRequestId = useRef("");
  const pendingSwitchRef = useRef<{
    id: string;
    previousPath: string;
  } | null>(null);
  const newSessionRef = useRef<() => void>(() => {});
  const contextInputRef = useRef<HTMLInputElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const pendingScrollRestoreRef = useRef<{
    path: string;
    entry: ScrollMemoryStore[string];
  } | null>(null);
  const annotationHydratedKeyRef = useRef("");
  const liveMessagesRef = useRef<ChatMessage[]>([]);
  liveMessagesRef.current = liveMessages;
  const queueItemsRef = useRef<QueueEntry[]>([]);
  queueItemsRef.current = queueItems;
  const queueMutatingRef = useRef(false);

  const {
    messageRenderLimit,
    setMessageRenderLimit,
    showScrollLatest,
    setShowScrollLatest,
    showScrollTop,
    setShowScrollTop,
    unseenMessages,
    setUnseenMessages,
    findOpen,
    setFindOpen,
    findQuery,
    setFindQuery,
    findIndex,
    setFindIndex,
    findMatches,
    findMatchSet,
    visibleLiveMessages,
    hiddenMessageCount,
    turnNavigationItems,
    turnNumberById,
    currentTurn,
    showTurnNavigation,
    scrollMemoryRef,
    stickToBottomRef,
    scrollMessagesToBottom,
    scrollMessagesToTop,
    rememberCurrentScroll,
    handleMessagesScroll,
    locateTurn,
    showEarlierMessages,
  } = useSessionNavigation({
    activeSessionPath,
    liveMessages,
    messagesLoading,
    historyLoading,
    messagesRef,
  });

  const rememberHistory = (path: string, messages: ChatMessage[]) => {
    if (!path || messages.length === 0) {
      return;
    }
    const cache = historyCacheRef.current;
    cache.delete(path);
    cache.set(path, messages);
    while (cache.size > 12) {
      const oldest = cache.keys().next().value;
      if (!oldest) {
        break;
      }
      cache.delete(oldest);
    }
  };

  const prefetchSession = (session: Session) => {
    const path = session.path;
    if (
      !isShell ||
      !path ||
      path === activePathRef.current ||
      historyCacheRef.current.has(path) ||
      prefetchInFlightRef.current.has(path)
    ) {
      return;
    }
    const reader = window.tesT?.readSessionMessages;
    if (!reader) {
      return;
    }

    prefetchInFlightRef.current.add(path);
    void reader(path)
      .then((result) => {
        if (result?.messages?.length) {
          rememberHistory(path, result.messages);
        }
      })
      .catch(() => {
        // Prefetch is opportunistic; failures stay silent.
      })
      .finally(() => {
        prefetchInFlightRef.current.delete(path);
      });
  };
  const prefetchSessionRef = useRef(prefetchSession);
  prefetchSessionRef.current = prefetchSession;

  const requestMessages = (prefix = "messages") => {
    const id = `${prefix}-${Date.now()}-${++messageRequestSeq.current}`;
    latestMessagesRequestId.current = id;
    bridge?.send({ id, type: "get_messages" });
    return id;
  };

  useEffect(() => {
    streamingRef.current = streaming;
  }, [streaming]);

  useEffect(() => {
    tabsRef.current = sessionTabs;
    activePathRef.current = activeSessionPath;
  }, [sessionTabs, activeSessionPath]);

  useEffect(() => {
    if (!messagesLoading) {
      return;
    }
    const timer = window.setTimeout(() => setMessagesLoading(false), 15000);
    return () => window.clearTimeout(timer);
  }, [messagesLoading]);

  useEffect(() => {
    if (!historyLoading) {
      return;
    }
    const timer = window.setTimeout(() => {
      setHistoryLoading(false);
      setMessagesLoading(false);
    }, 15000);
    return () => window.clearTimeout(timer);
  }, [historyLoading]);

  useEffect(() => {
    if (
      !activeSessionPath ||
      messagesLoading ||
      historyLoading ||
      liveMessages.length === 0
    ) {
      return;
    }
    rememberHistory(activeSessionPath, liveMessages);
  }, [activeSessionPath, liveMessages, messagesLoading, historyLoading]);

  const tiny = useMediaQuery("(max-width: 760px)");

  const accent = accents[accentKey];

  const notify = useCallback((title: string, desc?: string) => {
    setToast({ id: Date.now(), title, desc });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  const notifyAction = useCallback(
    (
      title: string,
      desc: string,
      actionLabel: string,
      onAction: () => void | Promise<void>,
      duration = 5200,
    ) => {
      setToast({
        id: Date.now(),
        title,
        desc,
        actionLabel,
        onAction,
        durationMs: duration,
      });
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => setToast(null), duration);
    },
    [],
  );

  const addSelectionAnnotation = useCallback(
    (quote: string, note: string, messageId: string | null) => {
      const annotation = makeDraftAnnotation(quote, note, messageId);
      if (!annotation.quote) {
        return;
      }
      setAnnotations((previous) => [...previous, annotation]);
      notify(
        note.trim() ? "已添加批注" : "已引用选中内容",
        "会随下一条消息一起发送",
      );
      composerRef.current?.focus();
    },
    [notify],
  );

  const toggleSessionTagForPath = useCallback(
    (path: string, tagId: string) => {
      setSessionTagStore((previous) =>
        toggleSessionTag(previous, path, tagId),
      );
    },
    [],
  );

  const createSessionTagForPath = useCallback(
    (path: string, name: string) => {
      setSessionTagStore((previous) => {
        const result = addSessionTag(previous, name);
        return result.tag
          ? assignSessionTag(result.store, path, result.tag.id)
          : previous;
      });
    },
    [],
  );

  const clearSessionTagsForPath = useCallback((path: string) => {
    setSessionTagStore((previous) => clearSessionTags(previous, path));
  }, []);

  const sendPiCommand = useCallback(
    (command: Record<string, unknown>, timeoutMs = 7000) => {
      if (!bridge) return Promise.resolve(null);
      const id = String(
        command.id ?? `ui-command-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      );
      return new Promise<any>((resolve) => {
        const timer = window.setTimeout(() => {
          piResponseWaitersRef.current.delete(id);
          resolve(null);
        }, timeoutMs);
        piResponseWaitersRef.current.set(id, { resolve, timer });
        bridge.send({ ...command, id });
      });
    },
    [bridge],
  );

  const applyQueueEntries = useCallback((entries: QueueEntry[]) => {
    setQueueItems(entries);
    setQueuedMessages(entries.length);
    queuedTextsRef.current = entries.map((entry) => entry.text);
  }, []);

  const clearServerQueue = useCallback(async (expected: QueueEntry[]) => {
    const response = await sendPiCommand({ type: "clear_queue" });
    if (!response?.success) {
      notify("队列操作失败", response?.error || "Pi 没有返回确认");
      return null;
    }
    const entries = buildQueueEntries(
      response.data?.steering,
      response.data?.followUp,
    );
    return {
      entries,
      changed: queueSignature(entries) !== queueSignature(expected),
    };
  }, [notify, sendPiCommand]);

  const requeueEntries = useCallback(
    async (entries: QueueEntry[]) => {
      applyQueueEntries(entries);
      let failed = false;
      for (const entry of entries) {
        const response = await sendPiCommand({
          type: entry.kind === "steering" ? "steer" : "follow_up",
          message: entry.text,
        });
        if (!response?.success) {
          failed = true;
          break;
        }
      }
      if (failed) {
        notify("部分队列未能恢复", "请检查当前任务状态后重试");
      }
    },
    [applyQueueEntries, notify, sendPiCommand],
  );

  const takeBackQueueItem = useCallback(
    async (item: QueueEntry) => {
      if (queueMutatingRef.current) return;
      queueMutatingRef.current = true;
      setQueueMutating(true);
      try {
        const snapshot = await clearServerQueue(queueItemsRef.current);
        if (!snapshot) return;
        if (snapshot.changed) {
          await requeueEntries(snapshot.entries);
          notify("队列已发生变化", "请刷新后重新操作");
          return;
        }
        const remaining = removeQueueEntry(snapshot.entries, item);
        await requeueEntries(remaining);
        draftStore.update((current) =>
          appendQueueTextToDraft(current, item.text),
        );
        composerRef.current?.focus();
        notify("已取回队列消息", "可以修改后重新发送");
      } finally {
        queueMutatingRef.current = false;
        setQueueMutating(false);
      }
    },
    [clearServerQueue, draftStore, notify, queueMutating, requeueEntries],
  );

  const deleteQueueItem = useCallback(
    async (item: QueueEntry) => {
      if (queueMutatingRef.current) return;
      queueMutatingRef.current = true;
      setQueueMutating(true);
      try {
        const snapshot = await clearServerQueue(queueItemsRef.current);
        if (!snapshot) return;
        if (snapshot.changed) {
          await requeueEntries(snapshot.entries);
          notify("队列已发生变化", "请刷新后重新操作");
          return;
        }
        const remaining = removeQueueEntry(snapshot.entries, item);
        await requeueEntries(remaining);
        notifyAction(
          "已删除排队消息",
          "5 秒内可以恢复",
          "撤销",
          async () => {
            const response = await sendPiCommand({
              type: item.kind === "steering" ? "steer" : "follow_up",
              message: item.text,
            });
            notify(
              response?.success ? "已恢复排队消息" : "恢复失败",
              response?.success ? "" : response?.error || "Pi 没有接受该消息",
            );
          },
        );
      } finally {
        queueMutatingRef.current = false;
        setQueueMutating(false);
      }
    },
    [
      clearServerQueue,
      notify,
      notifyAction,
      queueMutating,
      requeueEntries,
      sendPiCommand,
    ],
  );

  const steerQueueItem = useCallback(
    async (item: QueueEntry) => {
      if (queueMutatingRef.current || item.kind === "steering") return;
      queueMutatingRef.current = true;
      setQueueMutating(true);
      try {
        const snapshot = await clearServerQueue(queueItemsRef.current);
        if (!snapshot) return;
        if (snapshot.changed) {
          await requeueEntries(snapshot.entries);
          notify("队列已发生变化", "请刷新后重新操作");
          return;
        }
        const remaining = removeQueueEntry(snapshot.entries, item);
        const steerResponse = await sendPiCommand({
          type: "steer",
          message: item.text,
        });
        if (!steerResponse?.success) {
          await requeueEntries(snapshot.entries);
          notify("引导失败", steerResponse?.error || "Pi 未接受该消息");
          return;
        }
        await requeueEntries(remaining);
        applyQueueEntries([
          { ...item, id: `steering-now-${Date.now()}`, kind: "steering" },
          ...remaining,
        ]);
        notify("已转为引导", "当前工具批次结束后立即生效");
      } finally {
        queueMutatingRef.current = false;
        setQueueMutating(false);
      }
    },
    [
      applyQueueEntries,
      clearServerQueue,
      notify,
      queueMutating,
      sendPiCommand,
    ],
  );

  const takeBackAllQueue = useCallback(async () => {
    if (queueMutatingRef.current) return;
    queueMutatingRef.current = true;
    setQueueMutating(true);
    try {
        const snapshot = await clearServerQueue(queueItemsRef.current);
        if (!snapshot) return;
        if (snapshot.changed) {
          await requeueEntries(snapshot.entries);
          notify("队列已发生变化", "请刷新后重新操作");
          return;
        }
        const text = snapshot.entries
          .map((entry) => entry.text)
          .join("\n\n");
      draftStore.update((current) =>
        appendQueueTextToDraft(current, text),
      );
      applyQueueEntries([]);
      composerRef.current?.focus();
        notify("已取回全部队列", `${snapshot.entries.length} 条消息`);
    } finally {
      queueMutatingRef.current = false;
      setQueueMutating(false);
    }
  }, [
    applyQueueEntries,
    clearServerQueue,
    draftStore,
    notify,
    queueMutating,
    requeueEntries,
  ]);

  useEffect(() => {
    if (!sessionSearchOpen) {
      return;
    }
    const query = sessionQuery.trim();
    if (query.length < 2) {
      setSessionResults([]);
      setSessionSearching(false);
      return;
    }
    setSessionSearching(true);
    const timer = window.setTimeout(() => {
      if (!isShell || !bridge?.searchSessions) {
        setSessionResults([]);
        setSessionSearching(false);
        return;
      }
      void bridge
        .searchSessions({ query, limit: 40 })
        .then((result) => {
          setSessionResults(
            Array.isArray(result?.results) ? result.results : [],
          );
          if (result?.error) {
            notify("搜索失败", result.error);
          }
        })
        .catch(() => setSessionResults([]))
        .finally(() => setSessionSearching(false));
    }, 240);
    return () => window.clearTimeout(timer);
  }, [sessionSearchOpen, sessionQuery, isShell, bridge]);

  const scheduleStream = (delta: string) => {
    if (!streamActiveRef.current) {
      streamActiveRef.current = true;
      setStreamActive(true);
    }
    streamStore.append(delta);
  };

  const resetStream = () => {
    streamActiveRef.current = false;
    setStreamActive(false);
    streamStore.reset();
    reasoningStore.reset();
    thinkingStartedAtRef.current = null;
  };

  const scheduleReasoning = (delta: string) => {
    if (!streamingRef.current || !delta) {
      return;
    }
    if (thinkingStartedAtRef.current === null) {
      thinkingStartedAtRef.current = Date.now();
    }
    reasoningStore.append(delta);
  };

  const appendContext = (files: ContextAttachment[]) => {
    if (files.length === 0) {
      return;
    }
    setContextFiles((previous) => {
      const paths = new Set(previous.map((file) => file.path));
      return [
        ...previous,
        ...files.filter((file) => !paths.has(file.path)),
      ].slice(0, 12);
    });
  };

  const readBrowserContext = async (files: File[]) => {
    const next: ContextAttachment[] = [];
    for (const file of files) {
      if (file.size > 4 * 1024 * 1024) {
        notify("文件太大", `${file.name} 超过 4 MB`);
        continue;
      }
      if (!file.type.startsWith("image/") && file.size > 512 * 1024) {
        notify("文件太大", `${file.name} 超过 512 KB`);
        continue;
      }
      const id = `${Date.now()}-${file.name}-${Math.random().toString(36).slice(2)}`;
      if (file.type.startsWith("image/")) {
        const data = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => resolve("");
          reader.readAsDataURL(file);
        });
        const base64 = data.includes(",")
          ? data.slice(data.indexOf(",") + 1)
          : "";
        if (base64) {
          next.push({
            id,
            path: file.name,
            name: file.name,
            size: file.size,
            kind: "image",
            mimeType: file.type || "image/png",
            data: base64,
          });
        }
        continue;
      }
      const text = await file.text().catch(() => "");
      next.push({
        id,
        path: file.name,
        name: file.name,
        size: file.size,
        kind: "text",
        mimeType: file.type || "text/plain",
        text: text.slice(0, 200000),
      });
    }
    appendContext(next);
  };

  const pickContext = async () => {
    if (isShell && bridge?.pickContext && bridge?.readContext) {
      const picked = await bridge.pickContext();
      if (picked?.canceled || !picked?.files?.length) {
        return;
      }
      const read = await bridge.readContext(picked.files);
      if (read?.error) {
        notify("添加上下文失败", read.error);
      }
      appendContext(read?.files ?? []);
      return;
    }
    contextInputRef.current?.click();
  };

  const pickContextFolder = async () => {
    if (!isShell || !bridge?.pickContextFolder || !bridge?.readContext) {
      notify("添加文件夹", "桌面端中可用");
      return;
    }
    const picked = await bridge.pickContextFolder();
    if (picked?.canceled || !picked?.files?.length) {
      return;
    }
    const read = await bridge.readContext(picked.files);
    if (read?.error) {
      notify("读取文件夹失败", read.error);
    }
    appendContext(read?.files ?? []);
    notify(
      "已加入文件夹上下文",
      `读取 ${read?.files?.length ?? 0} 个文本 / 图片文件`,
    );
  };

  const onContextFiles = async (files: FileList | null) => {
    if (!files?.length) {
      return;
    }
    if (isShell && bridge?.getPathForFile && bridge?.readContext) {
      const paths = Array.from(files)
        .map((file) => bridge.getPathForFile?.(file) || "")
        .filter(Boolean);
      if (paths.length > 0) {
        const read = await bridge.readContext(paths);
        if (read?.error) {
          notify("添加上下文失败", read.error);
        }
        appendContext(read?.files ?? []);
        return;
      }
    }
    await readBrowserContext(Array.from(files));
  };

  const onContextDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    await onContextFiles(event.dataTransfer.files);
  };

  const removeContext = (id: string) => {
    setContextFiles((previous) =>
      previous.filter((file) => file.id !== id),
    );
  };

  const reorderContext = (sourceId: string, targetId: string) => {
    if (!sourceId || sourceId === targetId) {
      return;
    }
    setContextFiles((items) => {
      const sourceIndex = items.findIndex((item) => item.id === sourceId);
      const targetIndex = items.findIndex((item) => item.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0) {
        return items;
      }
      const next = [...items];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  const sendPrompt = (
    text: string,
    attachments: ContextAttachment[],
    options?: {
      forceIdle?: boolean;
      annotationContext?: string;
      annotationCount?: number;
    },
  ) => {
    if (!text && attachments.length === 0) return;
    setInterrupted(false);
    resumeAfterSettleRef.current = false;
    const textAttachments = attachments.filter(
      (file) => file.kind === "text" && file.text,
    );
    const images = attachments
      .filter((file) => file.kind === "image" && file.data)
      .map((file) => ({
        type: "image" as const,
        data: file.data || "",
        mimeType: file.mimeType || "image/png",
      }));
    const attachmentText = textAttachments
      .map(
        (file) =>
          `<file path="${file.path}">\n${file.text || ""}\n</file>`,
      )
      .join("\n\n");
    const message = text || "请阅读我附加的上下文。";
    const outbound = planMode
      ? `[计划模式] 先只做分析和方案，不要修改文件或运行有副作用的命令。给出步骤、风险与验证方式，等我确认后再执行。\n\n${message}`
      : message;
    const fullMessage = [
      outbound,
      options?.annotationContext,
      attachmentText,
    ]
      .filter(Boolean)
      .join("\n\n");
    const attachmentSummary =
      attachments.length > 0
        ? `\n\n📎 ${attachments.map((file) => file.name).join(" · ")}`
        : "";
    const annotationSummary = options?.annotationCount
      ? `\n\n↳ ${options.annotationCount} 条引用上下文`
      : "";
    const displayText = `${message}${annotationSummary}${attachmentSummary}`;

    if (isShell) {
      const busy =
        !options?.forceIdle && (pending || streamActiveRef.current);
      setPending(true);
      if (busy) {
        queuedTextsRef.current.push(displayText);
      } else {
        const userId = `user-${Date.now()}`;
        currentTurnMessageIdRef.current = userId;
        setLiveMessages((prev) => [
          ...prev,
          {
            id: userId,
            role: "user",
            text: displayText,
          },
        ]);
        resetStream();
      }
      bridge?.send({
        id: `prompt-${Date.now()}`,
        type: "prompt",
        message: fullMessage,
        ...(images.length > 0 ? { images } : {}),
        ...(busy ? { streamingBehavior: "followUp" as const } : {}),
      });
      if (busy) {
        setQueueItems((previous) => [
          ...previous,
          {
            id: `local-follow-up-${Date.now()}-${previous.length}`,
            text: displayText,
            kind: "followUp",
          },
        ]);
        setQueuedMessages((count) => count + 1);
      }
      return;
    }

    setSent((prev) => [...prev, displayText]);
    setPending(true);
    if (replyTimer.current) window.clearTimeout(replyTimer.current);
    replyTimer.current = window.setTimeout(() => setPending(false), 1400);
  };

  const openModelSettings = useCallback(() => {
    setSettingsTab("models");
    setSettingsOpen(true);
  }, []);

  const send = () => {
    if (isShell && !model.id) {
      notify("先配置模型", "选择一个模型后即可发送");
      openModelSettings();
      return;
    }
    const annotationContext = buildAnnotationContext(annotations);
    const draft = draftStore.getSnapshot();
    const text =
      draft.trim() ||
      (annotations.length ? "请阅读我引用的上下文。" : "");
    if (!text && contextFiles.length === 0) return;
    const attachments = contextFiles;
    draftStore.update("");
    setContextFiles([]);
    setAnnotations([]);
    composerRef.current?.focus();
    sendPrompt(text, attachments, {
      annotationContext,
      annotationCount: annotations.length,
    });
  };

  const stopPi = () => {
    if (!isShell) {
      return;
    }
    resumeAfterSettleRef.current = false;
    setInterrupted(true);
    bridge?.send({ id: `abort-${Date.now()}`, type: "abort" });
    queuedTextsRef.current = [];
    setQueuedMessages(0);
    setQueueItems([]);
    notify("已请求中断", "Pi 会停下手上的步骤");
  };

  const continuePi = () => {
    if (!isShell) {
      setInterrupted(false);
      return;
    }
    setInterrupted(false);
    if (pending || streamActiveRef.current) {
      resumeAfterSettleRef.current = true;
      return;
    }
    sendPrompt("继续", [], { forceIdle: true });
    notify("继续生成", "让 Pi 接着上次中断的位置继续");
  };
  resumePiRef.current = () => {
    if (!resumeAfterSettleRef.current) {
      return;
    }
    resumeAfterSettleRef.current = false;
    sendPrompt("继续", [], { forceIdle: true });
    notify("继续生成", "Pi 已从上次中断的位置接着生成");
  };

  const compactContext = () => {
    if (!isShell) {
      notify("压缩上下文", "桌面端中可用");
      return;
    }
    if (compacting) {
      return;
    }
    setCompacting(true);
    bridge?.send({ id: `compact-${Date.now()}`, type: "compact" });
    notify("正在压缩上下文", "Pi 会摘要较早的消息");
  };

  const nextExtensionPrompt = () => {
    setExtensionPrompt(extensionQueueRef.current.shift() ?? null);
  };

  const resolveExtensionPrompt = (id: string) => {
    if (!id) {
      return;
    }
    setExtensionPrompt((current) => {
      if (current?.id === id) {
        return extensionQueueRef.current.shift() ?? null;
      }
      extensionQueueRef.current = extensionQueueRef.current.filter(
        (prompt) => prompt.id !== id,
      );
      return current;
    });
  };

  const respondExtension = (payload: {
    value?: string;
    confirmed?: boolean;
  }) => {
    if (!extensionPrompt) {
      return;
    }
    bridge?.send({
      type: "extension_ui_response",
      id: extensionPrompt.id,
      ...payload,
    });
    nextExtensionPrompt();
  };

  const cancelExtension = () => {
    if (!extensionPrompt) {
      return;
    }
    bridge?.send({
      type: "extension_ui_response",
      id: extensionPrompt.id,
      cancelled: true,
    });
    nextExtensionPrompt();
  };

  const retryMessage = (messageId: string) => {
    const index = liveMessages.findIndex((message) => message.id === messageId);
    const previousUser = liveMessages
      .slice(0, Math.max(0, index))
      .reverse()
      .find((message) => message.role === "user");
    if (!previousUser) {
      notify("无法重试", "找不到上一条用户消息");
      return;
    }
    sendPrompt(previousUser.text, []);
  };

  const editMessage = (messageId: string, text: string) => {
    forkSession(text, "truncate", messageId);
  };

  const retryMessageRef = useRef<(messageId: string) => void>(() => {});
  const editMessageRef = useRef<(messageId: string, text: string) => void>(
    () => {},
  );
  retryMessageRef.current = retryMessage;
  editMessageRef.current = editMessage;
  const handleMessageRetry = useCallback(
    (messageId: string) => retryMessageRef.current(messageId),
    [],
  );
  const handleMessageEdit = useCallback(
    (messageId: string, text: string) =>
      editMessageRef.current(messageId, text),
    [],
  );

  const forkTargetTextRef = useRef("");
  const forkTargetMessageIdRef = useRef("");
  const forkTargetEntryIdRef = useRef("");
  const forkFallbackEditRef = useRef(false);
  const forkModeRef = useRef<"fork" | "truncate">("fork");

  const forkSession = (
    text = "",
    mode: "fork" | "truncate" = "fork",
    messageId = "",
  ) => {
    if (!isShell) {
      notify("分叉会话", "桌面端中可用");
      return;
    }
    forkModeRef.current = mode;
    forkTargetTextRef.current = text;
    forkTargetMessageIdRef.current = messageId;
    forkTargetEntryIdRef.current = "";
    forkFallbackEditRef.current = false;
    bridge?.send({
      id: `fork-list-${Date.now()}`,
      type: "get_fork_messages",
    });
    notify(
      mode === "truncate" ? "正在准备编辑" : "正在准备分叉",
      text
        ? "从这条消息继续"
        : "从最后一条用户消息开始",
    );
  };

  const cloneSession = () => {
    if (!isShell) {
      notify("克隆会话", "桌面端中可用");
      return;
    }
    bridge?.send({ id: `clone-${Date.now()}`, type: "clone" });
    notify("正在克隆会话", "会创建一个新的会话副本");
  };

  useEffect(() => {
    if (!isShell || !bridge?.getWorkspace) {
      return;
    }

    let cancelled = false;
    void bridge
      .getWorkspace()
      .then((result) => {
        if (cancelled || result?.error) {
          return;
        }
        if (result?.cwd) {
          setWorkspace(result.cwd);
        }
        if (Array.isArray(result?.recent)) {
          setRecentWorkspaces(result.recent);
        }
        if (result?.scratch) {
          setScratchWorkspace(result.scratch);
        }
      })
      .catch(() => {
        // Workspace discovery is optional; the UI can still use sessions.
      });

    return () => {
      cancelled = true;
    };
  }, [isShell, bridge]);

  useEffect(() => {
    if (!isShell || !bridge?.remoteStatus) {
      return;
    }
    let cancelled = false;
    void bridge
      .remoteStatus()
      .then((result) => {
        if (!cancelled && result) {
          setRemoteStatus(result);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isShell, bridge]);

  useEffect(() => {
    if (!bridge?.isShell || bridgeStarted.current) {
      return;
    }

    bridgeStarted.current = true;
    setPiStatus("connecting");

    bridge.onRecord((record: any) => {
      if (record.type === "response" && record.id) {
        const waiter = piResponseWaitersRef.current.get(record.id);
        if (waiter) {
          window.clearTimeout(waiter.timer);
          piResponseWaitersRef.current.delete(record.id);
          waiter.resolve(record);
        }
      }

      if (record.type === "queue_update") {
        const entries = buildQueueEntries(record.steering, record.followUp);
        setQueueItems(entries);
        setQueuedMessages(entries.length);
        queuedTextsRef.current = entries.map((entry) => entry.text);
        return;
      }

      if (record.type === "update_status") {
        setUpdateStatus(record.status);
        return;
      }

      if (record.type === "pi_update_status") {
        setPiUpdateStatus(record.status);
        return;
      }

      if (record.type === "sessions_changed") {
        refreshSessions();
        return;
      }

      if (record.type === "remote_status") {
        if (record.status) {
          setRemoteStatus(record.status);
        }
        return;
      }

      if (record.type === "workspace_changed") {
        if (record.cwd) {
          setWorkspace(String(record.cwd));
        }
        if (Array.isArray(record.recent)) {
          setRecentWorkspaces(record.recent);
        }
        return;
      }

      if (record.type === "bridge_status") {
        const status = record.status;
        setPiStatus(
          status === "ready"
            ? "ready"
            : status === "exited" || status === "error"
              ? "offline"
              : "connecting",
        );
        if (status === "ready") {
          bridge.send({
            id: `state-${Date.now()}`,
            type: "get_state",
          });
          bridge.send({
            id: `models-${Date.now()}`,
            type: "get_available_models",
          });
          requestMessages("messages");
        }
        return;
      }

      if (record.type === "bridge_log") {
        return;
      }

      if (record.type === "extension_ui_resolved") {
        resolveExtensionPrompt(String(record.id || ""));
        return;
      }

      if (record.type === "extension_ui_request") {
        const method = String(record.method || "");
        if (method === "notify") {
          notify(
            String(record.message || "Pi 扩展"),
            record.notifyType || "info",
          );
          return;
        }
        if (method === "setStatus") {
          const key = String(record.statusKey || "");
          if (key) {
            setExtensionStatuses((previous) => {
              const next = { ...previous };
              if (record.statusText) {
                next[key] = String(record.statusText);
              } else {
                delete next[key];
              }
              return next;
            });
          }
          return;
        }
        if (method === "setWidget") {
          const key = String(record.widgetKey || "");
          if (key) {
            setExtensionWidgets((previous) => {
              const next = { ...previous };
              if (
                Array.isArray(record.widgetLines) &&
                record.widgetLines.length > 0
              ) {
                next[key] = {
                  lines: record.widgetLines.map((line: unknown) =>
                    String(line),
                  ),
                  placement: record.widgetPlacement,
                };
              } else {
                delete next[key];
              }
              return next;
            });
          }
          return;
        }
        if (method === "setTitle") {
          document.title = String(record.title || "TesT");
          return;
        }
        if (method === "set_editor_text") {
          draftStore.update(String(record.text || ""));
          composerRef.current?.focus();
          return;
        }
        if (
          method === "select" ||
          method === "confirm" ||
          method === "input" ||
          method === "editor"
        ) {
          const prompt: ExtensionPrompt = {
            id: String(record.id || `ext-${Date.now()}`),
            method,
            title: record.title,
            message: record.message,
            placeholder: record.placeholder,
            options: Array.isArray(record.options)
              ? record.options.map((option: unknown) => String(option))
              : [],
            prefill: record.prefill,
          };
          setExtensionPrompt((current) => {
            if (current) {
              extensionQueueRef.current.push(prompt);
              return current;
            }
            return prompt;
          });
        }
        return;
      }

      if (record.type === "provider_saved") {
        if (record.error) {
          notify("添加渠道失败", record.error);
        } else {
          notify("渠道已添加", record.name || "models.json 已更新");
        }
        return;
      }

      if (record.type === "providers_cleared") {
        if (record.error) {
          notify("清空模型配置失败", record.error);
        } else {
          setAvailableModels([]);
          setModel(placeholderModel);
          notify("模型配置已撤销", "models.json 已清空");
        }
        return;
      }

      if (record.type === "pi_auth_status") {
        setAuthProviders(
          Array.isArray(record.providers) ? record.providers : [],
        );
        return;
      }

      if (record.type === "pi_login_opened") {
        if (record.error) {
          notify("打开 Pi 登录失败", record.error);
        } else if (record.alreadyOpen) {
          notify("Pi 登录窗口已打开", "请在那个窗口里完成登录");
        } else {
          notify(
            "Pi 登录窗口已打开",
            "已尝试输入 /login；完成后关闭该窗口",
          );
        }
        return;
      }

      if (record.type === "pi_login_closed") {
        setAuthProviders(
          Array.isArray(record.providers) ? record.providers : [],
        );
        const count = Array.isArray(record.providers)
          ? record.providers.length
          : 0;
        notify(
          count > 0 ? "Pi 登录完成" : "Pi 登录窗口已关闭",
          count > 0
            ? `已登录 ${record.providers.join(" · ")} · 正在刷新模型`
            : "没有检测到新的登录凭证",
        );
        bridge?.piAuthStatus?.();
        return;
      }

      if (record.type === "pi_import") {
        if (record.error) {
          notify("Pi 导入失败", record.error);
        } else {
          const details = [
            record.providers ? `${record.providers} 个渠道` : "",
            record.auth ? "登录凭证" : "",
            record.settings ? "默认设置" : "",
          ].filter(Boolean);
          notify(
            "已从 Pi 导入",
            details.join(" · ") || "Pi 配置已更新",
          );
        }
        return;
      }

      if (record.type === "response") {
        if (record.command === "get_fork_messages" && record.success) {
          const messages = Array.isArray(record.data?.messages)
            ? record.data.messages
            : [];
          const targetText = forkTargetTextRef.current;
          const targetMessageId = forkTargetMessageIdRef.current;
          const userMessageIds = liveMessagesRef.current
            .filter((message) => message.role === "user")
            .map((message) => message.id);
          const target = resolveForkTarget(
            messages as ForkMessage[],
            userMessageIds,
            { messageId: targetMessageId, text: targetText },
          );
          if (!target?.entryId) {
            notify(
              forkModeRef.current === "truncate" ? "无法编辑" : "无法分叉",
              "找不到可用的用户消息",
            );
            return;
          }
          forkTargetEntryIdRef.current = target.entryId;
          bridge.send({
            id:
              forkModeRef.current === "truncate"
                ? `tree-${Date.now()}`
                : `fork-${Date.now()}`,
            type:
              forkModeRef.current === "truncate"
                ? "navigate_tree"
                : "fork",
            entryId: target.entryId,
          });
          return;
        }

        if (
          record.command === "fork" ||
          record.command === "navigate_tree"
        ) {
          if (
            record.command === "navigate_tree" &&
            !record.success &&
            forkTargetEntryIdRef.current &&
            /unknown command/i.test(String(record.error || ""))
          ) {
            forkFallbackEditRef.current = true;
            bridge.send({
              id: `fork-fallback-${Date.now()}`,
              type: "fork",
              entryId: forkTargetEntryIdRef.current,
            });
            return;
          }
          if (!record.success || record.data?.cancelled) {
            if (!record.success) {
              notify(
                record.command === "navigate_tree" ||
                  forkFallbackEditRef.current
                  ? "编辑失败"
                  : "分叉失败",
                record.error || "Pi 未返回原因",
              );
            }
            forkTargetMessageIdRef.current = "";
            forkTargetEntryIdRef.current = "";
            forkFallbackEditRef.current = false;
            return;
          }
          const fallbackEdit = forkFallbackEditRef.current;
          const text = String(record.data?.text || "").trim();
          if (text) {
            draftStore.update(text);
          }
          forkTargetTextRef.current = "";
          forkTargetMessageIdRef.current = "";
          forkTargetEntryIdRef.current = "";
          forkFallbackEditRef.current = false;
          forkModeRef.current = "fork";
          sessionLoadSeq.current += 1;
          setLiveMessages([]);
          setLiveTools([]);
          setLiveThinking([]);
          setMessagesLoading(true);
          setHistoryLoading(false);
          stickToBottomRef.current = true;
          setContextTokens(0);
          resetStream();
          bridge.send({ id: `state-${Date.now()}`, type: "get_state" });
          requestMessages("messages");
          requestStats();
          refreshSessions();
          if (text) {
            composerRef.current?.focus();
          }
          notify(
            record.command === "navigate_tree"
              ? "已回到该消息"
              : fallbackEdit
                ? "已创建编辑分支"
                : "已分叉会话",
            record.command === "navigate_tree"
              ? "后续消息已从当前分支移除，可修改后重新发送"
              : fallbackEdit
                ? "当前 Pi 不支持原地截断，原文已载入输入框"
                : "历史保留到所选消息",
          );
          return;
        }

        if (record.command === "clone") {
          if (!record.success || record.data?.cancelled) {
            if (!record.success) {
              notify("克隆失败", record.error || "Pi 未返回原因");
            }
            return;
          }
          sessionLoadSeq.current += 1;
          setLiveMessages([]);
          setLiveTools([]);
          setLiveThinking([]);
          setMessagesLoading(true);
          setHistoryLoading(false);
          stickToBottomRef.current = true;
          setContextTokens(0);
          resetStream();
          bridge.send({ id: `state-${Date.now()}`, type: "get_state" });
          requestMessages("messages");
          requestStats();
          refreshSessions();
          notify("会话已克隆", "已切到新的会话副本");
          return;
        }

        if (
          record.command === "get_available_thinking_levels" &&
          record.success
        ) {
          const levels = Array.isArray(record.data?.levels)
            ? record.data.levels.filter(
                (level: unknown) => typeof level === "string",
              )
            : [];
          if (levels.length > 0) {
            setThinkingLevels(levels);
          }
          return;
        }

        if (record.command === "get_commands" && record.success) {
          setPiCommands(
            Array.isArray(record.data?.commands)
              ? record.data.commands
              : [],
          );
          return;
        }

        if (record.command === "compact") {
          setCompacting(false);
          if (record.success) {
            notify("上下文已压缩", "较早的消息已摘要");
            requestStats();
            bridge.send({ id: `state-${Date.now()}`, type: "get_state" });
          } else {
            notify("压缩失败", record.error || "Pi 未返回原因");
          }
          return;
        }

        if (record.command === "get_state" && record.success) {
          setPiStatus("ready");
          setQueuedMessages(
            Number(record.data?.pendingMessageCount) || 0,
          );
          if (record.data?.sessionFile) {
            setActiveSessionPath(String(record.data.sessionFile));
          }
          if (record.data?.sessionName) {
            setSessionName(record.data.sessionName);
          }
          if (
            record.data?.model?.id &&
            record.data.model.id !== "unknown"
          ) {
            setModel(fromPiModel(record.data.model));
            if (record.data.thinkingLevel) {
              setReasoning(record.data.thinkingLevel);
            }
          }
          requestStats();
          refreshSessions();
          return;
        }

        if (record.command === "get_available_models" && record.success) {
          const list: Model[] = (record.data?.models ?? [])
            .map(fromPiModel)
            .filter((item: Model) => Boolean(item.id));
          if (list.length) {
            setAvailableModels(list);
            setModel(
              (current) =>
                list.find((item) => item.id === current.id) || list[0],
            );
          }
          return;
        }

        if (record.command === "get_messages") {
          if (
            record.id &&
            record.id !== latestMessagesRequestId.current
          ) {
            return;
          }
          latestMessagesRequestId.current = "";
        }

        if (record.command === "get_messages" && !record.success) {
          setMessagesLoading(false);
          setHistoryLoading(false);
          notify("载入会话失败", record.error || "Pi 未返回原因");
          return;
        }

        if (record.command === "get_messages" && record.success) {
          const messages: {
            id: string;
            role: "user" | "assistant";
            text: string;
          }[] = [];
          const historyTools: LiveTool[] = [];
          const historyThinking: LiveThinking[] = [];
          const historyStartedAt = Date.now();
          let historyOrder = 0;
          let currentHistoryTurnId = "";
          const nextHistoryTime = () => historyStartedAt + historyOrder++;
          const rawMessages = Array.isArray(record.data?.messages)
            ? record.data.messages
            : [];
          const visibleMessages = rawMessages;

          visibleMessages.forEach(
            (message: any, index: number) => {
              if (message.role === "toolResult") {
                const id = String(
                  message.toolCallId || `history-tool-${index}`,
                );
                const existing = historyTools.find((tool) => tool.id === id);
                const result = {
                  content: message.content,
                  isError: Boolean(message.isError),
                };
                if (existing) {
                  existing.result = result;
                  existing.state = message.isError ? "error" : "done";
                } else {
                  historyTools.push({
                    id,
                    name: String(message.toolName || "tool"),
                    turnId: currentHistoryTurnId || undefined,
                    result,
                    state: message.isError ? "error" : "done",
                    startedAt: nextHistoryTime(),
                  });
                }
                return;
              }

              if (message.role === "assistant") {
                const content = Array.isArray(message.content)
                  ? message.content
                  : [];
                for (const block of content) {
                  if (block?.type === "thinking") {
                    const thinkingText = String(block.thinking || "").trim();
                    if (thinkingText) {
                      historyThinking.push({
                        id: `history-thinking-${index}-${historyThinking.length}`,
                        text: thinkingText,
                        turnId: currentHistoryTurnId || undefined,
                        state: "done",
                        startedAt: nextHistoryTime(),
                      });
                    }
                    continue;
                  }
                  if (block?.type !== "toolCall") {
                    continue;
                  }
                  const id = String(
                    block.id || `history-tool-${historyTools.length}`,
                  );
                  if (!historyTools.some((tool) => tool.id === id)) {
                    historyTools.push({
                      id,
                      name: String(block.name || "tool"),
                      turnId: currentHistoryTurnId || undefined,
                      args: block.arguments,
                      state: "done",
                      startedAt: nextHistoryTime(),
                    });
                  }
                }
              }

              if (message.role !== "user" && message.role !== "assistant") {
                return;
              }

              const text = extractPiText(message);
              if (!text) {
                return;
              }
              messages.push({
                id: message.id || `message-${index}`,
                role: message.role,
                text,
              });
              if (message.role === "user") {
                currentHistoryTurnId = message.id || `message-${index}`;
              }
            },
          );
          const path = activePathRef.current;
          const fallback = path ? historyCacheRef.current.get(path) : undefined;
          const nextMessages = messages.length ? messages : fallback || [];
          setLiveMessages(nextMessages);
          if (path && nextMessages.length) {
            rememberHistory(path, nextMessages);
          }
          setLiveTools(historyTools);
          setLiveThinking(historyThinking);
          setMessagesLoading(false);
          setHistoryLoading(false);
          requestStats();
          return;
        }

        if (record.command === "get_session_stats" && record.success) {
          setSessionStats(record.data as SessionStats);
          return;
        }

        if (record.command === "switch_session") {
          if (
            record.id &&
            record.id !== latestSwitchRequestId.current
          ) {
            return;
          }
          latestSwitchRequestId.current = "";
          if (!record.success || record.data?.cancelled) {
            const pending = pendingSwitchRef.current;
            pendingSwitchRef.current = null;
            if (pending?.previousPath) {
              sessionLoadSeq.current += 1;
              const previous = historyCacheRef.current.get(
                pending.previousPath,
              );
              setActiveSessionPath(pending.previousPath);
              setLiveMessages(previous || []);
              requestMessages("messages-restore");
            } else {
              setActiveSessionPath("");
              setLiveMessages([]);
            }
            setLiveTools([]);
            setLiveThinking([]);
            setHistoryLoading(false);
            setMessagesLoading(Boolean(pending?.previousPath));
            notify(
              "切换会话失败",
              record.error || "Pi 取消了这次切换",
            );
            return;
          }
          pendingSwitchRef.current = null;
          bridge?.send({
            id: `state-${Date.now()}`,
            type: "get_state",
          });
          requestMessages("messages");
          requestStats();
          refreshSessions();
          return;
        }

        if (record.command === "new_session" && record.success) {
          setMessagesLoading(false);
          setHistoryLoading(false);
          bridge?.send({
            id: `state-${Date.now()}`,
            type: "get_state",
          });
          requestStats();
          refreshSessions();
          return;
        }

        if (record.command === "set_session_name") {
          if (!record.success) {
            notify("重命名失败", record.error);
          } else {
            refreshSessions();
          }
          return;
        }

        if (record.command === "set_model") {
          if (!record.success) {
            notify("模型切换失败", record.error);
          } else {
            bridge?.send({
              id: `levels-${Date.now()}`,
              type: "get_available_thinking_levels",
            });
          }
        }
        if (record.command === "prompt" && !record.success) {
          setPending(false);
          resumeAfterSettleRef.current = false;
          queuedTextsRef.current = [];
          setQueuedMessages(0);
          setQueueItems([]);
          notify("Pi 拒绝了消息", record.error || "请先配置模型");
        }
        return;
      }

      if (record.type === "agent_start") {
        setPending(true);
        resetStream();
        return;
      }

      if (record.type === "tool_execution_start") {
        const id = String(record.toolCallId || `tool-${Date.now()}`);
        setLiveTools((previous) => [
          ...previous.filter((tool) => tool.id !== id),
          {
            id,
            name: String(record.toolName || "tool"),
            turnId: currentTurnMessageIdRef.current || undefined,
            args: record.args,
            state: "running",
            startedAt: Date.now(),
          },
        ]);
        return;
      }

      if (record.type === "tool_execution_update") {
        const id = String(record.toolCallId || "");
        if (!id) {
          return;
        }
        setLiveTools((previous) =>
          previous.map((tool) =>
            tool.id === id
              ? { ...tool, partial: record.partialResult }
              : tool,
          ),
        );
        return;
      }

      if (record.type === "tool_execution_end") {
        const id = String(record.toolCallId || "");
        if (!id) {
          return;
        }
        setLiveTools((previous) =>
          previous.map((tool) =>
            tool.id === id
              ? {
                  ...tool,
                  state: record.isError ? "error" : "done",
                  result: record.result,
                  durationMs:
                    typeof record.durationMs === "number"
                      ? record.durationMs
                      : Date.now() - tool.startedAt,
                }
              : tool,
          ),
        );
        requestStats();
        return;
      }

      if (record.type === "message_update") {
        const update = record.assistantMessageEvent;
        if (update?.type === "thinking_delta") {
          scheduleReasoning(update.delta || "");
        } else if (update?.type === "text_delta" && streamingRef.current) {
          scheduleStream(update.delta || "");
        }
        return;
      }

      if (record.type === "message_end" && record.message?.role === "assistant") {
        const usage = record.message.usage;
        if (usage) {
          const used = Number(
            usage.totalTokens ??
              (Number(usage.input) || 0) +
                (Number(usage.output) || 0) +
                (Number(usage.cacheRead) || 0) +
                (Number(usage.cacheWrite) || 0),
          );
          if (Number.isFinite(used) && used > 0) {
            setContextTokens(used);
          }
        }
        const thinkingBlocks = extractPiThinking(record.message);
        if (thinkingBlocks.length > 0) {
          const startedAt = thinkingStartedAtRef.current || Date.now();
          setLiveThinking((previous) => [
            ...previous,
            ...thinkingBlocks.map((text, index) => ({
              id: `thinking-${Date.now()}-${index}`,
              text,
              turnId: currentTurnMessageIdRef.current || undefined,
              state: "done" as const,
              startedAt: startedAt + index,
            })),
          ]);
        }
        const text = extractPiText(record.message);
        if (text) {
          setLiveMessages((previous) => [
            ...previous,
            {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              text,
            },
          ]);
          requestStats();
        } else if (
          record.message.stopReason === "error" &&
          record.message.errorMessage
        ) {
          const errorText = String(record.message.errorMessage);
          setLiveMessages((previous) => [
            ...previous,
            {
              id: `error-${Date.now()}`,
              role: "assistant",
              text: `请求失败：${errorText.slice(0, 320)}`,
            },
          ]);
          notify("Pi 请求失败", "模型可能未开通，请检查设置");
          setPending(false);
        }
        resetStream();
        return;
      }

      if (
        record.type === "message_start" &&
        record.message?.role === "user"
      ) {
        const queuedText = queuedTextsRef.current.shift();
        if (queuedText) {
          const userId = `user-queued-${Date.now()}`;
          currentTurnMessageIdRef.current = userId;
          setLiveMessages((previous) => [
            ...previous,
            {
              id: userId,
              role: "user",
              text: queuedText,
            },
          ]);
          setQueuedMessages((count) => Math.max(0, count - 1));
        }
        return;
      }

      if (record.type === "auto_retry_start") {
        notify("模型请求失败", `第 ${record.attempt} 次重试…`);
        return;
      }

      if (record.type === "agent_settled") {
        setPending(false);
        resetStream();
        setInterrupted(record.aborted === true);
        queuedTextsRef.current = [];
        setQueuedMessages(0);
        setQueueItems([]);
        requestStats();
        refreshSessions();
        if (resumeAfterSettleRef.current) {
          window.setTimeout(() => resumePiRef.current(), 0);
        }
      }
    });

    bridge.ready();
    bridge.piAuthStatus?.();
    bridge.setPlanMode?.(planMode);
    bridge.send({
      id: "commands-boot",
      type: "get_commands",
    });
    bridge.send({
      id: "levels-boot",
      type: "get_available_thinking_levels",
    });
    bridge.send({
      id: "auto-compact-boot",
      type: "set_auto_compaction",
      enabled: autoCompact,
    });
    if (!restoreSession) {
      bridge.send({
        id: `fresh-boot-${Date.now()}`,
        type: "new_session",
      });
    }
    void bridge.updateStatus?.().then((status) => {
      if (status) {
        setUpdateStatus(status);
      }
    });
    bridge.send({ id: "state-boot", type: "get_state" });
    bridge.send({ id: "models-boot", type: "get_available_models" });
    requestMessages("messages-boot");
    refreshSessions();
    refreshExtensions();
    requestStats();
  }, [bridge]);

  useEffect(() => {
    if (sheetMode === "extensions") {
      refreshExtensions();
    }
  }, [sheetMode]);

  useEffect(() => {
    writeSessionTagStore(sessionTagStore);
  }, [sessionTagStore]);

  useEffect(() => {
    writeTurnBookmarkStore(turnBookmarkStore);
  }, [turnBookmarkStore]);

  const sessionTagCounts = useMemo(
    () => sessionTagUsage(sessionTagStore),
    [sessionTagStore],
  );
  const filterableSessionTags = useMemo(
    () =>
      sessionTagStore.tags.filter((tag) => (sessionTagCounts[tag.id] ?? 0) > 0),
    [sessionTagCounts, sessionTagStore.tags],
  );

  useEffect(() => {
    if (
      activeSessionTag &&
      !filterableSessionTags.some((tag) => tag.id === activeSessionTag)
    ) {
      setActiveSessionTag(null);
    }
  }, [activeSessionTag, filterableSessionTags]);

  const sessionTree = useMemo(
    () =>
      isShell && bridge?.listSessions
        ? buildSessionTree(
            sessionInfos.filter(
              (info) =>
                !hiddenProjects.some((project) =>
                  pathWithinProject(info.cwd, project),
                ) &&
                (!activeSessionTag ||
                  sessionHasTag(sessionTagStore, info.path, activeSessionTag)),
            ),
          )
        : tree,
    [
      isShell,
      bridge?.listSessions,
      sessionInfos,
      hiddenProjects,
      activeSessionTag,
      sessionTagStore,
    ],
  );
  const flatSessions = useMemo(
    () => flattenSessions(sessionTree),
    [sessionTree],
  );
  const projectTreeIds = useMemo(
    () => (sessionTree.children ?? []).map((node) => `/${node.name}`),
    [sessionTree],
  );
  const allProjectsCollapsed =
    projectTreeIds.length > 0 &&
    projectTreeIds.every((id) => expanded[id] === false);
  const toggleAllProjects = () => {
    const nextOpen = allProjectsCollapsed;
    setExpanded((previous) => {
      const next = { ...previous };
      for (const id of projectTreeIds) {
        next[id] = nextOpen;
      }
      return next;
    });
  };
  const pinnedSessions = useMemo(() => {
    const result: Session[] = [];
    for (const path of pinnedPaths) {
      const session = flatSessions.find((item) => item.path === path);
      if (session) {
        result.push(session);
      }
    }
    return result;
  }, [pinnedPaths, flatSessions]);
  const activeSession =
    (activeSessionPath
      ? flatSessions.find((session) => session.path === activeSessionPath)
      : undefined) ??
    (workspace
      ? flatSessions.find((session) =>
          sameWorkspacePath(session.cwd, workspace),
        )
      : flatSessions[active]) ??
    (workspace ? undefined : flatSessions[0]);
  const workspaceCwd =
    activeSession?.cwd ||
    workspace ||
    (isShell ? "选择工作目录" : "未选择工作目录");
  const scratchActive = sameWorkspacePath(
    workspaceCwd,
    scratchWorkspace,
  );
  const draftKey = activeSessionPath
    ? `session:${activeSessionPath}`
    : `workspace:${workspace || "none"}`;
  const skipDraftLoad =
    params.has("slash") || params.has("mention") || params.has("find");
  const skipDraftSave = params.has("slash") || params.has("mention");

  useEffect(() => {
    if (!isShell || flatSessions.length === 0) {
      return;
    }

    let cancelled = false;
    let idleHandle: number | null = null;
    const timer = window.setTimeout(() => {
      const run = () => {
        if (cancelled) return;
        const activeIndex = flatSessions.findIndex(
          (session) => session.path === activeSessionPath,
        );
        const candidates = [
          flatSessions[activeIndex - 1],
          flatSessions[activeIndex + 1],
          ...flatSessions.slice(0, 3),
        ].filter(Boolean) as Session[];
        for (const session of candidates) {
          prefetchSessionRef.current(session);
        }
      };
      const idle = (
        window as Window & {
          requestIdleCallback?: (
            callback: () => void,
            options?: { timeout: number },
          ) => number;
        }
      ).requestIdleCallback;
      idleHandle = idle ? idle(run, { timeout: 1200 }) : window.setTimeout(run, 0);
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      const cancelIdle = (
        window as Window & {
          cancelIdleCallback?: (handle: number) => void;
        }
      ).cancelIdleCallback;
      if (idleHandle !== null) {
        if (cancelIdle) cancelIdle(idleHandle);
        else window.clearTimeout(idleHandle);
      }
    };
  }, [activeSessionPath, flatSessions, isShell]);

  useEffect(() => {
    const key = `tesT.draft.${draftKey}`;
    if (!skipDraftLoad) {
      draftStore.update(localStorage.getItem(key) || "");
    }
    if (skipDraftSave) {
      return;
    }

    let timer: number | null = null;
    const save = () => {
      const text = draftStore.getSnapshot();
      if (text) {
        localStorage.setItem(key, text);
      } else {
        localStorage.removeItem(key);
      }
    };
    const unsubscribe = draftStore.subscribe(() => {
      if (timer !== null) {
        window.clearTimeout(timer);
      }
      timer = window.setTimeout(() => {
        timer = null;
        save();
      }, 350);
    });

    return () => {
      unsubscribe();
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
        save();
      }
    };
  }, [draftKey, draftStore, skipDraftLoad, skipDraftSave]);

  useEffect(() => {
    const key = `${ANNOTATION_STORAGE_PREFIX}${draftKey}`;
    annotationHydratedKeyRef.current = key;
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      setAnnotations(
        Array.isArray(value)
          ? value.filter(
              (item): item is DraftAnnotation =>
                Boolean(item) &&
                typeof item.id === "string" &&
                typeof item.quote === "string" &&
                typeof item.note === "string",
            )
          : [],
      );
    } catch {
      setAnnotations([]);
    }
  }, [draftKey]);

  useEffect(() => {
    const key = `${ANNOTATION_STORAGE_PREFIX}${draftKey}`;
    if (annotationHydratedKeyRef.current !== key) {
      return;
    }
    const timer = window.setTimeout(() => {
      if (annotations.length) {
        localStorage.setItem(key, JSON.stringify(annotations));
      } else {
        localStorage.removeItem(key);
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [annotations, draftKey]);

  useEffect(() => {
    if (!activeSessionPath) {
      pendingScrollRestoreRef.current = null;
      return;
    }
    const entry = scrollMemoryRef.current[activeSessionPath];
    pendingScrollRestoreRef.current = entry
      ? { path: activeSessionPath, entry }
      : null;
    if (entry) {
      stickToBottomRef.current = entry.atBottom;
    }
  }, [activeSessionPath]);

  useEffect(() => {
    const pending = pendingScrollRestoreRef.current;
    if (
      !pending ||
      pending.path !== activeSessionPath ||
      messagesLoading ||
      historyLoading
    ) {
      return;
    }

    const container = messagesRef.current;
    if (!container) {
      return;
    }

    if (pending.entry.atBottom) {
      pendingScrollRestoreRef.current = null;
      stickToBottomRef.current = true;
      const frame = window.requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
      return () => window.cancelAnimationFrame(frame);
    }

    let target: HTMLElement | null = null;
    if (pending.entry.messageId) {
      const sourceIndex = liveMessages.findIndex(
        (message) => message.id === pending.entry.messageId,
      );
      const required = sourceIndex >= 0 ? liveMessages.length - sourceIndex + 12 : 0;
      if (required > messageRenderLimit) {
        setMessageRenderLimit(required);
        return;
      }
      target = Array.from(
        container.querySelectorAll<HTMLElement>(".message[data-msg-id]"),
      ).find((element) => element.dataset.msgId === pending.entry.messageId) ?? null;
    }

    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        const maxTop = Math.max(
          0,
          container.scrollHeight - container.clientHeight,
        );
        let nextTop = pending.entry.top;
        if (target) {
          const containerRect = container.getBoundingClientRect();
          const targetRect = target.getBoundingClientRect();
          nextTop =
            container.scrollTop +
            targetRect.top -
            containerRect.top -
            pending.entry.offset;
        }
        stickToBottomRef.current = false;
        container.scrollTop = Math.max(0, Math.min(maxTop, nextTop));
        setShowScrollTop(container.scrollTop > 360);
        setShowScrollLatest(maxTop - container.scrollTop >= 72);
        pendingScrollRestoreRef.current = null;
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
    };
  }, [
    activeSessionPath,
    historyLoading,
    liveMessages,
    messageRenderLimit,
    messagesLoading,
  ]);

  useEffect(() => {
    if (!activeSession?.path) {
      return;
    }
    const path = activeSession.path;
    const title = activeSession.title;
    setSessionTabs((previous) => {
      const existing = previous.find(
        (tab) => tab.path === path,
      );
      if (existing) {
        if (existing.title === title) {
          return previous;
        }
        return previous.map((tab) =>
          tab.path === path
            ? { ...tab, title }
            : tab,
        );
      }
      return [
        ...previous,
        { path, title },
      ].slice(-8);
    });
  }, [activeSession?.path, activeSession?.title]);

  const {
    branch,
    setBranch,
    gitInfo,
    setGitInfo,
    changes,
    diffOpen,
    setDiffOpen,
    diffFile,
    setDiffFile,
    diffPatch,
    setDiffPatch,
    diffSource,
    diffLoading,
    staging,
    stagingHunk,
    revertingHunk,
    revertingFile,
    commitOpen,
    setCommitOpen,
    committing,
    refreshChanges,
    fetchDiff,
    openDiff,
    stageHunk,
    revertHunk,
    revertFile,
    stageFile,
    unstageFile,
    commitChanges,
    changeBranch,
  } = useGitController({
    isShell,
    bridge,
    cwd: activeSession?.cwd || workspace,
    notify,
    refreshKey: `${sessionStats?.totalMessages ?? 0}:${
      sessionStats?.toolCalls ?? 0
    }`,
  });

  const toggleFolder = (path: string) => {
    setExpanded((prev) => ({ ...prev, [path]: !(prev[path] ?? true) }));
  };

  const toggleContext = () => {
    setSheetMode((value) => (value === "context" ? null : "context"));
  };

  const applyModel = (next: Model) => {
    setModel(next);
    if (isShell && next.id) {
      bridge?.send({
        type: "set_model",
        provider: next.provider,
        modelId: next.id,
      });
    }
  };

  const selectCatalogModel = (item: CatalogModel) => {
    const context = item.contextWindow || 0;
    const contextLabel =
      context >= 1_000_000
        ? `${Math.round(context / 1_000_000)}M`
        : context >= 1_000
          ? `${Math.round(context / 1_000)}k`
          : context > 0
            ? String(context)
            : "—";
    applyModel({
      id: item.id,
      label: item.name,
      short: item.name,
      provider: item.provider,
      ctx: contextLabel,
      contextWindow: context || undefined,
    });
  };

  const applyReasoning = (level: string) => {
    setReasoning(level);
    if (isShell) {
      bridge?.send({ type: "set_thinking_level", level });
    }
  };

  const importPi = () => {
    if (isShell) {
      bridge?.importPi();
    } else {
      notify("Pi 导入", "桌面壳会读取 ~/.pi/agent");
    }
  };

  const refreshModels = () => {
    if (isShell) {
      bridge?.send({
        id: `models-refresh-${Date.now()}`,
        type: "get_available_models",
      });
      notify("正在刷新 Pi 模型接口", "get_available_models");
    } else {
      notify("Pi 模型接口", "桌面端中可用");
    }
  };

  const openPiLogin = () => {
    if (isShell && bridge?.nativeLogin) {
      setNativeLoginOpen(true);
      return;
    }

    if (isShell) {
      bridge?.openPiLogin?.();
      notify("正在打开 Pi 登录窗口", "原版 /login · 完成后关闭窗口");
    } else {
      notify("Pi 登录", "桌面端中可用");
    }
  };

  const refreshAuth = () => {
    if (isShell) {
      bridge?.piAuthStatus?.();
      notify("正在检查 Pi 登录状态", "auth.json");
    } else {
      notify("Pi 登录状态", "桌面端中可用");
    }
  };

  const refreshSessions = () => {
    if (!isShell || !bridge?.listSessions) {
      return;
    }
    if (sessionRefreshTimer.current !== null) {
      return;
    }

    sessionRefreshTimer.current = window.setTimeout(() => {
      sessionRefreshTimer.current = null;
      void bridge
        ?.listSessions?.()
        .then((result) => {
          if (Array.isArray(result?.sessions)) {
            setSessionInfos(result.sessions);
          }
        })
        .catch(() => {});
    }, 240);
  };

  const refreshExtensions = () => {
    if (!bridge?.listExtensions) {
      return;
    }

    void bridge
      .listExtensions()
      .then((result) => {
        setExtensionData({
          skills: (result.skills ?? []).map((item) => ({
            name: item.name,
            desc: item.desc,
            enabled: item.enabled,
            kind: "技能" as const,
            scope: item.scope,
            readonly: item.readonly,
            path: item.path,
            package: item.package,
            source: item.source,
            version: item.version,
            installed: item.installed,
            packageIndex: item.packageIndex,
            resources: item.resources,
          })),
          extensions: (result.extensions ?? []).map((item) => ({
            name: item.name,
            desc: item.desc,
            enabled: item.enabled,
            kind: "扩展" as const,
            scope: item.scope,
            readonly: item.readonly,
            path: item.path,
            package: item.package,
            source: item.source,
            version: item.version,
            installed: item.installed,
            packageIndex: item.packageIndex,
            resources: item.resources,
          })),
        });
        setExtensionProject(result.project ?? null);
        bridge.send({
          id: `commands-${Date.now()}`,
          type: "get_commands",
        });
      })
      .catch(() => {});
  };

  const extensionKind = (item: Extension) =>
    item.kind === "技能" ? ("skill" as const) : ("extension" as const);

  const toggleExtension = (item: Extension) => {
    if (item.readonly) {
      return;
    }
    const request = bridge?.toggleExtension?.({
      kind: extensionKind(item),
      name: item.name,
      enabled: !item.enabled,
      package: item.package,
      source: item.source,
      scope: item.scope,
    });
    request?.then((result) => {
        if (result?.error) {
          notify("切换失败", result.error);
        }
        refreshExtensions();
      });
  };

  const removeExtension = (item: Extension) => {
    if (item.readonly) {
      return;
    }
    const request = bridge?.removeExtension?.({
      kind: extensionKind(item),
      name: item.name,
      package: item.package,
      source: item.source,
      scope: item.scope,
    });
    request?.then((result) => {
        if (result?.error) {
          notify("删除失败", result.error);
        } else {
          notify("已删除", item.name);
        }
        refreshExtensions();
      });
  };

  const installExtension = (
    kind: "skill" | "extension",
    file: File,
  ) => {
    const source = bridge?.getPathForFile?.(file);
    if (!source) {
      notify("无法读取路径", "请使用桌面端拖入文件");
      return;
    }

    const request = bridge?.installExtension?.({
      kind,
      path: source,
    });
    request?.then((result) => {
        if (result?.error) {
          notify("安装失败", result.error);
        } else {
          notify("安装完成", result.name || file.name);
        }
        refreshExtensions();
      });
  };

  const installPackage = (
    source: string,
  ): Promise<PackageInstallOutcome> => {
    const trimmed = source.trim();
    if (!trimmed) {
      return Promise.resolve({
        ok: false,
        error: "请输入要安装的包名或安装源。",
      });
    }
    const request = bridge?.installPackage?.({ source: trimmed });
    if (!request) {
      notify("无法安装", "当前环境不支持 package 安装");
      return Promise.resolve({
        ok: false,
        error: "当前环境不支持 Pi 包安装。",
      });
    }
    return request.then((result) => {
      if (result?.error) {
        const message = String(result.error);
        notify("安装失败", message.split(/\r?\n/)[0]);
        return { ok: false, error: message };
      }
      notify("安装完成", result.note || result.source || trimmed);
      refreshExtensions();
      return {
        ok: true,
        source: result.source || trimmed,
        note: result.note,
      };
    }).catch((error) => {
      const message = String(error);
      notify("安装失败", message.split(/\r?\n/)[0]);
      return { ok: false, error: message };
    });
  };

  const openExtensionsFolder = (
    kind: "skill" | "extension",
    scope: "global" | "project" = "global",
  ) => {
    void bridge?.openExtensionsFolder?.({ kind, scope });
  };

  const trustProject = () => {
    const request = bridge?.trustWorkspace?.();
    request?.then((result) => {
      if (result?.error) {
        notify("信任项目失败", result.error);
        return;
      }
      notify("已信任当前项目", "Pi 正在重启并加载项目技能 / 扩展");
      setExtensionProject((previous) =>
        previous ? { ...previous, trusted: true } : previous,
      );
      refreshExtensions();
    });
  };

  const checkUpdate = () => {
    const request = bridge?.checkUpdate?.();
    request?.then((result) => {
      if (result?.error) {
        notify("检查更新失败", result.error);
      }
    });
  };

  const downloadUpdate = () => {
    const request = bridge?.downloadUpdate?.();
    request?.then((result) => {
      if (result?.error) {
        notify("下载更新失败", result.error);
      }
    });
  };

  const installUpdate = () => {
    const request = bridge?.installUpdate?.();
    request?.then((result) => {
      if (result?.error) {
        notify("安装更新失败", result.error);
      }
    });
  };

  const saveUpdateFeed = (url: string) => {
    const request = bridge?.saveUpdateFeed?.({ feedUrl: url });
    request?.then((result) => {
      if (result?.error) {
        notify("保存更新源失败", result.error);
        return;
      }
      if (result?.status) {
        setUpdateStatus(result.status as UpdateStatus);
      }
      notify("更新源已保存", url);
    });
  };

  const clearUpdateFeed = () => {
    const request = bridge?.clearUpdateFeed?.();
    request?.then((result) => {
      if (result?.error) {
        notify("清除更新源失败", result.error);
        return;
      }
      if (result?.status) {
        setUpdateStatus(result.status as UpdateStatus);
      }
      notify("更新源已清除");
    });
  };

  const checkPiUpdate = () => {
    const request = bridge?.checkPiUpdate?.();
    request?.then((result) => {
      if (result?.error) {
        notify("Pi 更新检查失败", result.error);
      }
    });
  };

  const installPiUpdate = () => {
    const request = bridge?.installPiUpdate?.();
    request?.then((result) => {
      if (result?.rolledBack) {
        notify(
          "Pi 内核已自动回退",
          result.error || `已恢复到 ${result.currentVersion || "上一版内核"}`,
        );
        return;
      }
      if (result?.error) {
        notify("Pi 内核更新失败", result.error);
        return;
      }
      notify(
        "Pi 内核已更新",
        result?.version ? `v${result.version} · 已重启内核` : "已重启内核",
      );
    });
  };

  const restorePiKernel = () => {
    const request = bridge?.restorePiKernel?.();
    request?.then((result) => {
      if (result?.error) {
        notify("恢复内置内核失败", result.error);
        return;
      }
      notify("已恢复内置 Pi 内核", "内核已重启");
    });
  };

  const startRemote = () => {
    const request = bridge?.startRemote?.();
    request?.then((result) => {
      if (result?.error) {
        notify("启动远程访问失败", result.error);
        return;
      }
      if (result) {
        setRemoteStatus(result);
      }
      notify("手机远程已开启", "同一 Wi-Fi 下扫码使用");
    });
  };

  const stopRemote = () => {
    const request = bridge?.stopRemote?.();
    request?.then((result) => {
      if (result) {
        setRemoteStatus(result);
      }
      if (result?.error) {
        notify("停止远程访问失败", result.error);
        return;
      }
      notify("手机远程已关闭", "远程令牌已失效");
    });
  };

  const refreshRemoteToken = () => {
    const request = bridge?.refreshRemoteToken?.();
    request?.then((result) => {
      if (result?.error) {
        notify("刷新令牌失败", result.error);
        return;
      }
      if (result) {
        setRemoteStatus(result);
      }
      notify("远程令牌已刷新", "旧二维码已失效，请重新扫码");
    });
  };

  const startRemoteTunnel = () => {
    const request = bridge?.startRemoteTunnel?.();
    request?.then((result) => {
      if (result?.error) {
        notify("公网隧道启动失败", result.error);
        return;
      }
      if (result) {
        setRemoteStatus(result);
      }
      notify("公网访问已开启", "现在可以在任何地方扫码使用");
    });
  };

  const stopRemoteTunnel = () => {
    const request = bridge?.stopRemoteTunnel?.();
    request?.then((result) => {
      if (result?.error) {
        notify("关闭公网隧道失败", result.error);
        return;
      }
      if (result) {
        setRemoteStatus(result);
      }
      notify("公网访问已关闭", "局域网访问仍然可用");
    });
  };

  const requestStats = () => {
    if (isShell) {
      bridge?.send({
        id: `stats-${Date.now()}`,
        type: "get_session_stats",
      });
    }
  };

  const rememberTab = (session: Session) => {
    if (!session.path) {
      return;
    }
    setSessionTabs((previous) => {
      const existing = previous.find((tab) => tab.path === session.path);
      if (existing) {
        if (existing.title === session.title) {
          return previous;
        }
        return previous.map((tab) =>
          tab.path === session.path
            ? { ...tab, title: session.title }
            : tab,
        );
      }
      return [
        ...previous,
        { path: session.path!, title: session.title },
      ].slice(-8);
    });
  };

  const selectSession = (session: Session) => {
    if (session.path) {
      if (session.path === activeSessionPath) {
        return;
      }
      const path = session.path;
      rememberCurrentScroll(activeSessionPath);
      const savedScroll = scrollMemoryRef.current[path];
      const seq = ++sessionLoadSeq.current;
      const switchId = `switch-session-${Date.now()}-${seq}`;
      const cached = historyCacheRef.current.get(path);
      latestSwitchRequestId.current = switchId;
      latestMessagesRequestId.current = "";
      pendingSwitchRef.current = {
        id: switchId,
        previousPath: activeSessionPath,
      };
      rememberTab(session);
      setActiveSessionPath(path);
      setLiveMessages(cached || []);
      setLiveTools([]);
      setLiveThinking([]);
      setMessagesLoading(isShell && !cached);
      setHistoryLoading(isShell && !cached);
      pendingScrollRestoreRef.current = savedScroll
        ? { path, entry: savedScroll }
        : null;
      stickToBottomRef.current = savedScroll ? savedScroll.atBottom : true;
      resetStream();
      setPending(false);
      setInterrupted(false);
      setSessionStats(null);
      setContextTokens(0);
      if (session.cwd && !sameWorkspacePath(session.cwd, workspace)) {
        setWorkspace(session.cwd);
        const note = bridge?.noteWorkspace?.({ cwd: session.cwd });
        void note
          ?.then((result) => {
            if (Array.isArray(result?.recent)) {
              setRecentWorkspaces(result.recent);
            }
            if (result?.scratch) {
              setScratchWorkspace(result.scratch);
            }
          })
          .catch(() => {});
      }
      if (isShell) {
        const loading = window.tesT?.readSessionMessages?.(path);
        if (loading) {
          void loading
            .then((result) => {
              if (seq !== sessionLoadSeq.current) {
                return;
              }
              if (result?.messages?.length) {
                setLiveMessages(result.messages);
                rememberHistory(path, result.messages);
                const saved = scrollMemoryRef.current[path];
                stickToBottomRef.current = saved ? saved.atBottom : true;
                setMessagesLoading(false);
              }
            })
            .catch(() => {
              // History is optional; fall back to the empty state.
            })
            .finally(() => {
              if (seq === sessionLoadSeq.current) {
                setHistoryLoading(false);
              }
            });
        } else {
          setHistoryLoading(false);
        }
        bridge?.send({
          id: switchId,
          type: "switch_session",
          sessionPath: path,
        });
      }
      return;
    }

    const index = flatSessions.indexOf(session);
    if (index >= 0) {
      setActive(index);
    }
  };

  const selectSessionByPath = (path: string) => {
    const session = flatSessions.find((item) => item.path === path);
    if (session) {
      selectSession(session);
      return;
    }
    const tab = sessionTabs.find((item) => item.path === path);
    if (tab) {
      selectSession({ title: tab.title, meta: "", path });
    }
  };
  selectSessionByPathRef.current = selectSessionByPath;

  const closeTab = (path: string) => {
    const index = sessionTabs.findIndex((tab) => tab.path === path);
    const next = sessionTabs.filter((tab) => tab.path !== path);
    setSessionTabs(next);
    if (activeSessionPath === path) {
      const fallback = next[Math.max(0, index - 1)];
      if (fallback) {
        selectSessionByPath(fallback.path);
      }
    }
  };
  closeTabRef.current = closeTab;

  const cycleTab = (delta: number) => {
    if (sessionTabs.length < 2) {
      return;
    }
    const index = sessionTabs.findIndex(
      (tab) => tab.path === activeSessionPath,
    );
    const next =
      sessionTabs[
        (Math.max(0, index) + delta + sessionTabs.length) %
          sessionTabs.length
      ];
    if (next) {
      selectSessionByPath(next.path);
    }
  };
  cycleTabRef.current = cycleTab;

  const openSearchResult = (result: TesTSessionSearchResult) => {
    setSessionSearchOpen(false);
    selectSession({
      title: result.name || result.firstMessage || "搜索命中会话",
      meta: relativeSessionTime(result.modified),
      path: result.path,
      cwd: result.cwd,
      id: result.id,
      modified: result.modified,
      messageCount: result.messageCount,
    });
  };

  const deleteSession = (session: Session) => {
    if (!session.path) {
      return;
    }

    const request = bridge?.deleteSession?.({ path: session.path });
    request?.then((result) => {
      if (result?.error) {
        notify("删除会话失败", result.error);
        return;
      }
      if (activeSessionPath === session.path) {
        sessionLoadSeq.current += 1;
        latestSwitchRequestId.current = "";
        latestMessagesRequestId.current = "";
        pendingSwitchRef.current = null;
        setActiveSessionPath("");
        setLiveMessages([]);
        setLiveTools([]);
        setLiveThinking([]);
        setMessagesLoading(false);
        setHistoryLoading(false);
        setSessionStats(null);
        setContextTokens(0);
        bridge?.send({
          id: `new-after-delete-${Date.now()}`,
          type: "new_session",
        });
      }
      refreshSessions();
      notify("会话已删除", session.title);
    });
  };

  const exportSessionFile = (session: Session) => {
    if (!session.path) {
      notify("无法导出", "当前会话还没有保存文件");
      return;
    }
    const request = bridge?.exportSession?.({
      path: session.path,
      title: session.title,
    });
    request?.then((result) => {
      if (result?.canceled) {
        return;
      }
      if (result?.error) {
        notify("导出失败", result.error);
        return;
      }
      notify("已导出 Markdown", result?.path || "");
    });
  };

  const archiveSessionFile = (session: Session) => {
    if (!session.path) {
      return;
    }
    const request = bridge?.archiveSession?.({ path: session.path });
    request?.then((result) => {
      if (result?.error) {
        notify("归档失败", result.error);
        return;
      }
      if (activeSessionPath === session.path) {
        setActiveSessionPath("");
        setLiveMessages([]);
        setLiveTools([]);
        setLiveThinking([]);
        setSessionStats(null);
        setContextTokens(0);
      }
      refreshSessions();
      notifyAction(
        "会话已归档",
        "5 秒内可以恢复",
        "撤销",
        async () => {
          if (!result?.path || !bridge?.restoreArchivedSession) {
            notify("撤销失败", "没有可恢复的归档路径");
            return;
          }
          const restored = await bridge.restoreArchivedSession({
            path: result.path,
          });
          if (restored?.error) {
            notify("恢复失败", restored.error);
            return;
          }
          refreshSessions();
          notify("会话已恢复", session.title);
        },
      );
    });
  };

  const openRename = (session: Session) => {
    setRenameTarget(session);
    setRenameOpen(true);
  };

  const renameSession = (name: string) => {
    const target = renameTarget;
    setRenameOpen(false);
    setRenameTarget(null);
    if (!target?.path) {
      return;
    }

    if (target.path === activeSessionPath) {
      bridge?.send({
        id: `rename-${Date.now()}`,
        type: "set_session_name",
        name,
      });
      setSessionName(name);
      notify("会话已重命名", name);
      return;
    }

    const request = bridge?.renameSession?.({
      path: target.path,
      name,
    });
    request?.then((result) => {
      if (result?.error) {
        notify("重命名失败", result.error);
        return;
      }
      refreshSessions();
      notify("会话已重命名", name);
    });
  };

  const clearProviders = () => {
    if (isShell) {
      bridge?.clearProviders();
      notify("正在清空模型配置…", "会先备份 models.json");
    } else {
      setAvailableModels([]);
      setModel(placeholderModel);
      notify("已清空", "浏览器预览模式");
    }
  };

  const applyWorkspaceResult = (result: {
    cwd?: string;
    recent?: string[];
  }) => {
    if (!result.cwd) {
      return;
    }
    setWorkspace(result.cwd);
    if (Array.isArray(result.recent)) {
      setRecentWorkspaces(result.recent);
    }
    setWorkspaceOpen(false);
    sessionLoadSeq.current += 1;
    latestSwitchRequestId.current = "";
    latestMessagesRequestId.current = "";
    pendingSwitchRef.current = null;
    setActiveSessionPath("");
    setLiveMessages([]);
    setLiveTools([]);
    setLiveThinking([]);
    setMessagesLoading(false);
    setHistoryLoading(false);
    stickToBottomRef.current = true;
    setShowScrollLatest(false);
    setShowScrollTop(false);
    setUnseenMessages(0);
    resetStream();
    setPending(false);
    setInterrupted(false);
    setSessionStats(null);
    setContextTokens(0);
    setSessionName("新会话");
    refreshSessions();
  };

  const chooseWorkspace = () => {
    if (!isShell || !bridge?.chooseWorkspace) {
      notify("切换工作区", "桌面端中可用");
      return;
    }

    setWorkspaceOpen(false);
    void bridge
      .chooseWorkspace()
      .then((result) => {
        if (result?.error) {
          notify("打开目录失败", result.error);
          return;
        }
        if (result?.canceled) {
          return;
        }
        applyWorkspaceResult(result);
        notify("工作区已切换", result.cwd);
      })
      .catch((error) => notify("打开目录失败", String(error)));
  };

  const selectWorkspace = (cwd: string) => {
    if (!isShell || !bridge?.setWorkspace) {
      notify("切换工作区", "桌面端中可用");
      return;
    }

    setWorkspaceOpen(false);
    void bridge
      .setWorkspace({ cwd })
      .then((result) => {
        if (result?.error) {
          notify("切换失败", result.error);
          return;
        }
        applyWorkspaceResult(result);
        notify("工作区已切换", result.cwd || cwd);
      })
      .catch((error) => notify("切换失败", String(error)));
  };

  const {
    worktrees,
    worktreeBusy,
    pendingWorktreePath,
    pendingWorktreeMerge,
    worktreeMergeConflict,
    worktreeMergeConflicts,
    createIsolatedWorktree,
    removeIsolatedWorktree,
    mergeIsolatedWorktree,
    abortWorktreeMerge,
    continueWorktreeMerge,
  } = useWorktreeController({
    isShell,
    bridge,
    notify,
    workspace,
    workspaceCwd,
    workspaceOpen,
    onSelectWorkspace: selectWorkspace,
  });

  const openParallelWindow = () => {
    if (!isShell || !bridge?.newAgentWindow) {
      notify("并行窗口", "桌面端中可用");
      return;
    }
    void bridge
      .newAgentWindow()
      .then((result) => {
        if (result?.error) {
          notify("打开并行窗口失败", result.error);
        } else {
          notify("已打开并行窗口", "可左右吸附同时运行两个会话");
        }
      })
      .catch((error) => notify("打开并行窗口失败", String(error)));
  };

  const newSession = () => {
    rememberCurrentScroll(activeSessionPath);
    if (isShell) {
      bridge?.send({
        id: `new-session-${Date.now()}`,
        type: "new_session",
      });
      setLiveMessages([]);
      setLiveTools([]);
      setLiveThinking([]);
      setMessagesLoading(false);
      setHistoryLoading(false);
      stickToBottomRef.current = true;
      setShowScrollLatest(false);
      setShowScrollTop(false);
      setUnseenMessages(0);
      sessionLoadSeq.current += 1;
      latestSwitchRequestId.current = "";
      latestMessagesRequestId.current = "";
      pendingSwitchRef.current = null;
      resetStream();
      setPending(false);
      setInterrupted(false);
      setSessionStats(null);
      setContextTokens(0);
      setActiveSessionPath("");
      setSessionName("新会话");
      notify("新会话", "Pi 已切换到新会话");
      return;
    }

    notify("新会话", "已创建草稿会话");
  };
  newSessionRef.current = newSession;

  const newScratchSession = () => {
    if (!isShell || !bridge?.newScratchSession) {
      notify("临时会话", "桌面端中可用");
      return;
    }
    rememberCurrentScroll(activeSessionPath);
    void bridge
      .newScratchSession()
      .then((result) => {
        if (result?.error) {
          notify("创建临时会话失败", result.error);
          return;
        }
        if (result?.cwd) {
          setScratchWorkspace(result.cwd);
        }
        applyWorkspaceResult(result);
        notify("临时会话", "这个会话不属于任何项目");
      })
      .catch((error) => notify("创建临时会话失败", String(error)));
  };

  const newSessionInProject = (cwd: string) => {
    if (!isShell || !bridge?.newProjectSession) {
      notify("项目内新建会话", "桌面端中可用");
      return;
    }
    rememberCurrentScroll(activeSessionPath);
    void bridge
      .newProjectSession({ cwd })
      .then((result) => {
        if (result?.error) {
          notify("创建项目会话失败", result.error);
          return;
        }
        applyWorkspaceResult(result);
        notify("已新建项目会话", projectBasename(cwd));
      })
      .catch((error) =>
        notify("创建项目会话失败", String(error)),
      );
  };

  const activeTurnBookmarks = useMemo(
    () =>
      new Set(
        activeSessionPath
          ? bookmarksForSession(turnBookmarkStore, activeSessionPath)
          : [],
      ),
    [activeSessionPath, turnBookmarkStore],
  );
  const toggleBookmarkForTurn = useCallback(
    (messageId: string) => {
      if (!activeSessionPath || !messageId) {
        return;
      }
      setTurnBookmarkStore((previous) =>
        toggleTurnBookmark(previous, activeSessionPath, messageId),
      );
    },
    [activeSessionPath],
  );
  const commands: CommandAction[] = [
    {
      label: "新建会话",
      hint: "Ctrl N",
      icon: <Plus size={14} />,
      run: newSession,
    },
    {
      label: "新建并行窗口",
      hint: "Side by side",
      icon: <PanelRight size={14} />,
      run: openParallelWindow,
    },
    {
      label: "切换模型",
      hint: "Pi 模型",
      icon: <Sparkles size={14} />,
      run: () => setModelOpen(true),
    },
  {
    label: "搜索会话内容",
    hint: "Ctrl Shift F",
    icon: <Search size={14} />,
    run: () => setSessionSearchOpen(true),
  },
    {
      label: "打开设置",
      hint: "Ctrl ,",
      icon: <Settings size={14} />,
      run: () => setSettingsOpen(true),
    },
    {
      label: "打开技能与扩展",
      hint: "Sheet",
      icon: <Puzzle size={14} />,
      run: () => setSheetMode("extensions"),
    },
    {
      label: "手机远程",
      hint: "Remote",
      icon: <Smartphone size={14} />,
      run: () => setRemoteOpen(true),
    },
    {
      label: "切换工作区",
      hint: "Workspace",
      icon: <Folder size={14} />,
      run: () => setWorkspaceOpen(true),
    },
    {
      label: "工作区文件",
      hint: "Files",
      icon: <FileText size={14} />,
      run: () => setFilesOpen(true),
    },
    {
      label: "打开终端",
      hint: "Terminal",
      icon: <Terminal size={14} />,
      run: () => setTerminalOpen(true),
    },
    {
      label: "导出当前会话",
      hint: "Markdown",
      icon: <Download size={14} />,
      run: () => {
        if (activeSession) {
          exportSessionFile(activeSession);
        } else {
          notify("无法导出", "当前还没有选中会话");
        }
      },
    },
    {
      label: "检查更新",
      hint: "TesT / Pi",
      icon: <RotateCcw size={14} />,
      run: () => {
        setSettingsOpen(true);
        setSettingsTab("update");
      },
    },
    {
      label: "切换上下文面板",
      hint: "Panel",
      icon: <PanelRight size={14} />,
      run: toggleContext,
    },
    {
      label: "切换深浅色",
      hint: dark ? "浅色" : "深色",
      icon: (
        <MorphIcon
          icon={dark ? SunNode : MoonNode}
          size={14}
          spring="smooth"
          reducedMotion="user"
          className="theme-glyph"
          aria-hidden="true"
        />
      ),
      run: () => setDark((value) => !value),
    },
  ];

  const slashCommands = [
    {
      name: "new",
      label: "新聊天",
      desc: "开一个干净的 Pi 会话",
      icon: <Plus size={14} />,
      run: newSession,
    },
    {
      name: "window",
      label: "并行窗口",
      desc: "开启独立 Pi 进程，可左右吸附并行运行",
      icon: <PanelRight size={14} />,
      run: openParallelWindow,
    },
    {
      name: "status",
      label: "状态",
      desc: "Pi 连接、模型与本次会话用量",
      icon: <Cpu size={14} />,
      run: () => setUsageOpen(true),
    },
    {
      name: "usage",
      label: "累计用量",
      desc: "按天与按模型统计花费和 Tokens",
      icon: <Zap size={14} />,
      run: () => setUsageOpen(true),
    },
    {
      name: "model",
      label: "切换模型",
      desc: "打开 Pi 模型快捷切换",
      icon: <Sparkles size={14} />,
      run: () => setModelOpen(true),
    },
    {
      name: "reasoning",
      label: "推理强度",
      desc: `当前 ${reasoning}，切换 low / medium / high`,
      icon: <Sliders size={14} />,
      run: () => setReasoningOpen(true),
    },
    {
      name: "plan",
      label: planMode ? "关闭计划模式" : "计划模式",
      desc: planMode
        ? "当前已开启：先出方案，不直接改代码"
        : "先出方案，确认后再执行",
      icon: <FileText size={14} />,
      run: togglePlanMode,
    },
    {
      name: "compact",
      label: "压缩上下文",
      desc: "让 Pi 摘要较早的消息，释放上下文",
      icon: <Archive size={14} />,
      run: compactContext,
    },
    {
      name: "fork",
      label: "分叉会话",
      desc: "从最后一条用户消息创建新分支",
      icon: <GitBranch size={14} />,
      run: () => forkSession(""),
    },
    {
      name: "clone",
      label: "克隆会话",
      desc: "复制当前会话为新会话",
      icon: <Copy size={14} />,
      run: cloneSession,
    },
    {
      name: "stop",
      label: "停止生成",
      desc: "中断 Pi 当前的回复和工具调用",
      icon: <Square size={13} />,
      run: stopPi,
    },
    {
      name: "context",
      label: "添加上下文",
      desc: "选择文件或图片附加给 Pi",
      icon: <Paperclip size={14} />,
      run: () => {
        void pickContext();
      },
    },
    {
      name: "search",
      label: "搜索会话",
      desc: "全文搜索历史会话内容",
      icon: <Search size={14} />,
      run: () => setSessionSearchOpen(true),
    },
    {
      name: "rename",
      label: "重命名会话",
      desc: "修改当前会话显示名称",
      icon: <Pencil size={14} />,
      run: () => {
        if (!activeSessionPath) {
          notify("还没有可重命名的会话", "先发一条消息");
          return;
        }
        openRename({
          title: sessionName,
          meta: "",
          path: activeSessionPath,
        });
      },
    },
    {
      name: "workspace",
      label: "切换工作区",
      desc: "打开目录并切换 Pi 的 cwd",
      icon: <Folder size={14} />,
      run: () => setWorkspaceOpen(true),
    },
    {
      name: "branch",
      label: "分支管理",
      desc: "新建、切换或删除 Git 分支",
      icon: <GitBranch size={14} />,
      run: () => setBranchOpen(true),
    },
    {
      name: "files",
      label: "工作区文件",
      desc: "浏览并只读预览当前工作区的文件",
      icon: <FileText size={14} />,
      run: () => setFilesOpen(true),
    },
    {
      name: "terminal",
      label: "终端",
      desc: "在当前工作区运行命令",
      icon: <Terminal size={14} />,
      run: () => setTerminalOpen(true),
    },
    {
      name: "skills",
      label: "技能与扩展",
      desc: "管理 Pi skills 和扩展",
      icon: <Puzzle size={14} />,
      run: () => setSheetMode("extensions"),
    },
    {
      name: "remote",
      label: "手机远程",
      desc: "用手机继续当前 Pi 会话",
      icon: <Smartphone size={14} />,
      run: () => setRemoteOpen(true),
    },
    {
      name: "panel",
      label: "上下文面板",
      desc: "显示或隐藏右侧会话面板",
      icon: <PanelRight size={14} />,
      run: toggleContext,
    },
    {
      name: "theme",
      label: "切换深浅色",
      desc: dark ? "切换到浅色主题" : "切换到深色主题",
      icon: (
        <MorphIcon
          icon={dark ? SunNode : MoonNode}
          size={14}
          spring="smooth"
          reducedMotion="user"
          className="theme-glyph"
          aria-hidden="true"
        />
      ),
      run: () => setDark((value) => !value),
    },
    {
      name: "export",
      label: "导出会话",
      desc: "导出当前会话为 Markdown",
      icon: <Download size={14} />,
      run: () => {
        if (activeSession) {
          exportSessionFile(activeSession);
        } else {
          notify("无法导出", "当前还没有选中会话");
        }
      },
    },
    {
      name: "settings",
      label: "设置",
      desc: "通用、模型、工具与连接",
      icon: <Settings size={14} />,
      run: () => setSettingsOpen(true),
    },
  ];

  const piSlashCommands = piCommands
    .filter(
      (command) =>
        command?.name &&
        !slashCommands.some((item) => item.name === command.name),
    )
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((command) => ({
      name: command.name,
      label: `/${command.name}`,
      desc:
        command.description ||
        (command.source === "skill"
          ? "Pi 技能"
          : command.source === "extension"
            ? "Pi 扩展命令"
            : "Pi 命令"),
      icon:
        command.source === "skill" ? (
          <Sparkles size={14} />
        ) : command.source === "extension" ? (
          <Puzzle size={14} />
        ) : (
          <Wrench size={14} />
        ),
      tag:
        command.source === "skill"
          ? "技能"
          : command.source === "extension"
            ? "扩展"
            : "命令",
      run: () => {
        draftStore.update(`/${command.name} `);
        window.setTimeout(() => composerRef.current?.focus(), 0);
      },
    }));

  const allSlashCommands = [...slashCommands, ...piSlashCommands];


  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", dark);
    root.style.colorScheme = dark ? "dark" : "light";
    root.style.setProperty("--accent", dark ? accent.dark : accent.light);
    root.style.setProperty(
      "--accent-hover",
      dark ? accent.darkHover : accent.lightHover,
    );
    root.style.setProperty(
      "--accent-soft",
      dark ? accent.softDark : accent.softLight,
    );
    root.style.setProperty(
      "--accent-ring",
      dark ? `${accent.dark}2e` : `${accent.light}29`,
    );
  }, [dark, accent]);

  useEffect(() => {
    writeDarkPreference(localStorage, dark);
  }, [dark]);

  useEffect(() => {
    writeDensityPreference(localStorage, density);
  }, [density]);

  useEffect(() => {
    writeAccentPreference(localStorage, accentKey);
  }, [accentKey]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        !event.isComposing &&
        event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey &&
        /^[1-9]$/.test(event.key)
      ) {
        const tab = tabsRef.current[Number(event.key) - 1];
        if (tab) {
          event.preventDefault();
          selectSessionByPathRef.current(tab.path);
        }
        return;
      }
      if (matchesShortcut(event, "sessionSearch", ["Ctrl", "Shift", "F"])) {
        event.preventDefault();
        setSessionSearchOpen(true);
        return;
      }
      if (matchesShortcut(event, "find", ["Ctrl", "F"])) {
        event.preventDefault();
        setFindOpen(true);
        return;
      }
      if (matchesShortcut(event, "closeTab", ["Ctrl", "W"])) {
        if (!activePathRef.current) {
          return;
        }
        event.preventDefault();
        closeTabRef.current(activePathRef.current);
        return;
      }
      if (
        matchesShortcut(event, "cycleTab", ["Ctrl", "Tab"]) ||
        (event.ctrlKey &&
          event.shiftKey &&
          event.key === "Tab" &&
          shortcutText("cycleTab", ["Ctrl", "Tab"]).toLowerCase() ===
            "ctrl+tab")
      ) {
        event.preventDefault();
        cycleTabRef.current(event.shiftKey ? -1 : 1);
        return;
      }
      if (matchesShortcut(event, "commandPalette", ["Ctrl", "K"])) {
        event.preventDefault();
        setCmdOpen((value) => !value);
        return;
      }
      if (matchesShortcut(event, "newSession", ["Ctrl", "N"])) {
        event.preventDefault();
        newSessionRef.current();
        return;
      }
      if (matchesShortcut(event, "settings", ["Ctrl", ","])) {
        event.preventDefault();
        setSettingsOpen(true);
        return;
      }
      if (event.key === "Escape") {
        setCmdOpen(false);
        setModelOpen(false);
        setReasoningOpen(false);
        setFindOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
      if (replyTimer.current) window.clearTimeout(replyTimer.current);
      if (sessionRefreshTimer.current !== null) {
        window.clearTimeout(sessionRefreshTimer.current);
      }
      if (hoverPrefetchTimerRef.current !== null) {
        window.clearTimeout(hoverPrefetchTimerRef.current);
      }
      for (const waiter of piResponseWaitersRef.current.values()) {
        window.clearTimeout(waiter.timer);
        waiter.resolve(null);
      }
      piResponseWaitersRef.current.clear();
      document.documentElement.classList.remove("dark");
    };
  }, []);

  const persistHiddenProjects = (next: string[]) => {
    setHiddenProjects(next);
    localStorage.setItem("tesT.hiddenProjects", JSON.stringify(next));
  };

  const removeProject = (targetPath: string, name: string) => {
    if (
      hiddenProjects.some(
        (item) => item.toLowerCase() === targetPath.toLowerCase(),
      )
    ) {
      return;
    }
    persistHiddenProjects([...hiddenProjects, targetPath]);
    notifyAction(
      "项目已移除",
      `${name} · 文件和会话都已保留，可在“已移除项目”中恢复`,
      "撤销",
      () => {
        persistHiddenProjects(
          hiddenProjects.filter(
            (item) => item.toLowerCase() !== targetPath.toLowerCase(),
          ),
        );
        notify("项目已恢复", name);
      },
    );
  };

  const restoreProject = (targetPath: string) => {
    persistHiddenProjects(
      hiddenProjects.filter(
        (item) => item.toLowerCase() !== targetPath.toLowerCase(),
      ),
    );
    notify("项目已恢复", targetPath);
  };

  const visibleRecentWorkspaces = useMemo(
    () =>
      recentWorkspaces.filter(
        (item) =>
          !hiddenProjects.some((project) =>
            pathWithinProject(item, project),
          ),
      ),
    [recentWorkspaces, hiddenProjects],
  );

  const renderNode = (node: TreeNode, depth: number, path: string) => {
    const id = `${path}/${node.name}`;
    const open = expanded[id] ?? true;
    const isRoot = depth === 1;
    const isCurrentProject =
      isRoot && sameWorkspacePath(node.fullPath, workspace);
    const isScratchProject = sameWorkspacePath(
      node.fullPath,
      scratchWorkspace,
    );
    const canRemoveProject =
      Boolean(node.fullPath) &&
      !/^[A-Za-z]:\\?$/.test(node.fullPath || "");
    return (
      <div key={id} className="tree-node">
        <div className="tree-folder-row">
          <ContextMenuPrimitive.Root>
            <ContextMenuPrimitive.Trigger asChild>
              <button type="button"
                className={`tree-folder ${isRoot ? "root" : ""} ${
                  isCurrentProject ? "current" : ""
                }`}
                style={{ paddingLeft: 6 + (depth - 1) * 14 }}
                title={node.fullPath || node.name}
                onClick={() => toggleFolder(id)}
                aria-expanded={open}
              >
                <ChevronRight
                  size={11}
                  className={`chevron ${open ? "open" : ""}`}
                />
                {isRoot ? <FolderOpen size={13} /> : <Folder size={12} />}
                <span>{node.name}</span>
                <small>{countSessions(node)}</small>
              </button>
            </ContextMenuPrimitive.Trigger>
            <ContextMenuPrimitive.Portal>
              <ContextMenuPrimitive.Content
                className="menu-content"
                sideOffset={6}
              >
                <ContextMenuPrimitive.Label className="menu-label">
                  目录
                </ContextMenuPrimitive.Label>
                <ContextMenuPrimitive.Item
                  className="menu-item"
                  onSelect={() => toggleFolder(id)}
                >
                  <FolderOpen size={13} /> {open ? "收起目录" : "展开目录"}
                </ContextMenuPrimitive.Item>
                {node.fullPath && (
                  <>
                    <ContextMenuPrimitive.Item
                      className="menu-item"
                      onSelect={() => {
                        if (isScratchProject) {
                          newScratchSession();
                        } else {
                          newSessionInProject(node.fullPath as string);
                        }
                      }}
                    >
                      <Plus size={13} />{" "}
                      {isScratchProject
                        ? "新建临时会话"
                        : "在此项目中新建会话"}
                    </ContextMenuPrimitive.Item>
                    <ContextMenuPrimitive.Item
                      className="menu-item"
                      onSelect={() => {
                        void window.tesT?.revealPath?.({
                          cwd: node.fullPath,
                          path: ".",
                        });
                      }}
                    >
                      <FolderOpen size={13} /> 在文件管理器中打开
                    </ContextMenuPrimitive.Item>
                    <ContextMenuPrimitive.Item
                      className="menu-item"
                      onSelect={async () => {
                        const ok = await copyText(node.fullPath as string);
                        notify(ok ? "已复制目录路径" : "复制失败", node.fullPath);
                      }}
                    >
                      <Link2 size={13} /> 复制目录路径
                    </ContextMenuPrimitive.Item>
                  </>
                )}
                {canRemoveProject && (
                  <>
                    <ContextMenuPrimitive.Separator className="menu-sep" />
                    <ContextMenuPrimitive.Item
                      className="menu-item"
                      onSelect={() =>
                        removeProject(
                          node.fullPath as string,
                          node.name,
                        )
                      }
                    >
                      <Archive size={13} /> 移除项目
                    </ContextMenuPrimitive.Item>
                  </>
                )}
              </ContextMenuPrimitive.Content>
            </ContextMenuPrimitive.Portal>
          </ContextMenuPrimitive.Root>
          {isRoot && node.fullPath && (
            <button
              type="button"
              className="tree-folder-quick"
              title={
                isScratchProject
                  ? "新建临时会话"
                  : "在此项目中新建会话"
              }
              aria-label={
                isScratchProject
                  ? "新建临时会话"
                  : `在 ${node.name} 中新建会话`
              }
              onClick={() =>
                isScratchProject
                  ? newScratchSession()
                  : newSessionInProject(node.fullPath as string)
              }
            >
              <Plus size={12} />
            </button>
          )}
        </div>

        {open && (
          <>
            {node.sessions?.map((session) => {
              const index = flatSessions.indexOf(session);
              const isPinned = Boolean(
                session.path && pinnedPaths.includes(session.path),
              );
              const sessionTags = session.path
                ? assignedTagsForPath(sessionTagStore, session.path)
                : [];
              return (
                <div
                  className="tree-session-row"
                  key={session.path || session.title}
                >
                  <ContextMenuPrimitive.Root>
                    <ContextMenuPrimitive.Trigger asChild>
                      <button type="button"
                        className={`tree-session ${
                          (session.path
                            ? session.path === activeSessionPath
                            : index === active)
                            ? "active"
                            : ""
                        }`}
                        aria-current={
                          (session.path
                            ? session.path === activeSessionPath
                            : index === active)
                            ? "page"
                            : undefined
                        }
                        style={{
                          paddingLeft:
                            10 +
                            depth * 14 +
                            (session.depth ?? 0) * 16,
                        }}
                        onClick={() => selectSession(session)}
                        onPointerEnter={() => {
                          if (!session.path) return;
                          if (hoverPrefetchTimerRef.current !== null) {
                            window.clearTimeout(hoverPrefetchTimerRef.current);
                          }
                          hoverPrefetchTimerRef.current = window.setTimeout(
                            () => {
                              hoverPrefetchTimerRef.current = null;
                              prefetchSession(session);
                            },
                            120,
                          );
                        }}
                        onPointerLeave={() => {
                          if (hoverPrefetchTimerRef.current !== null) {
                            window.clearTimeout(hoverPrefetchTimerRef.current);
                            hoverPrefetchTimerRef.current = null;
                          }
                        }}
                        onFocus={() => prefetchSession(session)}
                      >
                      {session.depth ? (
                        <GitBranch size={11} className="fork-icon" />
                      ) : (
                        <FileText size={11} />
                      )}
                      <HoverCardPrimitive.Root
                        openDelay={340}
                        closeDelay={90}
                        onOpenChange={(open) => {
                          if (open) prefetchSession(session);
                        }}
                      >
                        <HoverCardPrimitive.Trigger asChild>
                          <span className="tree-session-main">
                            <span className="tree-session-title">
                              {session.title}
                            </span>
                            <span className="tree-session-meta">
                              {session.meta}
                            </span>
                          </span>
                        </HoverCardPrimitive.Trigger>
                        <HoverCardPrimitive.Portal>
                          <HoverCardPrimitive.Content
                            className="hover-card"
                            side="right"
                            align="start"
                            sideOffset={12}
                          >
                            <div className="hover-card-head">
                              <FileText size={11} />
                              <b>{session.title}</b>
                            </div>
                            <div className="hover-card-meta">
                              {session.meta} · {model.short}
                            </div>
                            <p className="hover-card-desc">
                              {session.parentPath && (
                                <>
                                  分叉自{" "}
                                  {flatSessions.find(
                                    (item) =>
                                      item.path === session.parentPath,
                                  )?.title || "上级会话"}
                                  。
                                  <br />
                                </>
                              )}
                              继续这段会话，Pi 会保留当前工作区、模型与工具调用上下文。
                            </p>
                            <div className="chips">
                              <Tag tone="mint">{session.tag ?? "会话"}</Tag>
                              {session.unread && <Tag tone="amber">未读</Tag>}
                              <Tag>main</Tag>
                            </div>
                            <div className="hover-card-foot">
                              <Button
                                size="sm"
                                variant="secondary"
                                icon={<Eye size={12} />}
                                onClick={() => selectSession(session)}
                              >
                                打开
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                icon={<Pin size={12} />}
                                disabled={!session.path}
                                onClick={() =>
                                  togglePinned(session.path || "")
                                }
                              >
                                {session.path &&
                                pinnedPaths.includes(session.path)
                                  ? "取消置顶"
                                  : "置顶"}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                icon={<Copy size={12} />}
                                onClick={async () => {
                                  const ok = await copyText(session.title);
                                  if (ok) notify("已复制标题");
                                }}
                              >
                                复制
                              </Button>
                            </div>
                          </HoverCardPrimitive.Content>
                        </HoverCardPrimitive.Portal>
                      </HoverCardPrimitive.Root>
                      {sessionTags.length > 0 && (
                        <span
                          className="tree-session-tag-dots"
                          title={sessionTags.map((tag) => tag.name).join(" · ")}
                        >
                          {sessionTags.slice(0, 3).map((tag) => (
                            <i
                              key={tag.id}
                              className={`session-tag-dot session-tag-color-${tag.color}`}
                            />
                          ))}
                        </span>
                      )}
                      {session.tag && <Tag tone="mint">{session.tag}</Tag>}
                      {session.unread && <i className="unread" />}
                      </button>
                    </ContextMenuPrimitive.Trigger>
                    <ContextMenuPrimitive.Portal>
                      <ContextMenuPrimitive.Content
                        className="menu-content"
                        sideOffset={6}
                      >
                      <ContextMenuPrimitive.Label className="menu-label">
                        会话
                      </ContextMenuPrimitive.Label>
                      <ContextMenuPrimitive.Item
                        className="menu-item"
                        onSelect={() => selectSession(session)}
                      >
                        <FolderOpen size={13} /> 打开会话
                      </ContextMenuPrimitive.Item>
                      <ContextMenuPrimitive.Item
                        className="menu-item"
                        onSelect={() => togglePinned(session.path || "")}
                      >
                        <Pin size={13} />{" "}
                        {session.path &&
                        pinnedPaths.includes(session.path)
                          ? "取消置顶"
                          : "置顶会话"}
                      </ContextMenuPrimitive.Item>
                      <ContextMenuPrimitive.Item
                        className="menu-item"
                        onSelect={() => openRename(session)}
                      >
                        <Pencil size={13} /> 重命名
                      </ContextMenuPrimitive.Item>
                      <ContextMenuPrimitive.Item
                        className="menu-item"
                        onSelect={async () => {
                          const ok = await copyText(session.title);
                          if (ok) notify("已复制标题");
                        }}
                      >
                        <Copy size={13} /> 复制标题
                        <span className="menu-shortcut">Ctrl C</span>
                      </ContextMenuPrimitive.Item>
                      <ContextMenuPrimitive.Item
                        className="menu-item"
                        onSelect={async () => {
                          if (!session.path) {
                            notify("无法复制", "会话还没有保存文件");
                            return;
                          }
                          const ok = await copyText(session.path);
                          notify(
                            ok ? "已复制会话路径" : "复制失败",
                            ok ? session.path : "请手动复制",
                          );
                        }}
                      >
                        <Link2 size={13} /> 复制会话路径
                      </ContextMenuPrimitive.Item>
                      <ContextMenuPrimitive.Separator className="menu-sep" />
                      <ContextMenuPrimitive.Item
                        className="menu-item"
                        onSelect={() => archiveSessionFile(session)}
                      >
                        <Archive size={13} /> 归档
                      </ContextMenuPrimitive.Item>
                      <ContextMenuPrimitive.Item
                        className="menu-item danger"
                        onSelect={() => setDeleteTarget(session)}
                      >
                        <Trash2 size={13} /> 删除会话
                      </ContextMenuPrimitive.Item>
                      </ContextMenuPrimitive.Content>
                    </ContextMenuPrimitive.Portal>
                  </ContextMenuPrimitive.Root>
                  {session.path && (
                    <button
                      type="button"
                      className={`tree-session-quick ${
                        isPinned ? "is-pinned" : ""
                      }`}
                      title={isPinned ? "取消置顶" : "置顶会话"}
                      aria-label={isPinned ? "取消置顶" : "置顶会话"}
                      onClick={() => togglePinned(session.path as string)}
                    >
                      <Pin
                        size={11}
                        fill={isPinned ? "currentColor" : "none"}
                      />
                    </button>
                  )}
                  {session.path && (
                    <SessionTagEditor
                      store={sessionTagStore}
                      path={session.path}
                      onToggle={(tagId) =>
                        toggleSessionTagForPath(session.path as string, tagId)
                      }
                      onCreate={(name) =>
                        createSessionTagForPath(session.path as string, name)
                      }
                      onClear={() =>
                        clearSessionTagsForPath(session.path as string)
                      }
                    />
                  )}
                </div>
              );
            })}
            {depth < 6 &&
              node.children?.map((child) =>
                renderNode(child, depth + 1, id),
              )}
          </>
        )}
      </div>
    );
  };

  const projectView = useMemo(() => {
    const projects = sessionTree.children ?? [];
    const regular = projects.filter(
      (project) => !sameWorkspacePath(project.fullPath, scratchWorkspace),
    );
    const scratch = projects.filter((project) =>
      sameWorkspacePath(project.fullPath, scratchWorkspace),
    );
    return (
      <>
        {regular.map((project) => renderNode(project, 1, ""))}
        {scratch.length > 0 && (
          <div className="scratch-session-section">
            {scratch.map((project) => renderNode(project, 1, ""))}
          </div>
        )}
      </>
    );
  }, [
      sessionTree,
      expanded,
      activeSessionPath,
      active,
      flatSessions,
      model.short,
      pinnedPaths,
      hiddenProjects,
      scratchWorkspace,
    ]);

  return (
    <AppFrame dark={dark} density={density} isShell={isShell}>
      <AppWindow maxed={maxed}>
        <TitlebarFrame
          isShell={isShell}
          bridge={bridge}
          left={
            <div className="tb-left">
              <img
                className="brand-mark-img"
                src={brandTerminal}
                alt="TesT"
                title="TesT"
              />
              <span className="tb-divider" />
              <WorkspaceSwitcher
                open={workspaceOpen}
                cwd={workspaceCwd}
                scratch={scratchActive}
                recent={visibleRecentWorkspaces}
                repo={gitInfo.repo}
                worktrees={worktrees}
                worktreeBusy={worktreeBusy}
                pendingWorktreePath={pendingWorktreePath}
                pendingWorktreeMerge={pendingWorktreeMerge}
                mergeConflict={worktreeMergeConflict}
                mergeConflicts={worktreeMergeConflicts}
                onOpenChange={setWorkspaceOpen}
                onSelect={selectWorkspace}
                onChoose={chooseWorkspace}
                onCreateWorktree={createIsolatedWorktree}
                onRemoveWorktree={removeIsolatedWorktree}
                onMergeWorktree={mergeIsolatedWorktree}
                onAbortMerge={abortWorktreeMerge}
                onContinueMerge={continueWorktreeMerge}
              />
            </div>
          }
          center={
            <div className="tb-center">
              <button
                type="button"
                className="omnibox"
                onClick={() => setCmdOpen(true)}
              >
                <Search size={13} />
                <span>搜索或执行命令…</span>
                <kbd>Ctrl K</kbd>
              </button>
            </div>
          }
          right={
            <div className="tb-right">
              <Tooltip tip="设置">
                <Button
                  variant="icon"
                  onClick={() => setSettingsOpen(true)}
                  title="设置"
                >
                  <Settings size={15} />
                </Button>
              </Tooltip>
              <CaptionButtons
                onMinimize={() => {
                  if (isShell) bridge?.windowAction("minimize");
                  else notify("最小化", "桌面壳接管后生效");
                }}
                onMaximize={() => {
                  if (isShell) bridge?.windowAction("maximize");
                  else setMaxed((value) => !value);
                }}
                onClose={() => setCloseOpen(true)}
              />
            </div>
          }
        />


          <div className="layout">
            <Group orientation="horizontal" className="layout-group">
              {!tiny && (
                <Panel
                  id="sidebar"
                  defaultSize="19%"
                  minSize="14%"
                  maxSize="27%"
                  className="panel"
                >
                  <SessionSidebar
                      projectTreeIds={projectTreeIds}
                      allProjectsCollapsed={allProjectsCollapsed}
                      toggleAllProjects={toggleAllProjects}
                      newSession={newSession}
                      refreshSessions={refreshSessions}
                      newScratchSession={newScratchSession}
                      filterableSessionTags={filterableSessionTags}
                      activeSessionTag={activeSessionTag}
                      setActiveSessionTag={setActiveSessionTag}
                      sessionTagCounts={sessionTagCounts}
                      pinnedSessions={pinnedSessions}
                      activeSessionPath={activeSessionPath}
                      selectSession={selectSession}
                      prefetchSession={prefetchSession}
                      sessionTagStore={sessionTagStore}
                      projectView={projectView}
                      hiddenProjects={hiddenProjects}
                      restoreProject={restoreProject}
                    />
                </Panel>
              )}

              {!tiny && (
                <Separator
                  id="handle-sidebar"
                  className="resize-handle"
                />
              )}

              <Panel id="chat" minSize="36%" className="panel">
                <main className="chat" aria-label="会话工作区">
                  <SessionTabs
                    tabs={sessionTabs}
                    activePath={activeSessionPath}
                    sessions={flatSessions}
                    onPrefetch={prefetchSession}
                    onSelect={selectSessionByPath}
                    onClose={closeTab}
                    onNewSession={() => newSessionRef.current()}
                  />
                  <ChatHeader
                    isShell={isShell}
                    sessionName={sessionName}
                    sessionTitle={activeSession?.title}
                    sessionMeta={activeSession?.meta}
                    model={model}
                    pending={pending}
                    piReady={piStatus === "ready"}
                    onConfigureModel={openModelSettings}
                    onToggleContext={toggleContext}
                    onRename={
                      activeSession
                        ? () => openRename(activeSession)
                        : undefined
                    }
                    onArchive={
                      activeSession
                        ? () => archiveSessionFile(activeSession)
                        : undefined
                    }
                    onDelete={
                      activeSession
                        ? () => setDeleteTarget(activeSession)
                        : undefined
                    }
                  />

                  <ChatFindBar
                    open={findOpen}
                    query={findQuery}
                    matchCount={findMatches.length}
                    activeIndex={findIndex}
                    onQueryChange={(value) => {
                      setFindQuery(value);
                      setFindIndex(0);
                    }}
                    onStep={(direction) => {
                      if (findMatches.length > 0) {
                        setFindIndex(
                          (index) =>
                            (index + direction + findMatches.length) %
                            findMatches.length,
                        );
                      }
                    }}
                    onClose={() => setFindOpen(false)}
                  />

                  <ChatMessageFlow
                    isShell={isShell}
                    model={model}
                    messagesLoading={messagesLoading}
                    historyLoading={historyLoading}
                    liveMessages={liveMessages}
                    visibleLiveMessages={visibleLiveMessages}
                    hiddenMessageCount={hiddenMessageCount}
                    pending={pending}
                    streamActive={streamActive}
                    liveTools={liveTools}
                    liveThinking={liveThinking}
                    sent={sent}
                    workspaceCwd={activeSession?.cwd || workspace}
                    findMatches={findMatches}
                    findIndex={findIndex}
                    findMatchSet={findMatchSet}
                    turnNumberById={turnNumberById}
                    activeTurnBookmarks={activeTurnBookmarks}
                    turnNavigationItems={turnNavigationItems}
                    currentTurn={currentTurn}
                    showTurnNavigation={showTurnNavigation}
                    showScrollTop={showScrollTop}
                    showScrollLatest={showScrollLatest}
                    unseenMessages={unseenMessages}
                    messagesRef={messagesRef}
                    notify={notify}
                    onShowEarlier={showEarlierMessages}
                    onToggleBookmark={toggleBookmarkForTurn}
                    onEditMessage={handleMessageEdit}
                    onRetryMessage={handleMessageRetry}
                    onLocateTurn={locateTurn}
                    onMessagesScroll={handleMessagesScroll}
                    onScrollTop={scrollMessagesToTop}
                    onScrollLatest={() => scrollMessagesToBottom("smooth")}
                    onAddAnnotation={addSelectionAnnotation}
                    onStart={() => composerRef.current?.focus()}
                    onAddContext={() => contextInputRef.current?.click()}
                    onOpenCommands={() => setCmdOpen(true)}
                    onOpenModelSettings={openModelSettings}
                  />

                  <Composer
                    editor={{
                      draftStore,
                      textareaRef: composerRef,
                      inputRef: contextInputRef,
                    }}
                    extras={{
                      extensionStatuses,
                      extensionWidgets,
                      annotations,
                      setAnnotations,
                      onLocateAnnotation: (messageId) =>
                        locateTurn(messageId, "smooth"),
                    }}
                    context={{
                      files: contextFiles,
                      onFiles: onContextFiles,
                      onDrop: onContextDrop,
                      onRemove: removeContext,
                      onReorder: reorderContext,
                      onPickFolder: pickContextFolder,
                      onReadBrowserFiles: readBrowserContext,
                    }}
                    autocomplete={{
                      commands: allSlashCommands,
                      bridge,
                      isShell,
                      workspaceCwd: activeSession?.cwd || workspace,
                      draftKey,
                    }}
                    menus={{
                      model,
                      availableModels,
                      modelOpen,
                      setModelOpen,
                      onSelectModel: applyModel,
                      onOpenModelsSettings: () => {
                        setSettingsTab("models");
                        setSettingsOpen(true);
                      },
                      reasoning,
                      reasoningOpen,
                      setReasoningOpen,
                      thinkingLevels,
                      onReasoningChange: (value) => {
                        applyReasoning(value);
                        notify("推理强度", value);
                      },
                    }}
                    status={{
                      planMode,
                      onTogglePlanMode: togglePlanMode,
                      pending,
                      streamActive,
                      interrupted,
                      compacting,
                      contextUsed:
                        contextTokens ||
                        sessionStats?.contextUsage?.tokens ||
                        null,
                      contextLimit:
                        sessionStats?.contextUsage?.contextWindow ||
                        model.contextWindow ||
                        null,
                    }}
                    actions={{
                      send,
                      stop: stopPi,
                      continueRun: continuePi,
                    }}
                    queue={{
                      items: queueItems,
                      expectedCount: queuedMessages,
                      busy: queueMutating,
                      onTakeBack: (item) => {
                        void takeBackQueueItem(item);
                      },
                      onDelete: (item) => {
                        void deleteQueueItem(item);
                      },
                      onSteer: (item) => {
                        void steerQueueItem(item);
                      },
                      onTakeBackAll: () => {
                        void takeBackAllQueue();
                      },
                    }}
                  />
                </main>
              </Panel>

            </Group>
          </div>
      </AppWindow>

      <CommandPalette
        open={cmdOpen}
        onOpenChange={setCmdOpen}
        commands={commands}
      />

      <DesignGallery
        open={gallery}
        onOpenChange={setGallery}
        onNotify={notify}
        model={model}
        reasoning={reasoning}
        onReasoningChange={applyReasoning}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenClose={() => setCloseOpen(true)}
        onOpenExtensions={() => setSheetMode("extensions")}
        onOpenModel={() => setModelOpen(true)}
        onOpenContext={() => setSheetMode("context")}
      />

      <UsageDialog
        open={usageOpen}
        onOpenChange={setUsageOpen}
        sessionStats={sessionStats}
        piStatus={piStatus}
        modelLabel={`${model.short} · ${model.provider || "Pi"}`}
        reasoning={reasoning}
        workspace={activeSession?.cwd || workspace}
        budgetUsd={budgetUsd}
        onBudgetUsd={setBudgetUsd}
      />

      <FileBrowserDialog
        open={filesOpen}
        onOpenChange={setFilesOpen}
        cwd={activeSession?.cwd || workspace}
        onNotify={notify}
      />

      <TerminalDialog
        open={terminalOpen}
        onOpenChange={setTerminalOpen}
        cwd={activeSession?.cwd || workspace}
      />

      <BranchDialog
        open={branchOpen}
        onOpenChange={setBranchOpen}
        cwd={activeSession?.cwd || workspace}
        branches={gitInfo.branches}
        current={gitInfo.branch || branch}
        onChanged={(info) => {
          setGitInfo(info);
          if (info.branch) {
            setBranch(info.branch);
          }
          refreshChanges();
        }}
        onCheckout={changeBranch}
        onNotify={notify}
      />

      <ArchivedSessionsDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        onRestored={refreshSessions}
        onNotify={notify}
      />

      <LogDialog
        open={logOpen}
        onOpenChange={setLogOpen}
        onNotify={notify}
      />

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        dark={dark}
        onDark={setDark}
        density={density}
        onDensity={setDensity}
        budgetUsd={budgetUsd}
        onBudgetUsd={setBudgetUsd}
        accentKey={accentKey}
        onAccent={setAccentKey}
        model={model}
        modelOptions={availableModels}
        onModel={applyModel}
        reasoning={reasoning}
        reasoningOptions={thinkingLevels}
        onReasoning={applyReasoning}
        tab={settingsTab}
        onTabChange={setSettingsTab}
        onImportPi={importPi}
        onRefreshModels={refreshModels}
        onPiLogin={openPiLogin}
        onRefreshAuth={refreshAuth}
        authProviders={authProviders}
        onOpenCustomProvider={() => {
          setSettingsOpen(false);
          setCustomProviderOpen(true);
        }}
        updateStatus={updateStatus}
        piUpdateStatus={piUpdateStatus}
        onCheckUpdate={checkUpdate}
        onDownloadUpdate={downloadUpdate}
        onInstallUpdate={installUpdate}
        onSaveUpdateFeed={saveUpdateFeed}
        onClearUpdateFeed={clearUpdateFeed}
        onCheckPiUpdate={checkPiUpdate}
        onInstallPiUpdate={installPiUpdate}
        onRestorePiKernel={restorePiKernel}
        onOpenModelBrowser={() => {
          setSettingsOpen(false);
          setModelBrowserOpen(true);
        }}
        onOpenFiles={() => {
          setSettingsOpen(false);
          setFilesOpen(true);
        }}
        onOpenTerminal={() => {
          setSettingsOpen(false);
          setTerminalOpen(true);
        }}
        onOpenBranches={() => {
          setSettingsOpen(false);
          setBranchOpen(true);
        }}
        onOpenArchive={() => {
          setSettingsOpen(false);
          setArchiveOpen(true);
        }}
        onOpenLog={() => {
          setSettingsOpen(false);
          setLogOpen(true);
        }}
        onOpenExtensions={() => {
          setSettingsOpen(false);
          setSheetMode("extensions");
        }}
        onExportSession={() => {
          setSettingsOpen(false);
          if (activeSession) {
            exportSessionFile(activeSession);
          } else {
            notify("无法导出", "当前还没有选中会话");
          }
        }}
        onOpenRemote={() => {
          setSettingsOpen(false);
          setRemoteOpen(true);
        }}
        onClearProviders={clearProviders}
        restore={restoreSession}
        onRestore={changeRestoreSession}
        streaming={streaming}
        onStreaming={changeStreaming}
        autoCompact={autoCompact}
        onAutoCompact={changeAutoCompact}
        onOpenModels={() => {
          if (isShell) {
            bridge?.openModelsConfig();
          } else {
            notify("models.json", "桌面壳中可直接打开");
          }
        }}
        onSave={() =>
          notify("设置已保存", "写入 TesT 的 Pi 数据目录")
        }
      />

      <LoginDialog
        open={nativeLoginOpen}
        onOpenChange={setNativeLoginOpen}
        onNotify={notify}
        onSuccess={() => {
          refreshAuth();
          refreshModels();
        }}
      />

      <CustomProviderDialog
        open={customProviderOpen}
        onOpenChange={setCustomProviderOpen}
        onNotify={notify}
        onSaved={() => {
          refreshModels();
          refreshAuth();
        }}
      />

      <ModelBrowserDialog
        open={modelBrowserOpen}
        onOpenChange={setModelBrowserOpen}
        onSelect={selectCatalogModel}
        onNotify={notify}
      />

      <RemoteDialog
        open={remoteOpen}
        onOpenChange={setRemoteOpen}
        status={remoteStatus}
        onStart={startRemote}
        onStop={stopRemote}
        onRefresh={refreshRemoteToken}
        onStartTunnel={startRemoteTunnel}
        onStopTunnel={stopRemoteTunnel}
        onNotify={notify}
      />

      <DeleteSessionDialog
        open={Boolean(deleteTarget)}
        title={deleteTarget?.title || ""}
        onOpenChange={(value) => {
          if (!value) {
            setDeleteTarget(null);
          }
        }}
        onConfirm={() => {
          if (deleteTarget) {
            deleteSession(deleteTarget);
          }
          setDeleteTarget(null);
        }}
      />

      <ExtensionPromptDialog
        prompt={extensionPrompt}
        onRespond={respondExtension}
        onCancel={cancelExtension}
      />

      <RenameDialog
        open={renameOpen}
        value={renameTarget?.title || ""}
        onOpenChange={(value) => {
          setRenameOpen(value);
          if (!value) {
            setRenameTarget(null);
          }
        }}
        onSave={renameSession}
      />

      <DiffDialog
        open={diffOpen}
        onOpenChange={(value) => {
          setDiffOpen(value);
          if (!value) {
            setDiffFile(null);
            setDiffPatch("");
          }
        }}
        file={diffFile}
        patch={diffPatch}
        loading={diffLoading}
      source={diffSource}
      staging={staging}
      stagingHunk={stagingHunk}
      revertingHunk={revertingHunk}
      revertingFile={revertingFile}
      onStage={stageFile}
      onUnstage={unstageFile}
      onStageHunk={stageHunk}
      onRevertHunk={revertHunk}
      onRevertFile={revertFile}
      />

      <CommitDialog
        open={commitOpen}
        onOpenChange={setCommitOpen}
        count={changes.filter((file) => file.staged).length}
        committing={committing}
        onCommit={commitChanges}
      />

      <SessionSearchDialog
        open={sessionSearchOpen}
        onOpenChange={(value) => {
          setSessionSearchOpen(value);
          if (!value) {
            setSessionQuery("");
            setSessionResults([]);
          }
        }}
        query={sessionQuery}
        onQuery={setSessionQuery}
        results={sessionResults}
        loading={sessionSearching}
        onSelect={openSearchResult}
      />

      <ExtensionSheet
        open={sheetMode === "extensions"}
        onOpenChange={(open) => setSheetMode(open ? "extensions" : null)}
        skills={extensionData.skills}
        extensions={extensionData.extensions}
        project={extensionProject}
        onToggle={toggleExtension}
        onRemove={removeExtension}
        onDrop={installExtension}
        onInstallSource={installPackage}
        onOpenFolder={openExtensionsFolder}
        onTrustProject={trustProject}
      />

      <ContextSheet
        open={sheetMode === "context"}
        onOpenChange={(open) => setSheetMode(open ? "context" : null)}
        model={model}
        branch={branch}
        branches={gitInfo.branches}
        live={isShell}
        stats={sessionStats}
        contextTokens={contextTokens}
        sessionPath={activeSessionPath}
        cwd={activeSession?.cwd || workspace}
        onBranch={changeBranch}
        gitRepo={gitInfo.repo || changes.length > 0}
        budget={budgetUsd}
        changes={changes}
        onRefreshChanges={refreshChanges}
        onOpenDiff={openDiff}
        onCommit={() => setCommitOpen(true)}
        onOpenFiles={() => setFilesOpen(true)}
        onManageBranches={() => setBranchOpen(true)}
        onConfigureModel={() => {
          setSheetMode(null);
          openModelSettings();
        }}
      />

      <CloseDialog
        open={closeOpen}
        onOpenChange={setCloseOpen}
        onConfirm={() => {
          setCloseOpen(false);
          if (isShell) {
            bridge?.windowAction("close");
          } else {
            notify("TesT 已退出（原型）", "桌面壳接管后会真正结束进程");
          }
        }}
      />

      {toast && <Toast data={toast} onClose={() => setToast(null)} />}
    </AppFrame>
  );
}
