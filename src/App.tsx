import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ButtonHTMLAttributes, DragEvent, ReactNode } from "react";
import emptyBug from "./assets/empty-bug.png";
import brandTerminal from "./assets/brand-terminal.png";
import MarkdownText from "./Markdown";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import * as SelectPrimitive from "@radix-ui/react-select";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Group, Panel, Separator } from "react-resizable-panels";
import {
  Archive,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Bell,
  BookOpen,
  Brain,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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
import { FitAddon } from "@xterm/addon-fit";
import { Terminal as XTerm } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import {
  ArrowUp as ArrowUpNode,
  Check as CheckNode,
  Copy as CopyNode,
  Minus as MinusNode,
  Moon as MoonNode,
  Square as SquareNode,
  Sun as SunNode,
  X as XNode,
} from "lucide";

type Tone = "gray" | "mint" | "blue" | "red" | "amber";
type Density = "comfortable" | "compact";

type Session = {
  title: string;
  meta: string;
  tag?: string;
  unread?: boolean;
  path?: string;
  id?: string;
  cwd?: string;
  messageCount?: number;
  modified?: string;
  parentPath?: string;
  depth?: number;
};

type SessionTab = {
  path: string;
  title: string;
};

type SessionStats = {
  sessionFile?: string;
  sessionId?: string;
  userMessages: number;
  assistantMessages: number;
  toolCalls: number;
  toolResults: number;
  totalMessages: number;
  tokens: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    total: number;
  };
  cost?: number;
  contextUsage?: {
    tokens: number | null;
    contextWindow: number;
    percent: number | null;
  };
};

type UsageStats = TesTUsageStats;

type PiCommandInfo = {
  name: string;
  description?: string;
  source: "extension" | "prompt" | "skill";
};

type ExtensionPrompt = {
  id: string;
  method: "select" | "confirm" | "input" | "editor";
  title?: string;
  message?: string;
  placeholder?: string;
  options?: string[];
  prefill?: string;
};

type LiveTool = {
  id: string;
  name: string;
  args?: unknown;
  partial?: unknown;
  result?: unknown;
  state: "running" | "done" | "error";
  startedAt: number;
  durationMs?: number;
};

type UpdateStatus = {
  state: string;
  message?: string;
  version?: string;
  feedUrl?: string | null;
  availableVersion?: string | null;
  percent?: number;
};

type PiUpdateStatus = {
  state: string;
  message?: string;
  currentVersion?: string;
  latestVersion?: string;
  percent?: number;
  source?: string;
  packageName?: string;
};

type CatalogModel = {
  id: string;
  name: string;
  provider: string;
  providerName: string;
  contextWindow: number | null;
  reasoning: boolean;
  available: boolean;
};

type CatalogProvider = {
  id: string;
  name: string;
  available: boolean;
  modelCount: number;
};

class TextStreamStore {
  private text = "";
  private listeners = new Set<() => void>();
  private frame: number | null = null;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.text;

  append(delta: string) {
    this.text += delta;
    if (this.frame === null) {
      this.frame = window.requestAnimationFrame(() => {
        this.frame = null;
        this.listeners.forEach((listener) => listener());
      });
    }
  }

  reset() {
    if (this.frame !== null) {
      window.cancelAnimationFrame(this.frame);
      this.frame = null;
    }
    this.text = "";
    this.listeners.forEach((listener) => listener());
  }
}

const streamStore = new TextStreamStore();

type TreeNode = {
  name: string;
  children?: TreeNode[];
  sessions?: Session[];
};

type Model = {
  id: string;
  label: string;
  short: string;
  provider: string;
  ctx: string;
  contextWindow?: number;
  badge?: string;
};

type ContextAttachment = {
  id: string;
  path: string;
  name: string;
  size: number;
  kind: "text" | "image";
  mimeType?: string;
  text?: string;
  data?: string;
};

type GitChange = {
  path: string;
  status: string;
  staged?: boolean;
  unstaged?: boolean;
  additions: number;
  deletions: number;
};

type Extension = {
  name: string;
  kind: "技能" | "扩展";
  desc: string;
  enabled: boolean;
  scope?: "global" | "project";
  readonly?: boolean;
  path?: string;
};

type ToastData = {
  id: number;
  title: string;
  desc?: string;
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

const accents = {
  mint: {
    label: "薄荷",
    light: "#1f9d74",
    lightHover: "#188561",
    dark: "#3ddc97",
    darkHover: "#63e8ad",
    softLight: "#e9f6f0",
    softDark: "#13251d",
  },
  graphite: {
    label: "石墨",
    light: "#4b4b47",
    lightHover: "#35352f",
    dark: "#cfd6d0",
    darkHover: "#e3e9e4",
    softLight: "#f0f0ed",
    softDark: "#1c2420",
  },
  ocean: {
    label: "海蓝",
    light: "#2f6fbf",
    lightHover: "#255a9c",
    dark: "#7db6ef",
    darkHover: "#9ac8f5",
    softLight: "#eaf2fc",
    softDark: "#152333",
  },
} as const;

type AccentKey = keyof typeof accents;

type ShortcutEntry = {
  id?: string;
  label: string;
  keys: string[];
};

const shortcuts: ShortcutEntry[] = [
  { id: "commandPalette", label: "命令面板", keys: ["Ctrl", "K"] },
  { label: "斜杠命令", keys: ["/"] },
  { label: "文件引用", keys: ["@"] },
  { id: "newSession", label: "新建会话", keys: ["Ctrl", "N"] },
  { id: "closeTab", label: "关闭当前标签", keys: ["Ctrl", "W"] },
  { id: "cycleTab", label: "切换标签", keys: ["Ctrl", "Tab"] },
  { id: "find", label: "会话内查找", keys: ["Ctrl", "F"] },
  { id: "sessionSearch", label: "搜索会话", keys: ["Ctrl", "Shift", "F"] },
  { id: "settings", label: "打开设置", keys: ["Ctrl", ","] },
  { label: "发送消息", keys: ["Enter"] },
  { label: "换行", keys: ["Shift", "Enter"] },
  { label: "关闭弹层", keys: ["Esc"] },
];

function shortcutText(id: string, fallback: string[]) {
  try {
    const overrides = JSON.parse(
      localStorage.getItem("tesT.shortcuts") || "{}",
    );
    return typeof overrides?.[id] === "string"
      ? overrides[id]
      : fallback.join("+");
  } catch {
    return fallback.join("+");
  }
}

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

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

function relativeSessionTime(value?: string) {
  if (!value) {
    return "";
  }

  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) {
    return "";
  }

  const diff = Math.max(0, Date.now() - time);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) {
    return "刚刚";
  }
  if (diff < hour) {
    return `${Math.floor(diff / minute)} 分钟前`;
  }
  if (diff < day) {
    return `${Math.floor(diff / hour)} 小时前`;
  }
  if (diff < 7 * day) {
    return `${Math.floor(diff / day)} 天前`;
  }

  return new Date(time).toLocaleDateString("zh-CN", {
    month: "numeric",
    day: "numeric",
  });
}

function workspaceLabel(value: string) {
  const clean = String(value || "").replace(/[\\/]+$/, "");
  return clean.split(/[\\/]/).pop() || clean || "工作区";
}

function sameWorkspacePath(a?: string, b?: string) {
  if (!a || !b) {
    return false;
  }
  const left = a.replace(/[\\/]+$/, "").toLowerCase();
  const right = b.replace(/[\\/]+$/, "").toLowerCase();
  return left === right;
}

function buildSessionTree(sessions: SessionInfo[]): TreeNode {
  const root: TreeNode = { name: "Pi", children: [] };
  for (const info of sessions) {
    const parts = (info.cwd || "未分组")
      .replace(/[\\/]+$/, "")
      .split(/[\\/]+/)
      .filter(Boolean);
    const segments = (parts.length > 0 ? parts : ["未分组"]).slice(-5);
    let node = root;

    for (const segment of segments) {
      node.children ??= [];
      let child = node.children.find((item) => item.name === segment);
      if (!child) {
        child = { name: segment, children: [], sessions: [] };
        node.children.push(child);
      }
      node = child;
    }

    node.sessions ??= [];
    node.sessions.push({
      title: info.name || info.firstMessage || "新会话",
      meta: relativeSessionTime(info.modified),
      path: info.path,
      id: info.id,
      cwd: info.cwd,
      messageCount: info.messageCount,
      modified: info.modified,
      parentPath: info.parentSessionPath || undefined,
    });
  }

  const nestSessions = (node: TreeNode) => {
    const sessions = node.sessions ?? [];
    if (sessions.length > 1) {
      const byPath = new Map(
        sessions
          .filter((session) => session.path)
          .map((session) => [session.path as string, session]),
      );
      const children = new Map<string, Session[]>();
      const roots: Session[] = [];
      for (const session of sessions) {
        const parent =
          session.parentPath && byPath.get(session.parentPath);
        if (parent && parent !== session) {
          const list = children.get(parent.path as string) || [];
          list.push(session);
          children.set(parent.path as string, list);
        } else {
          roots.push(session);
        }
      }
      const sortByModified = (a: Session, b: Session) =>
        new Date(b.modified || 0).getTime() -
        new Date(a.modified || 0).getTime();
      const ordered: Session[] = [];
      const visited = new Set<string>();
      const walk = (session: Session, depth: number) => {
        if (session.path && visited.has(session.path)) {
          return;
        }
        if (session.path) {
          visited.add(session.path);
        }
        ordered.push({ ...session, depth });
        const kids = children.get(session.path as string) || [];
        kids.sort(sortByModified).forEach((child) =>
          walk(child, depth + 1),
        );
      };
      roots.sort(sortByModified).forEach((session) => walk(session, 0));
      sessions
        .filter((session) => !session.path || !visited.has(session.path))
        .sort(sortByModified)
        .forEach((session) => ordered.push({ ...session, depth: 0 }));
      node.sessions = ordered;
    } else if (sessions.length === 1) {
      node.sessions = [{ ...sessions[0], depth: 0 }];
    }
    node.children?.forEach(nestSessions);
  };
  nestSessions(root);

  const sortNode = (node: TreeNode) => {
    node.children?.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
    node.children?.forEach(sortNode);
  };
  sortNode(root);
  return root;
}

function formatTokenCount(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0";
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${Math.round(value / 1_000)}k`;
  }
  return String(Math.round(value));
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0 B";
  }
  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (value >= 1024) {
    return `${Math.round(value / 1024)} KB`;
  }
  return `${Math.round(value)} B`;
}

function formatCost(value?: number) {
  if (!Number.isFinite(value)) {
    return "—";
  }
  if ((value ?? 0) <= 0) {
    return "$0.00";
  }
  return value! >= 0.01 ? `$${value!.toFixed(2)}` : `$${value!.toFixed(4)}`;
}

function messageCount(stats?: SessionStats | null) {
  return stats
    ? stats.userMessages + stats.assistantMessages + stats.toolResults
    : 0;
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

type DiffHunk = {
  header: string;
  lines: string[];
};

function parseDiff(patch: string): {
  header: string[];
  hunks: DiffHunk[];
} | null {
  const lines = patch.split(/\r?\n/);
  const first = lines.findIndex((line) => line.startsWith("@@"));
  if (first < 0) {
    return null;
  }
  const header = lines.slice(0, first);
  const hunks: DiffHunk[] = [];
  let current: DiffHunk | null = null;
  for (let index = first; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.startsWith("@@")) {
      if (current) {
        hunks.push(current);
      }
      current = { header: line, lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) {
    hunks.push(current);
  }
  return { header, hunks };
}

function toolTarget(tool: LiveTool) {
  const args = tool.args;
  if (args && typeof args === "object") {
    const record = args as Record<string, unknown>;
    for (const key of ["path", "file", "file_path", "command", "query", "url"]) {
      if (typeof record[key] === "string" && record[key]) {
        return String(record[key]);
      }
    }
  }
  return tool.name;
}

function previewValue(value: unknown) {
  if (value === undefined || value === null) {
    return "";
  }

  try {
    const text =
      typeof value === "string" ? value : JSON.stringify(value, null, 2);
    return text.length > 1200 ? `${text.slice(0, 1200)}…` : text;
  } catch {
    return String(value);
  }
}

function fromPiModel(item: any): Model {
  const context = Number(item?.contextWindow ?? 0);
  const contextLabel =
    context >= 1_000_000
      ? `${Math.round(context / 1_000_000)}M`
      : context >= 1_000
        ? `${Math.round(context / 1_000)}k`
        : context > 0
          ? String(context)
          : "—";
  const name = item?.name || item?.id || "未命名模型";
  return {
    id: item?.id || "",
    label: name,
    short: name,
    provider: item?.provider || "pi",
    ctx: contextLabel,
    contextWindow: context,
    badge: item?.reasoning ? "R" : undefined,
  };
}

function extractPiText(message: any): string {
  if (!message) return "";
  if (typeof message.content === "string") return message.content;
  if (Array.isArray(message.content)) {
    return message.content
      .filter((block: any) => block?.type === "text")
      .map((block: any) => block.text ?? "")
      .join("");
  }
  return typeof message.text === "string" ? message.text : "";
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
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

function Tag({
  children,
  tone = "gray",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return <span className={`tag tag-${tone}`}>{children}</span>;
}

type ButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "className"
> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "icon";
  size?: "sm" | "md";
  className?: string;
  icon?: ReactNode;
  iconAfter?: ReactNode;
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    variant = "secondary",
    size = "md",
    className,
    icon,
    iconAfter,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={rest.type ?? "button"}
      className={`btn btn-${variant} btn-${size} ${className ?? ""}`}
      {...rest}
    >
      {icon ? <span className="btn-glyph">{icon}</span> : null}
      {children}
      {iconAfter ? <span className="btn-glyph">{iconAfter}</span> : null}
    </button>
  );
});

function Tooltip({
  tip,
  children,
}: {
  tip: string;
  children: ReactNode;
}) {
  return (
    <TooltipPrimitive.Root delayDuration={320}>
      <TooltipPrimitive.Trigger asChild>
        <span className="tip-trigger">{children}</span>
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content className="tip-content" sideOffset={7}>
          {tip}
          <TooltipPrimitive.Arrow className="tip-arrow" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

function Switch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <SwitchPrimitive.Root
      className={`switch ${checked ? "on" : ""}`}
      checked={checked}
      onCheckedChange={onChange}
    >
      <SwitchPrimitive.Thumb className="switch-thumb">
        <MorphIcon
          icon={checked ? CheckNode : MinusNode}
          size={9}
          strokeWidth={3}
          aria-hidden="true"
        />
      </SwitchPrimitive.Thumb>
    </SwitchPrimitive.Root>
  );
}

function Checkbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <CheckboxPrimitive.Root
      className={`checkbox ${checked ? "on" : ""}`}
      checked={checked}
      onCheckedChange={onChange}
    >
      <CheckboxPrimitive.Indicator>
        <Check size={11} strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

function Progress({ value }: { value: number }) {
  return (
    <ProgressPrimitive.Root className="meter" value={value}>
      <ProgressPrimitive.Indicator
        className="meter-indicator"
        style={{ transform: `translateX(-${100 - value}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

function Segmented({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string; icon?: ReactNode }[];
  onChange: (value: string) => void;
}) {
  return (
    <RadioGroupPrimitive.Root
      className="segmented"
      value={value}
      onValueChange={onChange}
    >
      {options.map((option) => (
        <RadioGroupPrimitive.Item
          key={option.value}
          value={option.value}
          className="segmented-item"
        >
          {option.icon ? (
            <span className="segmented-icon">{option.icon}</span>
          ) : null}
          {option.label}
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button"
      className={`copy-btn ${copied ? "copied" : ""}`}
      onClick={async () => {
        const ok = await copyText(text);
        setCopied(ok);
        window.setTimeout(() => setCopied(false), 1500);
      }}
    >
      <MorphIcon icon={copied ? CheckNode : CopyNode} size={13} />
      <span>{copied ? "已复制" : "复制"}</span>
    </button>
  );
}

function DotSpinner() {
  return (
    <span className="dot-spinner">
      <i />
      <i />
      <i />
    </span>
  );
}

function ToolCard({
  name,
  target,
  duration,
  state = "done",
  children,
}: {
  name: string;
  target: string;
  duration?: string;
  state?: "done" | "running" | "error";
  children?: ReactNode;
}) {
  return (
    <CollapsiblePrimitive.Root className={`tool-card ${state}`}>
      <CollapsiblePrimitive.Trigger asChild>
        <button type="button" className="tool-head">
          <span className="tool-icon">
            <Wrench size={11} />
          </span>
          <span className="tool-name">{name}</span>
          <code>{target}</code>
          <span className="tool-state">
            {state === "running" ? (
              <>
                <span className="ring" /> 运行中
              </>
            ) : state === "error" ? (
              <>失败</>
            ) : (
              <>
                <Check size={11} /> {duration}
              </>
            )}
          </span>
          <ChevronRight size={12} className="tool-chev" />
        </button>
      </CollapsiblePrimitive.Trigger>
      <CollapsiblePrimitive.Content className="tool-content">
        {children && <div className="tool-body">{children}</div>}
      </CollapsiblePrimitive.Content>
    </CollapsiblePrimitive.Root>
  );
}

function PlanCard() {
  const steps = [
    { label: "定布局与栅格", state: "done" },
    { label: "锁定颜色 / 圆角 / 动效", state: "done" },
    { label: "接入 Pi RPC", state: "now" },
  ] as const;

  return (
    <div className="plan-card">
      <div className="plan-head">
        <Sparkles size={12} />
        执行计划
        <Tag tone="mint">2 / 3</Tag>
      </div>
      {steps.map((step) => (
        <div className={`plan-step ${step.state}`} key={step.label}>
          <span className="plan-check">
            {step.state === "done" ? (
              <Check size={9} strokeWidth={3} />
            ) : (
              <span className="plan-dot" />
            )}
          </span>
          <span>{step.label}</span>
          {step.state === "now" && <span className="plan-now">进行中</span>}
        </div>
      ))}
    </div>
  );
}

function CodeCard({ code, lang = "tsx" }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="code-card">
      <div className="code-head">
        <FileText size={11} />
        <span>{lang}</span>
        <button type="button"
          className="code-copy"
          onClick={async () => {
            const ok = await copyText(code);
            setCopied(ok);
            window.setTimeout(() => setCopied(false), 1400);
          }}
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? "已复制" : "复制"}
        </button>
      </div>
      <pre>{code}</pre>
    </div>
  );
}

function CaptionButtons({
  small = false,
  onMinimize,
  onMaximize,
  onClose,
}: {
  small?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
}) {
  return (
    <div className={`caption ${small ? "small" : ""}`}>
      <button type="button"
        className="cap"
        aria-label="最小化"
        title="最小化"
        onClick={onMinimize}
      >
        <Minus size={small ? 9 : 13} />
      </button>
      <button type="button"
        className="cap"
        aria-label="最大化"
        title="最大化 / 还原"
        onClick={onMaximize}
      >
        <Square size={small ? 7 : 10} />
      </button>
      <button type="button"
        className="cap close"
        aria-label="关闭"
        title="关闭"
        onClick={onClose}
      >
        <X size={small ? 9 : 14} />
      </button>
    </div>
  );
}

function Toast({
  data,
  onClose,
}: {
  data: ToastData;
  onClose: () => void;
}) {
  return (
    <div className="toast" key={data.id}>
      <span className="toast-icon">
        <Check size={13} strokeWidth={2.5} />
      </span>
      <div className="toast-body">
        <div className="toast-title">{data.title}</div>
        {data.desc && <div className="toast-desc">{data.desc}</div>}
      </div>
      <button type="button" className="toast-close" onClick={onClose} aria-label="关闭提示">
        <X size={12} />
      </button>
      <span className="toast-progress" />
    </div>
  );
}

function StreamingBubble({ model }: { model: Model }) {
  const text = useSyncExternalStore(
    streamStore.subscribe,
    streamStore.getSnapshot,
    streamStore.getSnapshot,
  );

  if (!text) {
    return null;
  }

  return (
    <div className="message assistant">
      <div className="msg-meta">
        <span className="model-chip">
          <span className="model-dot" />
          {model.label}
        </span>
      </div>
      <div className="assistant-text">
        <MarkdownText text={text} />
        <span className="caret" />
      </div>
    </div>
  );
}

function ContextCards({
  model,
  branch,
  branches = [],
  live = false,
  stats,
  contextTokens = 0,
  sessionPath,
  cwd,
  onBranch,
  gitRepo = true,
  budget = 0,
  changes = [],
  onRefreshChanges,
  onOpenDiff,
  onCommit,
  onOpenFiles,
  onManageBranches,
}: {
  model: Model;
  branch: string;
  branches?: string[];
  live?: boolean;
  stats?: SessionStats | null;
  contextTokens?: number;
  sessionPath?: string;
  cwd?: string;
  onBranch: (value: string) => void;
  gitRepo?: boolean;
  budget?: number;
  changes?: GitChange[];
  onRefreshChanges?: () => void;
  onOpenDiff?: (change: GitChange) => void;
  onCommit?: () => void;
  onOpenFiles?: () => void;
  onManageBranches?: () => void;
}) {
  const measuredContextTokens = live
    ? contextTokens || stats?.contextUsage?.tokens || null
    : 84_000;
  const contextUsed = measuredContextTokens ?? 0;
  const contextTotal =
    (live ? stats?.contextUsage?.contextWindow : null) ||
    model.contextWindow ||
    200_000;
  const contextPercent =
    live && !contextTokens && stats?.contextUsage?.percent != null
      ? Math.min(100, Math.round(stats.contextUsage.percent * 10) / 10)
      : contextTotal
        ? Math.min(100, Math.round((contextUsed / contextTotal) * 1000) / 10)
        : 0;
  const branchOptions = branches.length ? branches : [branch];

  return (
    <>
      <div className="stat-strip">
        <div>
          <b>{live ? messageCount(stats) : 24}</b>
          <span>消息</span>
        </div>
        <div>
          <b>{live ? (stats?.toolCalls ?? 0) : 12}</b>
          <span>工具调用</span>
        </div>
        <div>
          <b>
            {live
              ? formatTokenCount(stats?.tokens.total ?? 0)
              : "84k"}
          </b>
          <span title="整段会话累计消耗">累计 Tokens</span>
        </div>
        <div>
          <b
            className={
              budget > 0 && (stats?.cost ?? 0) > budget ? "over" : undefined
            }
          >
            {live ? formatCost(stats?.cost) : "$0.42"}
          </b>
          <span>{budget > 0 ? `预算 $${budget}` : "累计成本"}</span>
        </div>
      </div>

      <section className="ctx-card">
        <div className="ctx-card-head">
          <Cpu size={12} />
          <span>模型</span>
        </div>
        <div className="model-row">
          <span className="provider">{model.provider[0]}</span>
          <div>
            <b>{model.label}</b>
            <small>
              {model.provider} · {model.ctx} context
            </small>
          </div>
          {!model.id && <Tag tone="amber">未配置</Tag>}
        </div>
        <Progress value={measuredContextTokens === null ? 0 : contextPercent} />
        <div className="meter-foot">
          <span>
            {measuredContextTokens === null
              ? `— / ${formatTokenCount(contextTotal)} tokens`
              : `${formatTokenCount(contextUsed)} / ${formatTokenCount(
                  contextTotal,
                )} tokens`}
          </span>
          <span>{measuredContextTokens === null ? "—" : `${contextPercent}%`}</span>
        </div>
      </section>

      <section className="ctx-card">
        <div className="ctx-card-head">
          <FolderOpen size={12} />
          <span>工作区</span>
        </div>
        <div className="kv">
          <span>目录</span>
          <code>{cwd || sessionPath || "—"}</code>
        </div>
        {onOpenFiles && (
          <button
            className="ctx-link"
            onClick={onOpenFiles}
            type="button"
          >
            <FileText size={12} />
            浏览工作区文件
            <ChevronRight size={11} />
          </button>
        )}
        <div className="kv">
          <span>分支</span>
          <div className="branch-kv-control">
            {gitRepo ? (
              <>
                <SelectPrimitive.Root value={branch} onValueChange={onBranch}>
                  <SelectPrimitive.Trigger className="select-trigger compact">
                    <span className="branch">
                      <GitBranch size={11} />
                      <SelectPrimitive.Value />
                    </span>
                    <ChevronDown size={10} />
                  </SelectPrimitive.Trigger>
                  <SelectPrimitive.Portal>
                    <SelectPrimitive.Content
                      className="select-content branch-select"
                      position="popper"
                      sideOffset={4}
                    >
                      <SelectPrimitive.Viewport className="select-viewport">
                        {branchOptions.map((item) => (
                          <SelectPrimitive.Item
                            key={item}
                            value={item}
                            className="select-item"
                          >
                            <SelectPrimitive.ItemIndicator className="select-indicator">
                              <Check size={10} />
                            </SelectPrimitive.ItemIndicator>
                            <SelectPrimitive.ItemText>
                              {item}
                            </SelectPrimitive.ItemText>
                          </SelectPrimitive.Item>
                        ))}
                      </SelectPrimitive.Viewport>
                    </SelectPrimitive.Content>
                  </SelectPrimitive.Portal>
                </SelectPrimitive.Root>
                {onManageBranches && (
                  <button
                    type="button"
                    className="branch-manage"
                    title="管理分支"
                    onClick={onManageBranches}
                  >
                    <Plus size={11} />
                  </button>
                )}
              </>
            ) : (
              <span className="branch-not-repo">
                <GitBranch size={11} />
                非 Git 工作区
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="ctx-card">
        <div className="ctx-card-head">
          <FileText size={12} />
          <span>本轮改动</span>
          <Tag>{changes.length}</Tag>
          {onRefreshChanges && (
            <button type="button"
              className="ctx-refresh"
              onClick={onRefreshChanges}
              title="刷新改动"
            >
              <RotateCcw size={11} />
            </button>
          )}
          {onCommit && changes.some((file) => file.staged) && (
            <button type="button"
              className="ctx-refresh"
              onClick={onCommit}
              title="提交已暂存改动"
            >
              <Check size={11} />
            </button>
          )}
        </div>
        <div className="file-list">
          {changes.length === 0 ? (
            <div className="file-empty">
              {gitRepo ? "本轮还没有文件改动" : "当前工作区不是 Git 仓库"}
            </div>
          ) : (
            changes.map((file) => (
              <button type="button"
                className="file-row"
                key={file.path}
                onClick={() => onOpenDiff?.(file)}
                title={file.path}
              >
                <FileText size={11} />
                <span className="file-name">{file.path}</span>
                <span
                  className={`file-status ${
                    file.status === "?"
                      ? "untracked"
                      : file.status === "D"
                        ? "deleted"
                        : "modified"
                  }`}
                >
                  {file.status}
                </span>
                {file.additions > 0 && (
                  <small className="add">+{file.additions}</small>
                )}
                {file.deletions > 0 && (
                  <small className="del">-{file.deletions}</small>
                )}
              </button>
            ))
          )}
        </div>
      </section>

    </>
  );
}

function SessionSearchDialog({
  open,
  onOpenChange,
  query,
  onQuery,
  results,
  loading,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  onQuery: (value: string) => void;
  results: TesTSessionSearchResult[];
  loading: boolean;
  onSelect: (result: TesTSessionSearchResult) => void;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="rx-overlay" />
        <DialogPrimitive.Content className="dialog session-search-dialog">
          <div className="dialog-head">
            <div>
              <DialogPrimitive.Title className="dialog-title">
                搜索会话内容
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="dialog-desc">
                搜索标题、cwd 和消息正文
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="icon" aria-label="关闭">
                <X size={15} />
              </Button>
            </DialogPrimitive.Close>
          </div>
          <div className="session-search-input">
            <Search size={13} />
            <input
              autoFocus
              value={query}
              onChange={(event) => onQuery(event.target.value)}
              placeholder="输入关键词，至少 2 个字符…"
            />
            <kbd>Ctrl Shift F</kbd>
          </div>
          <div className="session-search-list">
            {loading && <div className="diff-empty">搜索中…</div>}
            {!loading &&
              query.trim().length >= 2 &&
              results.length === 0 && (
                <div className="diff-empty">没有匹配的会话</div>
              )}
            {!loading &&
              results.map((result) => (
                <button type="button"
                  className="session-search-row"
                  key={result.path}
                  onClick={() => onSelect(result)}
                >
                  <span className="session-search-main">
                    <span className="session-search-title">
                      <Search size={11} />
                      <b>
                        {result.name ||
                          result.firstMessage ||
                          "未命名会话"}
                      </b>
                    </span>
                    <small>{result.cwd || result.path}</small>
                    <span>{result.snippet}</span>
                  </span>
                  <small className="session-search-meta">
                    {result.role === "user"
                      ? "你"
                      : result.role === "assistant"
                        ? "Pi"
                        : "标题"}{" "}
                    · {relativeSessionTime(result.modified)}
                  </small>
                </button>
              ))}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function CommitDialog({
  open,
  onOpenChange,
  count,
  committing,
  onCommit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  count: number;
  committing: boolean;
  onCommit: (message: string) => void;
}) {
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (open) {
      setMessage("");
    }
  }, [open]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="rx-overlay" />
        <DialogPrimitive.Content className="dialog small">
          <div className="dialog-head">
            <div>
              <DialogPrimitive.Title className="dialog-title">
                提交改动
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="dialog-desc">
                只会提交已暂存的 {count} 个文件
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="icon" aria-label="关闭">
                <X size={15} />
              </Button>
            </DialogPrimitive.Close>
          </div>
          <div className="dialog-body">
            <textarea
              className="input"
              rows={3}
              autoFocus
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="提交信息，例如 fix: polish composer"
            />
          </div>
          <div className="dialog-foot">
            <span className="muted">git commit</span>
            <div>
              <Button
                variant="secondary"
                icon={<X size={13} />}
                onClick={() => onOpenChange(false)}
              >
                取消
              </Button>
              <Button
                variant="primary"
                icon={
                  committing ? (
                    <RefreshCw size={13} className="spin" />
                  ) : (
                    <GitCommitHorizontal size={13} />
                  )
                }
                disabled={!message.trim() || committing}
                onClick={() => onCommit(message.trim())}
              >
                {committing ? "提交中…" : "提交"}
              </Button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function DiffDialog({
  open,
  onOpenChange,
  file,
  patch,
  loading,
  source,
  staging,
  stagingHunk,
  revertingHunk,
  revertingFile,
  onStage,
  onUnstage,
  onStageHunk,
  onRevertHunk,
  onRevertFile,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: GitChange | null;
  patch: string;
  loading: boolean;
  source?: "worktree" | "index" | "file";
  staging?: boolean;
  stagingHunk?: boolean;
  revertingHunk?: boolean;
  revertingFile?: boolean;
  onStage?: (file: GitChange) => void;
  onUnstage?: (file: GitChange) => void;
  onStageHunk?: (patch: string) => void;
  onRevertHunk?: (patch: string) => void;
  onRevertFile?: (file: GitChange) => void;
}) {
  const lines = patch ? patch.split(/\r?\n/) : [];
  const parsed = useMemo(() => parseDiff(patch), [patch]);
  const canStageHunk = Boolean(file?.unstaged && source === "worktree");
  const [pendingRevert, setPendingRevert] = useState<number | null>(null);
  const [pendingRevertFile, setPendingRevertFile] = useState(false);

  useEffect(() => {
    setPendingRevert(null);
    setPendingRevertFile(false);
  }, [patch]);
  const statusLabel =
    file?.status === "?"
      ? "新增文件"
      : file?.status === "D"
        ? "删除文件"
        : "修改文件";

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="rx-overlay" />
        <DialogPrimitive.Content className="dialog diff-dialog">
          <div className="dialog-head">
            <div>
              <DialogPrimitive.Title className="dialog-title">
                {file?.path || "Diff"}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="dialog-desc">
                {file
                  ? `${statusLabel} · +${file.additions} / -${file.deletions}`
                  : ""}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="icon" aria-label="关闭">
                <X size={15} />
              </Button>
            </DialogPrimitive.Close>
          </div>
          <div className="diff-body">
            {loading ? (
              <div className="diff-empty">正在读取 diff…</div>
            ) : parsed && parsed.hunks.length > 0 ? (
              <div className="diff-hunks">
                {parsed.hunks.map((hunk, hunkIndex) => {
                  const patchForHunk = [
                    ...parsed.header,
                    hunk.header,
                    ...hunk.lines,
                  ].join("\n");
                  return (
                    <div
                      className="diff-hunk-block"
                      key={`${hunkIndex}-${hunk.header}`}
                    >
                      <div className="diff-hunk-bar">
                        <code>{hunk.header}</code>
                        {canStageHunk && pendingRevert !== hunkIndex && (
                          <div className="diff-hunk-actions">
                            <Button
                              size="sm"
                              variant="secondary"
                              icon={<Plus size={12} />}
                              disabled={stagingHunk || revertingHunk}
                              onClick={() => onStageHunk?.(patchForHunk)}
                            >
                              暂存此 hunk
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="danger-text"
                              icon={<RotateCcw size={12} />}
                              disabled={stagingHunk || revertingHunk}
                              onClick={() => setPendingRevert(hunkIndex)}
                            >
                              还原此 hunk
                            </Button>
                          </div>
                        )}
                        {canStageHunk && pendingRevert === hunkIndex && (
                          <div className="diff-hunk-confirm">
                            <span>还原这个 hunk？</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              icon={<X size={12} />}
                              onClick={() => setPendingRevert(null)}
                            >
                              取消
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              icon={<RotateCcw size={12} />}
                              disabled={revertingHunk}
                              onClick={() => {
                                onRevertHunk?.(patchForHunk);
                                setPendingRevert(null);
                              }}
                            >
                              {revertingHunk ? "还原中…" : "还原"}
                            </Button>
                          </div>
                        )}
                      </div>
                      <pre className="diff-patch">
                        {hunk.lines.map((line, index) => (
                          <span
                            key={`${index}-${line.slice(0, 12)}`}
                            className={
                              line.startsWith("+") &&
                              !line.startsWith("+++")
                                ? "diff-add"
                                : line.startsWith("-") &&
                                    !line.startsWith("---")
                                  ? "diff-del"
                                  : ""
                            }
                          >
                            {line}
                            {"\n"}
                          </span>
                        ))}
                      </pre>
                    </div>
                  );
                })}
              </div>
            ) : lines.length > 0 ? (
              <pre className="diff-patch">
                {lines.map((line, index) => (
                  <span
                    key={`${index}-${line.slice(0, 12)}`}
                    className={
                      line.startsWith("+") && !line.startsWith("+++")
                        ? "diff-add"
                        : line.startsWith("-") && !line.startsWith("---")
                          ? "diff-del"
                          : ""
                    }
                  >
                    {line}
                    {"\n"}
                  </span>
                ))}
              </pre>
            ) : (
              <div className="diff-empty">没有可显示的 diff</div>
            )}
          </div>
          <div className="dialog-foot">
            <div className="diff-foot-left">
              <span className="muted">
                {file?.staged ? "已暂存" : "未暂存"}
              </span>
              {file?.status !== "D" && onRevertFile && (
                <Button
                  variant={pendingRevertFile ? "danger" : "ghost"}
                  size="sm"
                  icon={<RotateCcw size={12} />}
                  disabled={revertingFile}
                  onClick={() => {
                    if (!pendingRevertFile) {
                      setPendingRevertFile(true);
                      return;
                    }
                    setPendingRevertFile(false);
                    if (file) {
                      onRevertFile(file);
                    }
                  }}
                >
                  {revertingFile
                    ? "还原中…"
                    : pendingRevertFile
                      ? "确认还原整个文件？"
                      : "还原文件"}
                </Button>
              )}
            </div>
            <div>
              {file?.staged && (
                <Button
                  variant="secondary"
                  icon={<Minus size={12} />}
                  disabled={staging}
                  onClick={() => file && onUnstage?.(file)}
                >
                  取消暂存
                </Button>
              )}
              {file?.unstaged && (
                <Button
                  variant="primary"
                  icon={<Plus size={12} />}
                  disabled={staging}
                  onClick={() => file && onStage?.(file)}
                >
                  暂存文件
                </Button>
              )}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function FileBrowserDialog({
  open,
  onOpenChange,
  cwd,
  onNotify,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cwd: string;
  onNotify: (title: string, desc?: string) => void;
}) {
  const [entries, setEntries] = useState<
    { path: string; name: string; size: number }[]
  >([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  const [content, setContent] = useState<{
    text: string;
    binary: boolean;
    size: number;
    error?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setQuery("");
    setSelected("");
    setContent(null);
    if (!window.tesT?.listFiles) {
      setEntries([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void window.tesT
      .listFiles({ cwd })
      .then((result) => {
        if (cancelled) {
          return;
        }
        if (result?.error) {
          onNotify("读取文件列表失败", result.error);
        }
        setEntries(Array.isArray(result?.files) ? result.files : []);
        setTruncated(Boolean(result?.truncated));
      })
      .catch((error) => onNotify("读取文件列表失败", String(error)))
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, cwd]);

  const openFile = (path: string) => {
    setSelected(path);
    setContent(null);
    if (!window.tesT?.readFile) {
      return;
    }
    setLoading(true);
    void window.tesT
      .readFile({ cwd, path })
      .then((result) => {
        if (result?.error) {
          setContent({
            text: "",
            binary: false,
            size: result.size || 0,
            error: result.error,
          });
          return;
        }
        setContent({
          text: result.text || "",
          binary: Boolean(result.binary),
          size: result.size || 0,
        });
      })
      .catch((error) =>
        setContent({
          text: "",
          binary: false,
          size: 0,
          error: String(error),
        }),
      )
      .finally(() => setLoading(false));
  };

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = needle
      ? entries.filter((entry) =>
          entry.path.toLowerCase().includes(needle),
        )
      : entries;
    return list.slice(0, 400);
  }, [entries, query]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="rx-overlay" />
        <DialogPrimitive.Content className="dialog file-dialog">
          <div className="dialog-head">
            <div>
              <DialogPrimitive.Title className="dialog-title">
                工作区文件
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="dialog-desc">
                {cwd || "未选择工作区"} · {entries.length} 个文件
                {truncated ? "（已截断）" : ""}
              </DialogPrimitive.Description>
            </div>
            <div className="file-head-actions">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (window.tesT?.revealPath) {
                    void window.tesT.revealPath({ cwd, path: "." });
                  }
                }}
              >
                <FolderOpen size={12} /> 打开目录
              </Button>
              <DialogPrimitive.Close asChild>
                <Button variant="icon" aria-label="关闭">
                  <X size={15} />
                </Button>
              </DialogPrimitive.Close>
            </div>
          </div>
          <div className="file-toolbar">
            <Search size={13} />
            <input
              className="input"
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="按路径筛选…"
            />
          </div>
          <div className="file-split">
            <div className="file-list">
              {loading && entries.length === 0 && (
                <div className="file-empty">正在扫描工作区…</div>
              )}
              {!loading && filtered.length === 0 && (
                <div className="file-empty">没有匹配的文件</div>
              )}
              {filtered.map((entry) => (
                <button type="button"
                  key={entry.path}
                  className={`file-item ${
                    selected === entry.path ? "active" : ""
                  }`}
                  onClick={() => openFile(entry.path)}
                  title={entry.path}
                >
                  <FileText size={12} />
                  <span>{entry.path}</span>
                  <small>{formatBytes(entry.size)}</small>
                </button>
              ))}
            </div>
            <div className="file-preview">
              {!selected && (
                <div className="file-empty">
                  选择左侧文件查看内容
                </div>
              )}
              {selected && (
                <>
                  <div className="file-preview-head">
                    <code>{selected}</code>
                    <div>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={!content?.text}
                        onClick={async () => {
                          if (content?.text) {
                            const ok = await copyText(content.text);
                            if (ok) {
                              onNotify("已复制文件内容");
                            }
                          }
                        }}
                      >
                        <Copy size={11} /> 复制
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (window.tesT?.openPath) {
                            void window.tesT.openPath({
                              cwd,
                              path: selected,
                            });
                          }
                        }}
                      >
                        <Link2 size={11} /> 外部打开
                      </Button>
                    </div>
                  </div>
                  {loading ? (
                    <div className="file-empty">读取中…</div>
                  ) : content?.error ? (
                    <div className="file-empty">{content.error}</div>
                  ) : content?.binary ? (
                    <div className="file-empty">
                      二进制文件 · {formatBytes(content.size)} · 不在应用内预览
                    </div>
                  ) : (
                    <pre className="file-code">{content?.text || ""}</pre>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="dialog-foot">
            <span className="muted">
              只读预览 · 最多 4000 个文件 · 跳过 node_modules / .git
            </span>
            <DialogPrimitive.Close asChild>
              <Button variant="primary" icon={<X size={13} />}>
                关闭
              </Button>
            </DialogPrimitive.Close>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

type TerminalTab = {
  id: string;
  title: string;
  cwd: string;
  generation: number;
};

type TerminalController = {
  clear: () => void;
  fit: () => void;
  focus: () => void;
};

function PtyTerminalPane({
  tab,
  active,
  onController,
}: {
  tab: TerminalTab;
  active: boolean;
  onController: (id: string, controller: TerminalController | null) => void;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<TerminalController | null>(null);
  const registerRef = useRef(onController);
  registerRef.current = onController;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }
    const terminal = new XTerm({
      cursorBlink: true,
      fontFamily: "Cascadia Code, Consolas, monospace",
      fontSize: 12,
      lineHeight: 1.25,
      scrollback: 6000,
      theme: {
        background: "#0c100e",
        foreground: "#d7e2da",
        cursor: "#3ddc97",
        cursorAccent: "#0c100e",
        selectionBackground: "#214d3b",
        black: "#0c100e",
        red: "#ff7b72",
        green: "#3ddc97",
        yellow: "#e2b25a",
        blue: "#7db6ef",
        magenta: "#c4a6f5",
        cyan: "#72d6c9",
        white: "#e9eeea",
        brightBlack: "#65716a",
      },
    });
    const fit = new FitAddon();
    terminal.loadAddon(fit);
    terminal.open(host);
    const savedScrollback = localStorage.getItem(
      `tesT.terminalScrollback.${tab.title}`,
    );
    if (savedScrollback) {
      terminal.write(savedScrollback);
    }

    const controller: TerminalController = {
      clear: () => terminal.clear(),
      fit: () => fit.fit(),
      focus: () => terminal.focus(),
    };
    controllerRef.current = controller;
    registerRef.current(tab.id, controller);

    const input = terminal.onData((data) => {
      void window.tesT?.terminalInput?.({ id: tab.id, data });
    });
    const handleOutput = (record: any) => {
      if (record?.id !== tab.id) {
        return;
      }
      if (record.type === "data") {
        terminal.write(record.data || "");
      } else if (record.type === "exit") {
        terminal.write(
          `\r\n\x1b[90m[process exited${
            typeof record.code === "number" ? ` ${record.code}` : ""
          }]\x1b[0m\r\n`,
        );
      } else if (record.type === "error") {
        terminal.write(`\r\n\x1b[31m${record.text || "终端错误"}\x1b[0m\r\n`);
      }
    };
    const unsubscribe = window.tesT?.onTerminalData?.(handleOutput);
    let resizeFrame: number | null = null;
    const resizeObserver = new ResizeObserver(() => {
      if (!active || resizeFrame !== null) {
        return;
      }
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = null;
        fit.fit();
        void window.tesT?.terminalResize?.({
          id: tab.id,
          cols: terminal.cols,
          rows: terminal.rows,
        });
      });
    });
    resizeObserver.observe(host);

    requestAnimationFrame(() => {
      fit.fit();
      void window.tesT?.terminalStart?.({
        id: tab.id,
        cwd: tab.cwd,
        cols: terminal.cols,
        rows: terminal.rows,
      });
      if (active) {
        terminal.focus();
      }
    });

    return () => {
      try {
        const buffer = terminal.buffer.active;
        const lines: string[] = [];
        const startLine = Math.max(0, buffer.baseY - 150);
        for (let index = startLine; index < buffer.baseY + buffer.viewportY; index += 1) {
          lines.push(buffer.getLine(index)?.translateToString(true) || "");
        }
        localStorage.setItem(
          `tesT.terminalScrollback.${tab.title}`,
          lines.join("\n"),
        );
      } catch {
        // Scrollback persistence is best-effort.
      }
      if (resizeFrame !== null) {
        cancelAnimationFrame(resizeFrame);
      }
      resizeObserver.disconnect();
      input.dispose();
      if (typeof unsubscribe === "function") {
        unsubscribe();
      } else {
        window.tesT?.offTerminalData?.(handleOutput);
      }
      registerRef.current(tab.id, null);
      controllerRef.current = null;
      void window.tesT?.terminalStop?.({ id: tab.id });
      terminal.dispose();
    };
  }, [tab.id, tab.cwd, tab.generation]);

  useEffect(() => {
    if (!active) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      controllerRef.current?.fit();
      controllerRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [active]);

  return (
    <div
      ref={hostRef}
      className={`pty-host ${active ? "active" : ""}`}
      aria-hidden={!active}
    />
  );
}

function TerminalDialog({
  open,
  onOpenChange,
  cwd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cwd: string;
}) {
  const [tabs, setTabs] = useState<TerminalTab[]>([]);
  const [activeId, setActiveId] = useState("");
  const restoredTitlesRef = useRef<Array<{ title: string; cwd?: string }>>(
    (() => {
      try {
        const value = JSON.parse(
          localStorage.getItem("tesT.terminalTabTitles") || "[]",
        );
        return Array.isArray(value)
          ? value
              .map((item) =>
                typeof item === "string"
                  ? { title: item }
                  : item && typeof item.title === "string"
                    ? {
                        title: item.title,
                        cwd:
                          typeof item.cwd === "string"
                            ? item.cwd
                            : undefined,
                      }
                    : null,
              )
              .filter(
                (item): item is { title: string; cwd?: string } =>
                  Boolean(item),
              )
          : [];
      } catch {
        return [];
      }
    })(),
  );
  const [scripts, setScripts] = useState<Array<{ name: string; command: string }>>(
    [],
  );
  const [runHistory, setRunHistory] = useState<
    Array<{
      name: string;
      at: number;
      durationMs?: number;
      status?: "running" | "ok" | "fail";
    }>
  >(() => {
    try {
      const value = JSON.parse(
        localStorage.getItem("tesT.scriptRunHistory") || "[]",
      );
      return Array.isArray(value)
        ? value.filter(
            (item) =>
              item &&
              typeof item.name === "string" &&
              typeof item.at === "number",
          )
        : [];
    } catch {
      return [];
    }
  });
  const controllers = useRef(new Map<string, TerminalController>());
  const pendingScriptRef = useRef<{
    id: string;
    name: string;
    startedAt: number;
    buffer: string;
  } | null>(null);

  const createTab = () => {
    const id = `terminal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setTabs((items) => [
      ...items,
      {
        id,
        title: `终端 ${items.length + 1}`,
        cwd,
        generation: 0,
      },
    ]);
    setActiveId(id);
  };

  useEffect(() => {
    if (open && tabs.length === 0) {
      const titles = restoredTitlesRef.current;
      const initial = (
        titles.length ? titles : [{ title: "终端 1" }]
      ).map(
        (item, index) => ({
          id: `terminal-${Date.now()}-${index}-${Math.random()
            .toString(36)
            .slice(2, 7)}`,
          title: item.title,
          cwd: item.cwd || cwd,
          generation: 0,
        }),
      );
      setTabs(initial);
      setActiveId(initial[0]?.id || "");
    }
  }, [open, tabs.length, cwd]);

  useEffect(() => {
    if (tabs.length > 0) {
      localStorage.setItem(
        "tesT.terminalTabTitles",
        JSON.stringify(
          tabs.map((tab) => ({ title: tab.title, cwd: tab.cwd })),
        ),
      );
    }
  }, [tabs]);

  useEffect(() => {
    const listener = (record: any) => {
      const pending = pendingScriptRef.current;
      if (
        !pending ||
        record?.type !== "data" ||
        record.id !== pending.id
      ) {
        return;
      }
      pending.buffer += String(record.data || "");
      const match = /__TSC_DONE__(\d+)/.exec(pending.buffer);
      if (!match) {
        return;
      }
      const status: "ok" | "fail" =
        Number(match[1]) === 0 ? "ok" : "fail";
      const durationMs = Date.now() - pending.startedAt;
      setRunHistory((items) => {
        const next = items.map((item) =>
          item.name === pending.name
            ? { ...item, status, durationMs }
            : item,
        );
        localStorage.setItem("tesT.scriptRunHistory", JSON.stringify(next));
        return next;
      });
      pendingScriptRef.current = null;
    };
    window.tesT?.onTerminalData?.(listener);
    return () => window.tesT?.offTerminalData?.(listener);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setScripts([]);
    if (!open || !cwd || !window.tesT?.readFile) {
      return;
    }
    void window.tesT
      .readFile({ cwd, path: "package.json" })
      .then((result) => {
        if (cancelled || result?.error || !result?.text) {
          return;
        }
        const packageJson = JSON.parse(result.text);
        const entries = Object.entries(packageJson.scripts || {})
          .filter((entry): entry is [string, string] => typeof entry[1] === "string")
          .map(([name, command]) => ({ name, command }))
          .slice(0, 8);
        if (!cancelled) {
          setScripts(entries);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, cwd]);

  const closeTab = (id: string) => {
    controllers.current.delete(id);
    setTabs((items) => {
      const index = items.findIndex((item) => item.id === id);
      const next = items.filter((item) => item.id !== id);
      if (activeId === id) {
        setActiveId(next[Math.max(0, index - 1)]?.id || next[0]?.id || "");
      }
      return next;
    });
  };

  const activeTab = tabs.find((tab) => tab.id === activeId) || tabs[0];

  const send = (data: string) => {
    if (!activeTab) {
      return;
    }
    void window.tesT?.terminalInput?.({ id: activeTab.id, data });
  };

  const recordScriptRun = (name: string) => {
    setRunHistory((items) => {
      const next = [
        {
          name,
          at: Date.now(),
          status: "running" as const,
          durationMs: 0,
        },
        ...items,
      ]
        .filter(
          (item, index, list) =>
            list.findIndex(
              (candidate) => candidate.name === item.name,
            ) === index,
        )
        .slice(0, 8);
      localStorage.setItem("tesT.scriptRunHistory", JSON.stringify(next));
      return next;
    });
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="rx-overlay" />
        <DialogPrimitive.Content className="dialog terminal-dialog">
          <div className="dialog-head">
            <div>
              <DialogPrimitive.Title className="dialog-title">
                终端
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="dialog-desc">
                PTY · {cwd || "未选择工作区"} · {tabs.length} 个标签
              </DialogPrimitive.Description>
            </div>
            <div className="file-head-actions">
              <Tooltip tip="重启当前终端">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<RotateCcw size={12} />}
                  disabled={!activeTab}
                  onClick={() => {
                    if (!activeTab) return;
                    setTabs((items) =>
                      items.map((item) =>
                        item.id === activeTab.id
                          ? { ...item, generation: item.generation + 1 }
                          : item,
                      ),
                    );
                  }}
                >
                  重启
                </Button>
              </Tooltip>
              <Tooltip tip="清空当前终端">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Eraser size={12} />}
                  disabled={!activeTab}
                  onClick={() =>
                    activeTab && controllers.current.get(activeTab.id)?.clear()
                  }
                >
                  清屏
                </Button>
              </Tooltip>
              <DialogPrimitive.Close asChild>
                <Button variant="icon" aria-label="关闭">
                  <X size={15} />
                </Button>
              </DialogPrimitive.Close>
            </div>
          </div>
          <div className="terminal-tabs">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                data-terminal-id={tab.id}
                className={`terminal-tab ${tab.id === activeTab?.id ? "on" : ""}`}
              >
                <button
                  type="button"
                  className="terminal-tab-main"
                  onClick={() => setActiveId(tab.id)}
                  onDoubleClick={() => {
                    const title = window.prompt("终端标签名称", tab.title);
                    if (!title?.trim()) {
                      return;
                    }
                    setTabs((items) =>
                      items.map((item) =>
                        item.id === tab.id
                          ? { ...item, title: title.trim() }
                          : item,
                      ),
                    );
                  }}
                >
                  <Terminal size={11} />
                  {tab.title}
                </button>
                <button
                  type="button"
                  className="terminal-tab-close"
                  aria-label={`关闭 ${tab.title}`}
                  onClick={() => closeTab(tab.id)}
                >
                  <X size={9} />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="terminal-tab-new"
              aria-label="新建终端标签"
              title="新建终端标签"
              onClick={createTab}
            >
              <Plus size={12} />
            </button>
          </div>
          {scripts.length > 0 && (
            <div className="terminal-scripts">
              <span className="terminal-scripts-label">脚本</span>
              {scripts.map((script) => (
                <button
                  key={script.name}
                  type="button"
                  title={script.command}
                  onClick={() => {
                    recordScriptRun(script.name);
                    if (activeTab) {
                      pendingScriptRef.current = {
                        id: activeTab.id,
                        name: script.name,
                        startedAt: Date.now(),
                        buffer: "",
                      };
                    }
                    send(
                      `cmd /v:on /d /s /c "npm run ${script.name} & echo __TSC_DONE__!errorlevel!"\r`,
                    );
                  }}
                >
                  <Play size={10} />
                  {script.name}
                </button>
              ))}
            </div>
          )}
          <div className="terminal-panes">
            {tabs.map((tab) => (
              <PtyTerminalPane
                key={`${tab.id}-${tab.generation}`}
                tab={tab}
                active={tab.id === activeTab?.id}
                onController={(id, controller) => {
                  if (controller) {
                    controllers.current.set(id, controller);
                  } else {
                    controllers.current.delete(id);
                  }
                }}
              />
            ))}
          </div>
          <div className="dialog-foot">
            <span className="muted">
              完整 PTY · 支持 ANSI / TUI · 命令在当前工作区执行
            </span>
            <span className="muted">
              {runHistory.length > 0
                ? `最近运行：${runHistory
                    .slice(0, 3)
                    .map(
                      (item) =>
                        `${item.status === "ok" ? "✓" : item.status === "fail" ? "✗" : "…"} ${item.name} ${new Date(item.at).toLocaleTimeString(
                          "zh-CN",
                          { hour: "2-digit", minute: "2-digit" },
                        )}`,
                    )
                    .join(" · ")}`
                : "Ctrl+C 可中断当前程序"}
            </span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function SettingsDialog({
  open,
  onOpenChange,
  dark,
  onDark,
  density,
  onDensity,
  budgetUsd,
  onBudgetUsd,
  accentKey,
  onAccent,
  model,
  modelOptions,
  onModel,
  reasoning,
  reasoningOptions,
  onReasoning,
  tab,
  onTabChange,
  onImportPi,
  onOpenModels,
  onRefreshModels,
  onPiLogin,
  onRefreshAuth,
  authProviders,
  onOpenCustomProvider,
  updateStatus,
  piUpdateStatus,
  onCheckUpdate,
  onDownloadUpdate,
  onInstallUpdate,
  onSaveUpdateFeed,
  onClearUpdateFeed,
  onCheckPiUpdate,
  onInstallPiUpdate,
  onRestorePiKernel,
  onOpenModelBrowser,
  onOpenFiles,
  onOpenTerminal,
  onOpenBranches,
  onOpenArchive,
  onOpenLog,
  onOpenExtensions,
  onExportSession,
  onOpenRemote,
  onClearProviders,
  restore,
  onRestore,
  streaming,
  onStreaming,
  autoCompact,
  onAutoCompact,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dark: boolean;
  onDark: (value: boolean) => void;
  density: Density;
  onDensity: (value: Density) => void;
  budgetUsd: number;
  onBudgetUsd: (value: number) => void;
  accentKey: AccentKey;
  onAccent: (value: AccentKey) => void;
  model: Model;
  modelOptions: Model[];
  onModel: (value: Model) => void;
  reasoning: string;
  reasoningOptions: string[];
  onReasoning: (value: string) => void;
  tab: string;
  onTabChange: (value: string) => void;
  onImportPi: () => void;
  onOpenModels: () => void;
  onRefreshModels: () => void;
  onPiLogin: () => void;
  onRefreshAuth: () => void;
  authProviders: string[];
  onOpenCustomProvider: () => void;
  updateStatus: UpdateStatus | null;
  piUpdateStatus: PiUpdateStatus | null;
  onCheckUpdate: () => void;
  onDownloadUpdate: () => void;
  onInstallUpdate: () => void;
  onSaveUpdateFeed: (url: string) => void;
  onClearUpdateFeed: () => void;
  onCheckPiUpdate: () => void;
  onInstallPiUpdate: () => void;
  onRestorePiKernel: () => void;
  onOpenModelBrowser: () => void;
  onOpenFiles: () => void;
  onOpenTerminal: () => void;
  onOpenBranches: () => void;
  onOpenArchive: () => void;
  onOpenLog: () => void;
  onOpenExtensions: () => void;
  onExportSession: () => void;
  onOpenRemote: () => void;
  onClearProviders: () => void;
  restore: boolean;
  onRestore: (value: boolean) => void;
  streaming: boolean;
  onStreaming: (value: boolean) => void;
  autoCompact: boolean;
  onAutoCompact: (value: boolean) => void;
  onSave: () => void;
}) {
  const [feedUrl, setFeedUrl] = useState(updateStatus?.feedUrl || "");
  const [closeToTray, setCloseToTray] = useState(true);
  const [notifyOnComplete, setNotifyOnComplete] = useState(true);
  const [catalog, setCatalog] = useState<{
    models: number;
    providers: number;
    available: number;
  } | null>(null);
  const [feishuDraft, setFeishuDraft] = useState<TesTFeishuConfig>({
    appId: "",
    appSecret: "",
    enabled: false,
    longConnection: true,
    autoPair: true,
    receiveIdType: "chat_id",
    receiveId: "",
    allowedOpenIds: [],
    allowAll: false,
  });
  const [feishuOpenIdsText, setFeishuOpenIdsText] = useState("");
  const [feishuHasSecret, setFeishuHasSecret] = useState(false);
  const [feishuValidation, setFeishuValidation] = useState<{
    ok: boolean;
    errors: string[];
  } | null>(null);
  const [feishuPath, setFeishuPath] = useState("");
  const [feishuSaving, setFeishuSaving] = useState(false);
  const [feishuNotice, setFeishuNotice] = useState("");
  const [permissionRules, setPermissionRules] = useState<string[]>([]);
  const [permissionRulesPath, setPermissionRulesPath] = useState("");
  const [dataLocationInfo, setDataLocationInfo] = useState<{
    dataDir: string;
    packaged: boolean;
    pointerFile: string;
  } | null>(null);
  const [dataLocationError, setDataLocationError] = useState("");
  const [shortcutOverrides, setShortcutOverrides] = useState<
    Record<string, string>
  >(() => {
    try {
      return JSON.parse(localStorage.getItem("tesT.shortcuts") || "{}");
    } catch {
      return {};
    }
  });
  const [shortcutConflict, setShortcutConflict] = useState("");

  useEffect(() => {
    if (!open || !window.tesT?.dataLocation) {
      return;
    }
    void window.tesT.dataLocation().then(setDataLocationInfo);
  }, [open]);

  const migrateDataLocation = () => {
    void window.tesT?.migrateDataLocation?.().then((result) => {
      if (result?.error) {
        setDataLocationError(result.error);
        return;
      }
      setDataLocationError("");
      if (result?.ok) {
        setDataLocationInfo((current) =>
          current
            ? { ...current, dataDir: result.dataDir || current.dataDir }
            : current,
        );
      }
    });
  };

  const setShortcut = (id: string, value: string) => {
    const normalized = value.trim().toLowerCase();
    if (normalized) {
      const duplicate = shortcuts.find((item) => {
        if (!item.id || item.id === id) {
          return false;
        }
        return (
          (shortcutOverrides[item.id] || item.keys.join("+")).toLowerCase() ===
          normalized
        );
      });
      if (duplicate) {
        setShortcutConflict(`与“${duplicate.label}”冲突`);
        return;
      }
    }
    setShortcutConflict("");
    setShortcutOverrides((current) => {
      const next = { ...current };
      if (value.trim()) {
        next[id] = value.trim();
      } else {
        delete next[id];
      }
      localStorage.setItem("tesT.shortcuts", JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    if (!open || tab !== "tools" || !window.tesT?.permissionRules) {
      return;
    }
    let cancelled = false;
    void window.tesT.permissionRules().then((result) => {
      if (!cancelled) {
        setPermissionRules(Array.isArray(result?.rules) ? result.rules : []);
        setPermissionRulesPath(result?.path || "");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, tab]);

  const clearPermissionRules = () => {
    void window.tesT?.clearPermissionRules?.().then((result) => {
      if (result?.ok) {
        setPermissionRules([]);
      }
    });
  };
  const [feishuChannel, setFeishuChannel] =
    useState<TesTChannelStatus | null>(null);
  const authKey = authProviders.join("|");

  useEffect(() => {
    setFeedUrl(updateStatus?.feedUrl || "");
  }, [updateStatus?.feedUrl]);

  useEffect(() => {
    if (!open || !window.tesT?.behaviorGet) {
      return;
    }
    void window.tesT
      .behaviorGet()
      .then((value) => {
        setCloseToTray(value.closeToTray !== false);
        setNotifyOnComplete(value.notifyOnComplete !== false);
      })
      .catch(() => {});
  }, [open]);

  const updateBehavior = (patch: {
    closeToTray?: boolean;
    notifyOnComplete?: boolean;
  }) => {
    if (patch.closeToTray !== undefined) {
      setCloseToTray(patch.closeToTray);
    }
    if (patch.notifyOnComplete !== undefined) {
      setNotifyOnComplete(patch.notifyOnComplete);
    }
    void window.tesT?.behaviorSet?.(patch);
  };

  useEffect(() => {
    if (!open || !window.tesT?.listModelCatalog) {
      return;
    }

    let cancelled = false;
    void window.tesT
      .listModelCatalog()
      .then((result) => {
        if (cancelled || result?.error) {
          return;
        }
        setCatalog({
          models: result.models.length,
          providers: result.providers.length,
          available: result.models.filter((item) => item.available).length,
        });
      })
      .catch(() => {
        // The catalog is optional; keep the current dropdown usable.
      });

    return () => {
      cancelled = true;
    };
  }, [open, authKey]);

  const loadFeishuConfig = async () => {
    if (!window.tesT?.feishuConfig) {
      return;
    }
    try {
      const result = await window.tesT.feishuConfig();
      if (result?.error) {
        setFeishuNotice(result.error);
        return;
      }
      if (result.config) {
        setFeishuDraft(result.config);
        setFeishuOpenIdsText(result.config.allowedOpenIds.join("\n"));
      }
      setFeishuHasSecret(Boolean(result.hasSecret));
      setFeishuValidation(result.validation || null);
      setFeishuPath(result.path || "");
      setFeishuNotice("");
    } catch (error) {
      setFeishuNotice(String((error as Error)?.message || error));
    }
  };

  useEffect(() => {
    if (open && tab === "feishu") {
      void loadFeishuConfig();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab]);

  useEffect(() => {
    if (!open || tab !== "feishu" || !window.tesT?.remoteChannels) {
      return;
    }
    let cancelled = false;
    const load = () => {
      void window.tesT
        ?.remoteChannels?.()
        .then((list) => {
          if (cancelled) {
            return;
          }
          setFeishuChannel(
            list.find((item) => item.id === "feishu") || null,
          );
        })
        .catch(() => {});
    };
    load();
    const timer = window.setInterval(load, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [open, tab]);

  const connectFeishu = async () => {
    if (!window.tesT?.saveFeishuConfig) {
      setFeishuNotice("当前环境不支持飞书接入");
      return;
    }
    setFeishuSaving(true);
    setFeishuNotice("");
    try {
      const verify = await window.tesT.verifyFeishuConfig?.({
        appId: feishuDraft.appId,
        appSecret: feishuDraft.appSecret,
      });
      if (verify && !verify.ok) {
        setFeishuNotice(
          `凭证校验失败：${verify.error || "请检查 App ID / App Secret"}`,
        );
        return;
      }

      const allowedOpenIds = feishuOpenIdsText
        .split(/[\n,，]/)
        .map((item) => item.trim())
        .filter(Boolean);
      const firstPair = !allowedOpenIds.length && !feishuDraft.receiveId;
      const result = await window.tesT.saveFeishuConfig({
        ...feishuDraft,
        enabled: true,
        autoPair: firstPair ? true : feishuDraft.autoPair,
        allowedOpenIds,
        receiveId: firstPair ? "" : feishuDraft.receiveId,
      });
      if (result?.error) {
        setFeishuNotice(result.error);
        return;
      }
      if (result.config) {
        setFeishuDraft(result.config);
        setFeishuOpenIdsText(result.config.allowedOpenIds.join("\n"));
      }
      setFeishuHasSecret(Boolean(result.hasSecret));
      setFeishuValidation(result.validation || null);
      setFeishuPath(result.path || "");
      setFeishuNotice(
        "凭证通过，正在连接飞书。现在用手机飞书私聊机器人，发送“你好”。",
      );
    } catch (error) {
      setFeishuNotice(String((error as Error)?.message || error));
    } finally {
      setFeishuSaving(false);
    }
  };

  const saveFeishuConfig = async () => {
    if (!window.tesT?.saveFeishuConfig) {
      setFeishuNotice("当前环境不支持保存飞书配置");
      return;
    }
    setFeishuSaving(true);
    setFeishuNotice("");
    try {
      const allowedOpenIds = feishuOpenIdsText
        .split(/[\n,，]/)
        .map((item) => item.trim())
        .filter(Boolean);
      const result = await window.tesT.saveFeishuConfig({
        ...feishuDraft,
        allowedOpenIds,
      });
      if (result?.error) {
        setFeishuNotice(result.error);
        return;
      }
      if (result.config) {
        setFeishuDraft(result.config);
        setFeishuOpenIdsText(result.config.allowedOpenIds.join("\n"));
      }
      setFeishuHasSecret(Boolean(result.hasSecret));
      setFeishuValidation(result.validation || null);
      setFeishuPath(result.path || "");
      setFeishuNotice(
        result.enabled
          ? "配置已保存，正在连接飞书长连接。"
          : "配置已保存；启用后会自动连接飞书。",
      );
    } catch (error) {
      setFeishuNotice(String((error as Error)?.message || error));
    } finally {
      setFeishuSaving(false);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="rx-overlay" />
        <DialogPrimitive.Content
          className="dialog settings-dialog"
          tabIndex={-1}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            (event.currentTarget as HTMLElement).focus();
          }}
        >
          <div className="dialog-head">
            <div>
              <DialogPrimitive.Title className="dialog-title">
                设置
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="dialog-desc">
                所有修改即时生效
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="icon" aria-label="关闭">
                <X size={15} />
              </Button>
            </DialogPrimitive.Close>
          </div>

          <TabsPrimitive.Root
            value={tab}
            onValueChange={onTabChange}
            className="settings-tabs"
          >
            <TabsPrimitive.List className="tabs-list">
              <TabsPrimitive.Trigger className="tabs-trigger" value="appearance">
                <Palette size={13} /> 通用
              </TabsPrimitive.Trigger>
              <TabsPrimitive.Trigger className="tabs-trigger" value="models">
                <Cpu size={13} /> 模型
              </TabsPrimitive.Trigger>
              <TabsPrimitive.Trigger className="tabs-trigger" value="tools">
                <Wrench size={13} /> 工具
              </TabsPrimitive.Trigger>
              <TabsPrimitive.Trigger className="tabs-trigger" value="feishu">
                <MessagesSquare size={13} /> 飞书
              </TabsPrimitive.Trigger>
              <TabsPrimitive.Trigger className="tabs-trigger" value="shortcuts">
                <Keyboard size={13} /> 快捷键
              </TabsPrimitive.Trigger>
              <TabsPrimitive.Trigger className="tabs-trigger" value="update">
                <Download size={13} /> 更新
              </TabsPrimitive.Trigger>
            </TabsPrimitive.List>

            <TabsPrimitive.Content value="appearance" className="tabs-content">
              <div className="setting-row">
                <div>
                  <b>深色模式</b>
                </div>
                <div className="setting-control">
                  <Switch checked={dark} onChange={() => onDark(!dark)} />
                </div>
              </div>

              <div className="setting-row">
                <div>
                  <b>界面密度</b>
                </div>
                <div className="setting-control">
                  <Segmented
                    value={density}
                    onChange={(value) => onDensity(value as Density)}
                    options={[
                      {
                        value: "comfortable",
                        label: "舒适",
                        icon: <Eye size={11} />,
                      },
                      {
                        value: "compact",
                        label: "紧凑",
                        icon: <Minus size={11} />,
                      },
                    ]}
                  />
                </div>
              </div>

              <div className="setting-row">
                <div>
                  <b>强调色</b>
                </div>
                <div className="setting-control">
                  <ToggleGroupPrimitive.Root
                    className="toggle-group"
                    type="single"
                    value={accentKey}
                    onValueChange={(value) => {
                      if (value) onAccent(value as AccentKey);
                    }}
                  >
                    {(Object.keys(accents) as AccentKey[]).map((key) => (
                      <ToggleGroupPrimitive.Item
                        key={key}
                        value={key}
                        className="toggle-item"
                      >
                        <span className={`accent-dot accent-${key}`} />
                        {accents[key].label}
                      </ToggleGroupPrimitive.Item>
                    ))}
                  </ToggleGroupPrimitive.Root>
                </div>
              </div>

              <SeparatorPrimitive.Root className="sep-line" />

              <div className="settings-section-head">会话</div>
              <div className="setting-row">
                <div>
                  <b>启动时恢复上一次会话</b>
                </div>
                <div className="setting-control">
                  <Checkbox
                    checked={restore}
                    onChange={() => onRestore(!restore)}
                  />
                </div>
              </div>

              <div className="setting-row">
                <div>
                  <b>流式输出</b>
                </div>
                <div className="setting-control">
                  <Switch
                    checked={streaming}
                    onChange={() => onStreaming(!streaming)}
                  />
                </div>
              </div>

              <div className="setting-row">
                <div>
                  <b>自动压缩上下文</b>
                </div>
                <div className="setting-control">
                  <Switch
                    checked={autoCompact}
                    onChange={() => onAutoCompact(!autoCompact)}
                  />
                </div>
              </div>

              <div className="settings-section-head">桌面行为</div>
              <div className="setting-row">
                <div>
                  <b>关闭时最小化到托盘</b>
                </div>
                <div className="setting-control">
                  <Switch
                    checked={closeToTray}
                    onChange={() =>
                      updateBehavior({
                        closeToTray: !closeToTray,
                      })
                    }
                  />
                </div>
              </div>
              <div className="setting-row">
                <div>
                  <b>任务完成时通知</b>
                  <small>窗口不在前台时</small>
                </div>
                <div className="setting-control">
                  <Switch
                    checked={notifyOnComplete}
                    onChange={() =>
                      updateBehavior({
                        notifyOnComplete: !notifyOnComplete,
                      })
                    }
                  />
                </div>
              </div>
              <div className="settings-section-head">存储</div>
              <div className="setting-row">
                <div>
                  <b>数据保存位置</b>
                  <small title={dataLocationInfo?.dataDir}>
                    {dataLocationInfo?.dataDir || "读取中…"}
                  </small>
                </div>
                <div className="setting-control">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<FolderOpen size={12} />}
                    onClick={migrateDataLocation}
                  >
                    迁移目录
                  </Button>
                </div>
              </div>
              {dataLocationError && (
                <p className="preset-error">{dataLocationError}</p>
              )}
            </TabsPrimitive.Content>

            <TabsPrimitive.Content value="models" className="tabs-content">
              <div className="settings-section-head">账号</div>
                <div className="pi-login-card">
                  <div className="pi-login-head">
                    <span className="pi-login-icon">
                      <LogIn size={15} />
                    </span>
                    <div>
                      <b>登录 Pi 账号</b>
                      <small>
                        Claude / ChatGPT / Gemini 等 OAuth 或 API Key
                      </small>
                    </div>
                    <Button
                      variant="primary"
                      className="pi-login-btn"
                      onClick={onPiLogin}
                    >
                      <LogIn size={12} /> 打开登录
                    </Button>
                  </div>
                  <div className="pi-login-status">
                    <span>
                      {authProviders.length > 0
                        ? `已登录：${authProviders.join(" · ")}`
                        : "还没有登录任何 Pi 服务商"}
                    </span>
                    <span className="pi-login-actions">
                      <button type="button" className="link" onClick={onRefreshModels}>
                        <RefreshCw size={11} /> {modelOptions.length} 个模型 ·
                        刷新
                      </button>
                      <button type="button" className="link" onClick={onRefreshAuth}>
                        <ShieldCheck size={11} /> 检查登录
                      </button>
                    </span>
                  </div>
                  <p className="pi-login-hint">
                    {window.tesT?.nativeLogin ? (
                      <>
                        应用内完成 OAuth 或 API Key 登录，无需终端；
                        成功后会自动重启 Pi 并刷新模型。
                      </>
                    ) : (
                      <>
                        会打开 Pi 原版登录窗口并自动进入 <code>/login</code>；
                        登录完成后关闭该窗口，TesT 会自动重启 Pi 并刷新模型。
                      </>
                    )}
                  </p>
                </div>

              <div className="settings-section-head">模型</div>
              <div className="setting-row">
                <div>
                  <b>默认模型</b>
                  <small>
                    已就绪 {modelOptions.length} 个
                    {catalog
                      ? ` · Pi 全目录 ${catalog.models} 个 / ${catalog.providers} 个 Provider`
                      : " · 新会话默认使用，当前会话立即生效"}
                  </small>
                </div>
                <div className="setting-control">
                  <SelectPrimitive.Root
                    value={model.id}
                    onValueChange={(value) => {
                      if (value === "__browse__") {
                        onOpenModelBrowser();
                        return;
                      }
                      const next = modelOptions.find(
                        (item) => item.id === value,
                      );
                      if (next) onModel(next);
                    }}
                  >
                    <SelectPrimitive.Trigger className="select-trigger">
                      <span className="select-trigger-value">
                        <Cpu size={12} />
                        <SelectPrimitive.Value placeholder="未配置" />
                      </span>
                      <SelectPrimitive.Icon>
                        <ChevronDown size={12} />
                      </SelectPrimitive.Icon>
                    </SelectPrimitive.Trigger>
                    <SelectPrimitive.Portal>
                      <SelectPrimitive.Content
                        className="select-content"
                        position="popper"
                        sideOffset={5}
                      >
                        <SelectPrimitive.Viewport className="select-viewport">
                          <SelectPrimitive.Group>
                            <SelectPrimitive.Label className="select-label">
                              已就绪 {modelOptions.length} 个 · 全目录{" "}
                              {catalog ? catalog.models : "…"} 个
                            </SelectPrimitive.Label>
                            <SelectPrimitive.Item
                              value="__browse__"
                              className="select-item select-browse"
                            >
                              <SelectPrimitive.ItemText>
                                浏览全部
                                {catalog ? ` ${catalog.models} ` : " "}
                                个模型…
                              </SelectPrimitive.ItemText>
                            </SelectPrimitive.Item>
                            <SelectPrimitive.Separator className="select-sep" />
                            {modelOptions.map((item) => (
                              <SelectPrimitive.Item
                                key={item.id}
                                value={item.id}
                                className="select-item"
                              >
                                <SelectPrimitive.ItemIndicator className="select-indicator">
                                  <Check size={11} />
                                </SelectPrimitive.ItemIndicator>
                                <SelectPrimitive.ItemText>
                                  {item.label}
                                </SelectPrimitive.ItemText>
                              </SelectPrimitive.Item>
                            ))}
                          </SelectPrimitive.Group>
                        </SelectPrimitive.Viewport>
                      </SelectPrimitive.Content>
                    </SelectPrimitive.Portal>
                  </SelectPrimitive.Root>
                </div>
              </div>

              <button type="button"
                className="select-like import-row"
                onClick={onOpenModelBrowser}
              >
                <span>
                  <b>浏览全部模型</b>
                  <small>
                    {catalog
                      ? `${catalog.available} 个可用 · 共 ${catalog.models} 个模型、${catalog.providers} 个 Provider`
                      : "Pi 内置目录 · 可用 / 需登录一目了然"}
                  </small>
                </span>
                <ChevronRight size={13} />
              </button>

              <div className="setting-row">
                <div>
                  <b>会话预算</b>
                  <small>超过后提示，不阻止请求</small>
                </div>
                <div className="setting-control">
                  <input
                    className="input budget-input"
                    type="number"
                    min="0"
                    step="1"
                    value={budgetUsd || ""}
                    placeholder="不限制"
                    onChange={(event) =>
                      onBudgetUsd(Number(event.target.value) || 0)
                    }
                  />
                </div>
              </div>

              <div className="setting-row">
                <div>
                  <b>推理强度</b>
                  <small>影响延迟与 token 消耗</small>
                </div>
                <div className="setting-control">
                  <ToggleGroupPrimitive.Root
                    className="toggle-group"
                    type="single"
                    value={reasoning}
                    onValueChange={(value) => {
                      if (value) onReasoning(value);
                    }}
                  >
                    {reasoningOptions.map((level) => (
                      <ToggleGroupPrimitive.Item
                        key={level}
                        value={level}
                        className="toggle-item"
                      >
                        {level === "low" ? (
                          <Gauge size={11} />
                        ) : level === "medium" ? (
                          <Zap size={11} />
                        ) : (
                          <Brain size={11} />
                        )}
                        {level}
                      </ToggleGroupPrimitive.Item>
                    ))}
                  </ToggleGroupPrimitive.Root>
                </div>
              </div>

              <div className="settings-section-head">导入与维护</div>
              <button type="button"
                className="select-like import-row"
                onClick={onImportPi}
              >
                <span>
                  <b>从 Pi 导入</b>
                  <small>读取 ~/.pi/agent 的渠道与登录凭证</small>
                </span>
                <ChevronRight size={13} />
              </button>

              <button type="button"
                className="select-like import-row"
                onClick={onOpenModels}
              >
                <span>
                  <b>打开 models.json</b>
                  <small>配置 provider / baseUrl / model</small>
                </span>
                <ChevronRight size={13} />
              </button>

              <button type="button"
                className="select-like import-row"
                onClick={onOpenCustomProvider}
              >
                <span>
                  <b>添加自定义 Provider</b>
                  <small>Base URL / API 类型 / Key / 模型</small>
                </span>
                <ChevronRight size={13} />
              </button>

              <button type="button"
                className="select-like import-row preset-clear"
                onClick={onClearProviders}
              >
                <span>
                  <b>撤销模型配置</b>
                  <small>清空 models.json（自动保留 .bak 备份）</small>
                </span>
                <Trash2 size={13} />
              </button>
            </TabsPrimitive.Content>

            <TabsPrimitive.Content value="tools" className="tabs-content">
              <div className="settings-section-head">工作区</div>
              <button type="button"
                className="select-like import-row"
                onClick={onOpenFiles}
              >
                <span>
                  <b>工作区文件</b>
                  <small>只读预览与复制</small>
                </span>
                <FileText size={14} />
              </button>
              <button type="button"
                className="select-like import-row"
                onClick={onOpenTerminal}
              >
                <span>
                  <b>终端</b>
                  <small>在当前工作区运行命令</small>
                </span>
                <Terminal size={14} />
              </button>
              <button type="button"
                className="select-like import-row"
                onClick={onOpenBranches}
              >
                <span>
                  <b>Git 分支</b>
                  <small>新建 / 切换 / 删除</small>
                </span>
                <GitBranch size={14} />
              </button>

              <div className="settings-section-head">Pi</div>
              <button type="button"
                className="select-like import-row"
                onClick={onOpenExtensions}
              >
                <span>
                  <b>技能与扩展</b>
                  <small>管理 Pi skills 和扩展</small>
                </span>
                <Puzzle size={14} />
              </button>

              <div className="settings-section-head">危险命令授权</div>
              <div className="permission-rules">
                {permissionRules.length === 0 ? (
                  <span className="muted">
                    还没有永久允许的命令
                  </span>
                ) : (
                  permissionRules.map((command) => (
                    <code key={command} title={command}>
                      {command}
                    </code>
                  ))
                )}
              </div>
              <div className="permission-rules-actions">
                <span className="muted">
                  {permissionRulesPath ||
                    "规则保存在 ~/.pi/agent/tesT-permissions.json"}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Trash2 size={12} />}
                  disabled={permissionRules.length === 0}
                  onClick={clearPermissionRules}
                >
                  清空授权
                </Button>
              </div>

              <div className="settings-section-head">诊断</div>
              <button type="button"
                className="select-like import-row"
                onClick={onOpenLog}
              >
                <span>
                  <b>运行日志</b>
                  <small>electron.log</small>
                </span>
                <FileText size={14} />
              </button>

              <div className="settings-section-head">会话</div>
              <button type="button"
                className="select-like import-row"
                onClick={onExportSession}
              >
                <span>
                  <b>导出当前会话</b>
                  <small>Markdown</small>
                </span>
                <Download size={14} />
              </button>
              <button type="button"
                className="select-like import-row"
                onClick={onOpenArchive}
              >
                <span>
                  <b>归档会话</b>
                  <small>恢复已归档</small>
                </span>
                <Archive size={14} />
              </button>

              <div className="settings-section-head">连接</div>
              <button type="button"
                className="select-like import-row"
                onClick={onOpenRemote}
              >
                <span>
                  <b>手机远程</b>
                  <small>局域网 / Tailscale</small>
                </span>
                <Smartphone size={14} />
              </button>
            </TabsPrimitive.Content>

            <TabsPrimitive.Content value="feishu" className="tabs-content">
              <div className="settings-section-head">飞书机器人</div>
              {feishuChannel && (
                <div className="feishu-channel">
                  <span
                    className={`usage-chip ${
                      feishuChannel.state === "online"
                        ? "ready"
                        : feishuChannel.state === "error"
                          ? "error"
                          : feishuChannel.state === "starting" ||
                              feishuChannel.state === "reconnecting"
                            ? "connecting"
                            : ""
                    }`}
                  >
                    <i />
                    飞书 · {feishuChannel.state}
                  </span>
                  <small>
                    {feishuChannel.lastError ||
                      feishuChannel.message ||
                      "尚未连接"}
                  </small>
                </div>
              )}
              <div className="feishu-wizard">
                <div className="feishu-steps">
                  <span className="on">1 凭证</span>
                  <span className={feishuChannel?.state === "online" ? "on" : ""}>
                    2 连接
                  </span>
                  <span
                    className={
                      feishuDraft.allowedOpenIds.length ||
                      feishuChannel?.message?.includes("已自动配对")
                        ? "on"
                        : ""
                    }
                  >
                    3 配对
                  </span>
                </div>

                <div className="feishu-card feishu-quick">
                  <div className="feishu-card-head">
                    <div>
                      <b>1. 填应用凭证</b>
                      <small>
                        飞书开放平台 → 凭证与基础信息。只填 App ID 和 App Secret
                        就能开始。
                      </small>
                    </div>
                    <Tag
                      tone={
                        feishuDraft.allowedOpenIds.length ||
                        feishuChannel?.message?.includes("已自动配对")
                          ? "mint"
                          : feishuChannel?.state === "online"
                            ? "amber"
                            : "gray"
                      }
                    >
                      {feishuDraft.allowedOpenIds.length ||
                      feishuChannel?.message?.includes("已自动配对")
                        ? "已配对"
                        : feishuChannel?.state === "online"
                          ? "等待配对"
                          : "未连接"}
                    </Tag>
                  </div>

                  <label className="field-label" htmlFor="feishu-quick-app-id">
                    App ID
                  </label>
                  <input
                    id="feishu-quick-app-id"
                    className="input"
                    value={feishuDraft.appId}
                    placeholder="cli_xxxxxxxxxxxxxxxx"
                    onChange={(event) =>
                      setFeishuDraft({
                        ...feishuDraft,
                        appId: event.target.value,
                      })
                    }
                  />

                  <label
                    className="field-label"
                    htmlFor="feishu-quick-app-secret"
                  >
                    App Secret
                  </label>
                  <input
                    id="feishu-quick-app-secret"
                    className="input"
                    type="password"
                    value={feishuDraft.appSecret}
                    placeholder={
                      feishuHasSecret
                        ? "已保存，留空则不修改"
                        : "请输入飞书 App Secret"
                    }
                    onChange={(event) =>
                      setFeishuDraft({
                        ...feishuDraft,
                        appSecret: event.target.value,
                      })
                    }
                  />

                  {feishuValidation && !feishuValidation.ok && (
                    <div className="feishu-validation">
                      {feishuValidation.errors.map((error) => (
                        <div key={error}>· {error}</div>
                      ))}
                    </div>
                  )}

                  {feishuNotice && (
                    <p className="feishu-notice">{feishuNotice}</p>
                  )}

                  <div className="feishu-actions">
                    <Button
                      variant="primary"
                      size="sm"
                      icon={
                        feishuSaving ? (
                          <RefreshCw size={12} className="spin" />
                        ) : (
                          <Wifi size={12} />
                        )
                      }
                      disabled={feishuSaving}
                      onClick={() => void connectFeishu()}
                    >
                      {feishuSaving ? "检测中…" : "检测并连接"}
                    </Button>
                  </div>
                </div>

                <div className="feishu-card feishu-quick">
                  <div className="feishu-card-head">
                    <div>
                      <b>2. 手机发一句话</b>
                      <small>
                        用手机飞书私聊机器人，发送「你好」。收到后会自动绑定你的
                        open_id 和 chat_id。
                      </small>
                    </div>
                    <Tag
                      tone={
                        feishuChannel?.state === "online" ? "mint" : "gray"
                      }
                    >
                      {feishuChannel?.state === "online"
                        ? "等待消息"
                        : "未连接"}
                    </Tag>
                  </div>
                  <p className="feishu-hint">
                    私聊没反应时，检查权限
                    <code>im:message.p2p_msg:readonly</code> 和事件
                    <code>im.message.receive_v1</code> 是否已发布。
                  </p>
                </div>
              </div>

              <details className="feishu-advanced">
                <summary>高级设置</summary>
                <div className="feishu-card">
                <div className="feishu-card-head">
                  <div>
                    <b>接入配置</b>
                    <small>
                      填写飞书自建应用凭证，保存后自动建立长连接。
                    </small>
                  </div>
                  <Tag
                    tone={feishuValidation?.ok ? "mint" : "amber"}
                  >
                    {feishuValidation?.ok
                      ? feishuDraft.enabled
                        ? "已配置"
                        : "已配置 · 未启用"
                      : "未完成"}
                  </Tag>
                </div>

                <label className="field-label" htmlFor="feishu-app-id">
                  App ID
                </label>
                <input
                  id="feishu-app-id"
                  className="input"
                  value={feishuDraft.appId}
                  placeholder="cli_xxxxxxxxxxxxxxxx"
                  onChange={(event) =>
                    setFeishuDraft({
                      ...feishuDraft,
                      appId: event.target.value,
                    })
                  }
                />

                <label className="field-label" htmlFor="feishu-app-secret">
                  App Secret
                </label>
                <input
                  id="feishu-app-secret"
                  className="input"
                  type="password"
                  value={feishuDraft.appSecret}
                  placeholder={
                    feishuHasSecret
                      ? "已保存，留空则不修改"
                      : "请输入飞书 App Secret"
                  }
                  onChange={(event) =>
                    setFeishuDraft({
                      ...feishuDraft,
                      appSecret: event.target.value,
                    })
                  }
                />

                <div className="setting-row">
                  <div>
                    <b>自动配对</b>
                    <small>
                      第一次给机器人发消息时，自动绑定你的 open_id 和 chat_id
                    </small>
                  </div>
                  <div className="setting-control">
                    <Switch
                      checked={feishuDraft.autoPair}
                      onChange={() =>
                        setFeishuDraft({
                          ...feishuDraft,
                          autoPair: !feishuDraft.autoPair,
                        })
                      }
                    />
                  </div>
                </div>

                {feishuDraft.autoPair && (
                  <p className="feishu-notice">
                    已开启自动配对：接收 ID 和 Open ID 可以先留空。
                  </p>
                )}

                <label className="field-label" htmlFor="feishu-receive-type">
                  接收 ID 类型
                </label>
                <select
                  id="feishu-receive-type"
                  className="input"
                  value={feishuDraft.receiveIdType}
                  onChange={(event) =>
                    setFeishuDraft({
                      ...feishuDraft,
                      receiveIdType: event.target
                        .value as TesTFeishuConfig["receiveIdType"],
                    })
                  }
                >
                  <option value="chat_id">chat_id（群聊）</option>
                  <option value="open_id">open_id（用户）</option>
                  <option value="user_id">user_id</option>
                  <option value="email">email</option>
                </select>

                <label className="field-label" htmlFor="feishu-receive-id">
                  默认接收 ID
                </label>
                <input
                  id="feishu-receive-id"
                  className="input"
                  value={feishuDraft.receiveId}
                  placeholder="oc_xxx / ou_xxx"
                  onChange={(event) =>
                    setFeishuDraft({
                      ...feishuDraft,
                      receiveId: event.target.value,
                    })
                  }
                />

                <label className="field-label" htmlFor="feishu-open-ids">
                  允许的 Open ID（每行一个）
                </label>
                <textarea
                  id="feishu-open-ids"
                  className="input feishu-textarea"
                  rows={4}
                  value={feishuOpenIdsText}
                  placeholder={"ou_xxxxxxxx\nou_yyyyyyyy"}
                  onChange={(event) =>
                    setFeishuOpenIdsText(event.target.value)
                  }
                />

                <div className="setting-row">
                  <div>
                    <b>允许所有用户</b>
                    <small>不推荐，仅临时调试使用</small>
                  </div>
                  <div className="setting-control">
                    <Switch
                      checked={feishuDraft.allowAll}
                      onChange={() =>
                        setFeishuDraft({
                          ...feishuDraft,
                          allowAll: !feishuDraft.allowAll,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="setting-row">
                  <div>
                    <b>启用飞书通道</b>
                    <small>保存后自动建立长连接并接收机器人消息</small>
                  </div>
                  <div className="setting-control">
                    <Switch
                      checked={feishuDraft.enabled}
                      onChange={() =>
                        setFeishuDraft({
                          ...feishuDraft,
                          enabled: !feishuDraft.enabled,
                        })
                      }
                    />
                  </div>
                </div>

                {feishuValidation && !feishuValidation.ok && (
                  <div className="feishu-validation">
                    {feishuValidation.errors.map((error) => (
                      <div key={error}>· {error}</div>
                    ))}
                  </div>
                )}

                {feishuNotice && (
                  <p className="feishu-notice">{feishuNotice}</p>
                )}

                <div className="feishu-actions">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void loadFeishuConfig()}
                  >
                    <RotateCcw size={12} /> 重新读取
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Save size={12} />}
                    disabled={feishuSaving}
                    onClick={() => void saveFeishuConfig()}
                  >
                    {feishuSaving ? "保存中…" : "保存配置"}
                  </Button>
                </div>

                <p className="remote-note">
                  配置文件：{feishuPath || "保存后显示"}。
                  保存后会自动建立飞书长连接，收到的消息会转给当前 Pi
                  会话，回复也会发回原会话。危险命令审批会同步到飞书，
                  可回复 /approve 或 /deny 处理。
                </p>
              </div>
              </details>
            </TabsPrimitive.Content>

            <TabsPrimitive.Content value="shortcuts" className="tabs-content">
              {shortcuts.map((item) => (
                <div className="shortcut-row" key={item.label}>
                  <span>{item.label}</span>
                  {item.id ? (
                    <input
                      className="shortcut-input"
                      value={
                        shortcutOverrides[item.id] || item.keys.join("+")
                      }
                      onChange={(event) =>
                        setShortcut(item.id!, event.target.value)
                      }
                      placeholder={item.keys.join("+")}
                      title="例如 Ctrl+K、Ctrl+Shift+F"
                    />
                  ) : (
                    <span className="keys">
                      {item.keys.map((key) => (
                        <kbd key={key}>{key}</kbd>
                      ))}
                    </span>
                  )}
                </div>
              ))}
              <SeparatorPrimitive.Root className="sep-line" />
              <p className="shortcut-note">
                快捷键输入格式如 Ctrl+K；留空恢复默认。Enter 发送、Shift + Enter 换行。
              </p>
              {shortcutConflict && (
                <p className="preset-error">{shortcutConflict}</p>
              )}
            </TabsPrimitive.Content>

            <TabsPrimitive.Content value="update" className="tabs-content">
              <section className="update-section">
                <div className="update-section-head">
                  <div>
                    <b>TesT 桌面端</b>
                    <small>GitHub Releases 自动更新</small>
                  </div>
                  <span className="setting-value">
                    {updateStatus?.version || "0.1.0"}
                  </span>
                </div>
                <div className="setting-row">
                  <div>
                    <b>更新状态</b>
                    <small>
                      {updateStatus?.message || "尚未检查更新"}
                    </small>
                  </div>
                  <span className="setting-value">
                    {updateStatus?.percent
                      ? `${updateStatus.percent}%`
                      : updateStatus?.state || "idle"}
                  </span>
                </div>
                <label className="field-label">桌面端更新源</label>
                <input
                  className="input"
                  value={feedUrl}
                  onChange={(event) => setFeedUrl(event.target.value)}
                  placeholder="https://github.com/SgF-123/TesT/releases/latest/download/"
                />
                <div className="update-actions">
                  <Button
                    variant="secondary"
                    icon={<Save size={12} />}
                    onClick={() => onSaveUpdateFeed(feedUrl)}
                    disabled={!feedUrl.trim()}
                  >
                    保存更新源
                  </Button>
                  <Button
                    variant="ghost"
                    icon={<Eraser size={12} />}
                    onClick={onClearUpdateFeed}
                  >
                    恢复默认
                  </Button>
                </div>
                <div className="update-actions">
                  <Button variant="secondary" onClick={onCheckUpdate}>
                    <RotateCcw size={12} /> 检查桌面端更新
                  </Button>
                  {updateStatus?.state === "available" && (
                    <Button
                      variant="primary"
                      icon={<Download size={12} />}
                      onClick={onDownloadUpdate}
                    >
                      下载更新
                    </Button>
                  )}
                  {updateStatus?.state === "downloaded" && (
                    <Button
                      variant="primary"
                      icon={<RefreshCw size={12} />}
                      onClick={onInstallUpdate}
                    >
                      重启并安装
                    </Button>
                  )}
                </div>
                <p className="update-note">
                  当前源：{updateStatus?.feedUrl || "未配置"}
                  <br />
                  默认源为 GitHub Releases；自定义配置写入{" "}
                  <code>%APPDATA%\TesT\update.json</code>
                </p>
              </section>

              <section className="update-section pi-update-section">
                <div className="update-section-head">
                  <div>
                    <b>Pi 内核</b>
                    <small>跟随官方 npm 源 · 单独更新</small>
                  </div>
                  <Tag tone="mint">官方</Tag>
                </div>
                <div className="setting-row">
                  <div>
                    <b>当前内核</b>
                    <small>
                      {piUpdateStatus?.packageName ||
                        "@earendil-works/pi-coding-agent"}
                    </small>
                  </div>
                  <span className="setting-value">
                    {piUpdateStatus?.currentVersion || "—"}
                  </span>
                </div>
                <div className="setting-row">
                  <div>
                    <b>官方最新</b>
                    <small>
                      {piUpdateStatus?.source ||
                        "https://registry.npmjs.org"}
                    </small>
                  </div>
                  <span className="setting-value">
                    {piUpdateStatus?.latestVersion || "未检查"}
                  </span>
                </div>
                <div className="update-actions">
                  <Button
                    variant="secondary"
                    onClick={onCheckPiUpdate}
                    disabled={
                      piUpdateStatus?.state === "checking" ||
                      piUpdateStatus?.state === "downloading" ||
                      piUpdateStatus?.state === "installing"
                    }
                  >
                    <RotateCcw size={12} /> 检查 Pi 更新
                  </Button>
                  {(piUpdateStatus?.state === "available" ||
                    piUpdateStatus?.state === "downloading" ||
                    piUpdateStatus?.state === "installing") && (
                    <Button
                      variant="primary"
                      icon={
                        piUpdateStatus?.state === "downloading" ||
                        piUpdateStatus?.state === "installing" ? (
                          <RefreshCw size={12} className="spin" />
                        ) : (
                          <Download size={12} />
                        )
                      }
                      onClick={onInstallPiUpdate}
                      disabled={
                        piUpdateStatus?.state === "downloading" ||
                        piUpdateStatus?.state === "installing"
                      }
                    >
                      {piUpdateStatus?.state === "downloading"
                        ? `下载中 ${piUpdateStatus.percent ?? 0}%`
                        : piUpdateStatus?.state === "installing"
                          ? "安装中…"
                          : "更新 Pi 内核"}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    icon={<RotateCcw size={12} />}
                    onClick={onRestorePiKernel}
                  >
                    恢复内置内核
                  </Button>
                </div>
                <p className="update-note">
                  {piUpdateStatus?.message ||
                    "Pi 内核独立于桌面端更新，更新后会自动重启 Pi。"}
                  <br />
                  官方源：registry.npmjs.org · 安装到
                  <code>%APPDATA%\TesT\pi-kernel</code>
                </p>
              </section>
            </TabsPrimitive.Content>
          </TabsPrimitive.Root>

          <div className="dialog-foot">
            <div>
              <DialogPrimitive.Close asChild>
                <Button
                  variant="primary"
                  icon={<Check size={13} />}
                  onClick={onSave}
                >
                  完成
                </Button>
              </DialogPrimitive.Close>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function UsageDialog({
  open,
  onOpenChange,
  sessionStats,
  piStatus,
  modelLabel,
  reasoning,
  workspace,
  budgetUsd,
  onBudgetUsd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionStats: SessionStats | null;
  piStatus: "offline" | "connecting" | "ready" | "error";
  modelLabel: string;
  reasoning: string;
  workspace: string;
  budgetUsd: number;
  onBudgetUsd: (value: number) => void;
}) {
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }
    const request = window.tesT?.usageStats?.();
    if (!request) {
      setUsage(null);
      setLoading(false);
      setError("当前环境不支持用量统计");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    request
      .then((result) => {
        if (cancelled) {
          return;
        }
        if (result?.error) {
          setError(result.error);
        }
        setUsage(result ?? null);
        setLoading(false);
      })
      .catch((reason) => {
        if (!cancelled) {
          setError(String(reason));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const days = useMemo(() => {
    const map = new Map(
      (usage?.days ?? []).map((day) => [day.date ?? "", day]),
    );
    const list: {
      key: string;
      label: string;
      cost: number;
      tokens: number;
      requests: number;
    }[] = [];
    for (let offset = 13; offset >= 0; offset -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - offset);
      const key = `${date.getFullYear()}-${String(
        date.getMonth() + 1,
      ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const bucket = map.get(key);
      list.push({
        key,
        label: `${date.getMonth() + 1}/${date.getDate()}`,
        cost: bucket?.cost ?? 0,
        tokens: bucket?.tokens ?? 0,
        requests: bucket?.requests ?? 0,
      });
    }
    return list;
  }, [usage]);

  const metricIsCost = days.some((day) => day.cost > 0);
  const peak = Math.max(
    0.0001,
    ...days.map((day) => (metricIsCost ? day.cost : day.tokens)),
  );
  const models = useMemo(() => {
    const list = [...(usage?.models ?? [])];
    if (metricIsCost) {
      return list.sort((a, b) => b.cost - a.cost).slice(0, 6);
    }
    return list.sort((a, b) => b.tokens - a.tokens).slice(0, 6);
  }, [usage, metricIsCost]);
  const activeDays = (usage?.days ?? []).filter(
    (day) => day.requests > 0,
  ).length;
  const statusLabel =
    piStatus === "ready"
      ? "已连接"
      : piStatus === "connecting"
        ? "连接中"
        : piStatus === "error"
          ? "连接异常"
          : "未连接";

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="rx-overlay" />
        <DialogPrimitive.Content className="dialog usage-dialog">
          <div className="dialog-head">
            <div>
              <DialogPrimitive.Title className="dialog-title">
                状态与用量
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="dialog-desc">
                Pi 连接、本次会话与历史花费 · 只读
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="icon" aria-label="关闭">
                <X size={15} />
              </Button>
            </DialogPrimitive.Close>
          </div>

          <div className="dialog-body usage-body">
            <div className="usage-status">
              <span className={`usage-chip ${piStatus}`}>
                <i />
                Pi {statusLabel}
              </span>
              <span className="usage-chip" title={modelLabel}>
                <Cpu size={11} />
                {modelLabel}
              </span>
              <span className="usage-chip">
                <Zap size={11} />
                {reasoning}
              </span>
              {workspace && (
                <span className="usage-chip wide" title={workspace}>
                  <Folder size={11} />
                  {workspace}
                </span>
              )}
            </div>

            <div className="usage-cards">
              <div className="usage-card">
                <small>累计花费</small>
                <b>{formatCost(usage?.total.cost)}</b>
              </div>
              <div className="usage-card">
                <small>累计 Tokens</small>
                <b>{formatTokenCount(usage?.total.tokens ?? 0)}</b>
              </div>
              <div className="usage-card">
                <small>模型请求</small>
                <b>{(usage?.total.requests ?? 0).toLocaleString()}</b>
              </div>
              <div className="usage-card">
                <small>活跃天数</small>
                <b>{activeDays}</b>
              </div>
            </div>

            <section className="usage-section">
              <div className="usage-section-head">
                <b>最近 14 天</b>
                <span>{metricIsCost ? "按花费" : "按 Tokens"}</span>
              </div>
              <div className="usage-chart">
                {days.map((day) => {
                  const value = metricIsCost ? day.cost : day.tokens;
                  const height = Math.max(
                    3,
                    Math.round((value / peak) * 64),
                  );
                  return (
                    <div
                      className={`usage-bar ${
                        value > 0 ? "has-value" : ""
                      }`}
                      key={day.key}
                      title={`${day.key} · ${formatCost(
                        day.cost,
                      )} · ${formatTokenCount(day.tokens)} tokens · ${
                        day.requests
                      } 次`}
                    >
                      <span
                        className="usage-bar-fill"
                        style={{ height: `${height}px` }}
                      />
                      <small>{day.label}</small>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="usage-section">
              <div className="usage-section-head">
                <b>模型用量</b>
                <span>Top {models.length || 0}</span>
              </div>
              {loading && <div className="usage-empty">正在统计会话…</div>}
              {!loading && error && (
                <div className="usage-empty">{error}</div>
              )}
              {!loading && !error && models.length === 0 && (
                <div className="usage-empty">
                  还没有带用量记录的 Pi 会话
                </div>
              )}
              {!loading &&
                models.map((item) => (
                  <div
                    className="usage-model"
                    key={`${item.provider}/${item.model}`}
                  >
                    <span className="usage-model-name">
                      <b>{item.model || "unknown"}</b>
                      <small>{item.provider}</small>
                    </span>
                    <span className="usage-model-num">
                      {formatCost(item.cost)}
                    </span>
                    <span className="usage-model-tokens">
                      {formatTokenCount(item.tokens)}
                    </span>
                    <span className="usage-model-req">
                      {item.requests} 次
                    </span>
                  </div>
                ))}
            </section>

            <section className="usage-section usage-budget">
              <div className="usage-section-head">
                <b>本次会话</b>
                <span>{formatCost(sessionStats?.cost)}</span>
              </div>
              <div className="usage-budget-row">
                <div>
                  <b>花费预算</b>
                  <small>超过后提示，不会中断 Pi</small>
                </div>
                <label className="usage-budget-input">
                  <span>$</span>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    step={0.5}
                    value={budgetUsd || ""}
                    placeholder="不限"
                    onChange={(event) =>
                      onBudgetUsd(Number(event.target.value) || 0)
                    }
                  />
                </label>
              </div>
              <div className="usage-budget-meta">
                <span>
                  累计 Tokens {formatTokenCount(sessionStats?.tokens.total ?? 0)}
                </span>
                <span>
                  工具 {sessionStats?.toolCalls ?? 0} 次
                </span>
                <span>
                  消息 {messageCount(sessionStats)} 条
                </span>
              </div>
            </section>
          </div>

          <div className="dialog-foot">
            <span className="muted">
              统计 Pi 会话文件中的 usage 记录 · 最多 400 个会话
            </span>
            <div>
              <DialogPrimitive.Close asChild>
                <Button variant="primary" icon={<Check size={13} />}>
                  完成
                </Button>
              </DialogPrimitive.Close>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function ExtensionSheet({
  open,
  onOpenChange,
  skills,
  extensions,
  project,
  onToggle,
  onRemove,
  onDrop,
  onOpenFolder,
  onTrustProject,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skills: Extension[];
  extensions: Extension[];
  project?: {
    cwd: string;
    trusted: boolean;
    hasResources: boolean;
    skillsDir?: string;
    extensionsDir?: string;
  } | null;
  onToggle: (item: Extension) => void;
  onRemove: (item: Extension) => void;
  onDrop: (kind: "skill" | "extension", file: File) => void;
  onOpenFolder: (
    kind: "skill" | "extension",
    scope?: "global" | "project",
  ) => void;
  onTrustProject: () => void;
}) {
  const renderGroup = (
    kind: "skill" | "extension",
    title: string,
    items: Extension[],
    hint: string,
  ) => {
    const projectItems = items.filter(
      (item) => item.scope === "project",
    );
    const globalItems = items.filter(
      (item) => item.scope !== "project",
    );
    return (
    <section className="extension-group">
      <div className="extension-group-head">
        <b>{title}</b>
        <span>
          {globalItems.filter((item) => item.enabled).length} 个已启用
          {projectItems.length > 0
            ? ` · ${projectItems.length} 个项目`
            : ""}
        </span>
        <button type="button" className="link" onClick={() => onOpenFolder(kind)}>
          <FolderOpen size={11} /> 打开目录
        </button>
      </div>
      <div className="extension-list">
        {items.map((item) => (
          <div
            className="ext-row"
            key={`${item.scope || "global"}-${kind}-${item.name}`}
          >
            <span className="ext-icon">
              {kind === "skill" ? <Sparkles size={13} /> : <Puzzle size={13} />}
            </span>
            <div className="ext-main">
              <b>
                {item.name}
                {item.scope === "project" && (
                  <Tag tone="blue">项目</Tag>
                )}
              </b>
              <small>{item.desc}</small>
            </div>
            {item.readonly ? null : (
              <>
                <button type="button"
                  className="ext-remove"
                  title="删除"
                  onClick={() => onRemove(item)}
                >
                  <Trash2 size={12} />
                </button>
                <Switch
                  checked={item.enabled}
                  onChange={() => onToggle(item)}
                />
              </>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <div className="extension-empty">还没有{title}</div>
        )}
      </div>
      <button type="button"
        className="dropzone"
        onClick={() => onOpenFolder(kind)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const file = event.dataTransfer.files?.[0];
          if (file) {
            onDrop(kind, file);
          }
        }}
      >
        <Plus size={13} /> 拖入 .zip / 文件夹安装 · {hint}
      </button>
    </section>
    );
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="rx-overlay" />
        <DialogPrimitive.Content
          className="sheet"
          tabIndex={-1}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            (event.currentTarget as HTMLElement).focus();
          }}
        >
          <div className="sheet-head">
            <div>
              <DialogPrimitive.Title className="sheet-title">
                技能与扩展
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="sheet-desc">
                全局安装目录 + 当前项目 .pi 资源
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="icon" aria-label="关闭">
                <X size={15} />
              </Button>
            </DialogPrimitive.Close>
          </div>

          <ScrollAreaPrimitive.Root className="scroll-area">
            <ScrollAreaPrimitive.Viewport className="scroll-area-viewport">
              <div className="sheet-body">
                {project?.hasResources && (
                  <div
                    className={`project-trust ${
                      project.trusted ? "trusted" : ""
                    }`}
                  >
                    <div className="project-trust-main">
                      <b>当前项目资源</b>
                      <small>{project.cwd}</small>
                      <span>
                        {project.trusted
                          ? "已信任 · Pi 会加载 .pi/skills 与 .pi/extensions"
                          : "尚未信任 · Pi 暂不加载项目技能 / 扩展"}
                      </span>
                    </div>
                    <div className="project-trust-actions">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<BookOpen size={12} />}
                        onClick={() => onOpenFolder("skill", "project")}
                      >
                        技能目录
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Puzzle size={12} />}
                        onClick={() =>
                          onOpenFolder("extension", "project")
                        }
                      >
                        扩展目录
                      </Button>
                      {!project.trusted && (
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<ShieldCheck size={12} />}
                          onClick={onTrustProject}
                        >
                          信任并加载
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                {renderGroup(
                  "skill",
                  "技能",
                  skills,
                  "SKILL.md",
                )}
                {renderGroup(
                  "extension",
                  "扩展",
                  extensions,
                  "package.json / index.js",
                )}
                <p className="sheet-tip">
                  全局技能安装在 TesT 的 Pi 数据目录 skills/，扩展安装在
                  extensions/；禁用后会移到 disabled 目录。当前项目的
                  .pi/skills 与 .pi/extensions 以「项目」标记列出，信任项目后
                  Pi 才会加载。
                </p>
              </div>
            </ScrollAreaPrimitive.Viewport>
            <ScrollAreaPrimitive.Scrollbar
              className="scroll-area-bar"
              orientation="vertical"
            >
              <ScrollAreaPrimitive.Thumb className="scroll-area-thumb" />
            </ScrollAreaPrimitive.Scrollbar>
            <ScrollAreaPrimitive.Corner />
          </ScrollAreaPrimitive.Root>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function CloseDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className="rx-overlay" />
        <AlertDialogPrimitive.Content className="dialog small">
          <div className="dialog-head">
            <div>
              <AlertDialogPrimitive.Title className="dialog-title">
                退出 TesT？
              </AlertDialogPrimitive.Title>
              <AlertDialogPrimitive.Description className="dialog-desc">
                会话记录会保留，Pi RPC 进程将在退出时停止。
              </AlertDialogPrimitive.Description>
            </div>
          </div>
          <div className="dialog-body alert-body">
            <p className="muted">
              下班前记得把未完成的会话留在工作区里，下次启动可以继续。
            </p>
          </div>
          <div className="dialog-foot">
            <div>
              <AlertDialogPrimitive.Cancel asChild>
                <Button variant="secondary" icon={<X size={13} />}>
                  取消
                </Button>
              </AlertDialogPrimitive.Cancel>
              <AlertDialogPrimitive.Action asChild>
                <Button
                  variant="danger"
                  icon={<LogOut size={13} />}
                  onClick={onConfirm}
                >
                  退出
                </Button>
              </AlertDialogPrimitive.Action>
            </div>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}

function DeleteSessionDialog({
  open,
  title,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  title: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className="rx-overlay" />
        <AlertDialogPrimitive.Content className="dialog small">
          <div className="dialog-head">
            <div>
              <AlertDialogPrimitive.Title className="dialog-title">
                删除这个会话？
              </AlertDialogPrimitive.Title>
              <AlertDialogPrimitive.Description className="dialog-desc">
                会删除 Pi 的会话文件，无法从应用内恢复。
              </AlertDialogPrimitive.Description>
            </div>
          </div>
          <div className="dialog-body alert-body">
            <p className="muted">{title || "未命名会话"}</p>
            <p className="muted">
              如果只是想收起，可以先「归档会话」；归档会保留原文件。
            </p>
          </div>
          <div className="dialog-foot">
            <span className="muted">Pi sessions · jsonl</span>
            <div>
              <AlertDialogPrimitive.Cancel asChild>
                <Button variant="secondary" icon={<X size={13} />}>
                  取消
                </Button>
              </AlertDialogPrimitive.Cancel>
              <AlertDialogPrimitive.Action asChild>
                <Button
                  variant="danger"
                  icon={<Trash2 size={13} />}
                  onClick={onConfirm}
                >
                  删除
                </Button>
              </AlertDialogPrimitive.Action>
            </div>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}

function BranchDialog({
  open,
  onOpenChange,
  cwd,
  branches,
  current,
  onChanged,
  onCheckout,
  onNotify,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cwd: string;
  branches: string[];
  current: string;
  onChanged: (info: {
    repo: boolean;
    branch: string | null;
    branches: string[];
  }) => void;
  onCheckout: (branch: string) => void;
  onNotify: (title: string, desc?: string) => void;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState("");

  useEffect(() => {
    if (open) {
      setName("");
      setPendingDelete("");
      setBusy(false);
    }
  }, [open]);

  const create = () => {
    const value = name.trim();
    if (!value || !window.tesT?.gitBranchCreate) {
      return;
    }
    setBusy(true);
    void window.tesT
      .gitBranchCreate({ cwd, branch: value })
      .then((result) => {
        if (result?.error) {
          onNotify("创建分支失败", result.error);
          return;
        }
        if (result.info) {
          onChanged(result.info);
        }
        onNotify("分支已创建", value);
        setName("");
      })
      .catch((error) => onNotify("创建分支失败", String(error)))
      .finally(() => setBusy(false));
  };

  const remove = (branch: string) => {
    if (!window.tesT?.gitBranchDelete) {
      return;
    }
    if (pendingDelete !== branch) {
      setPendingDelete(branch);
      return;
    }
    setPendingDelete("");
    setBusy(true);
    void window.tesT
      .gitBranchDelete({ cwd, branch })
      .then((result) => {
        if (result?.error) {
          onNotify("删除分支失败", result.error);
          return;
        }
        if (result.info) {
          onChanged(result.info);
        }
        onNotify("分支已删除", branch);
      })
      .catch((error) => onNotify("删除分支失败", String(error)))
      .finally(() => setBusy(false));
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="rx-overlay" />
        <DialogPrimitive.Content className="dialog small branch-dialog">
          <div className="dialog-head">
            <div>
              <DialogPrimitive.Title className="dialog-title">
                分支
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="dialog-desc">
                {cwd || "未选择工作区"} · 当前 {current || "—"}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="icon" aria-label="关闭">
                <X size={15} />
              </Button>
            </DialogPrimitive.Close>
          </div>
          <div className="dialog-body branch-body">
            <div className="branch-create">
              <input
                className="input"
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    create();
                  }
                }}
                placeholder="新分支名，例如 feat/composer"
              />
              <Button
                variant="primary"
                size="sm"
                disabled={busy || !name.trim()}
                onClick={create}
              >
                <Plus size={12} /> 创建
              </Button>
            </div>
            <div className="branch-list">
              {branches.map((branch) => (
                <div
                  key={branch}
                  className={`branch-row ${
                    branch === current ? "current" : ""
                  }`}
                >
                  <button type="button"
                    className="branch-name"
                    onClick={() => {
                      onCheckout(branch);
                      onOpenChange(false);
                    }}
                  >
                    <GitBranch size={12} />
                    <span>{branch}</span>
                    {branch === current && <Tag tone="mint">当前</Tag>}
                  </button>
                  {branch !== current && (
                    <Button
                      variant={pendingDelete === branch ? "danger" : "ghost"}
                      size="sm"
                      icon={<Trash2 size={12} />}
                      disabled={busy}
                      onClick={() => remove(branch)}
                    >
                      {pendingDelete === branch ? "确认删除" : "删除"}
                    </Button>
                  )}
                </div>
              ))}
              {branches.length === 0 && (
                <div className="file-empty">当前工作区不是 Git 仓库</div>
              )}
            </div>
          </div>
          <div className="dialog-foot">
            <span className="muted">git checkout / branch</span>
            <DialogPrimitive.Close asChild>
              <Button variant="secondary" icon={<X size={13} />}>
                关闭
              </Button>
            </DialogPrimitive.Close>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function ExtensionPromptDialog({
  prompt,
  onRespond,
  onCancel,
}: {
  prompt: ExtensionPrompt | null;
  onRespond: (payload: {
    value?: string;
    confirmed?: boolean;
  }) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (!prompt) {
      return;
    }
    setValue(
      prompt.method === "editor" ? prompt.prefill || "" : "",
    );
  }, [prompt?.id]);

  if (!prompt) {
    return null;
  }

  return (
    <DialogPrimitive.Root
      open
      onOpenChange={(open) => {
        if (!open) {
          onCancel();
        }
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="rx-overlay" />
        <DialogPrimitive.Content
          className="dialog small extension-prompt"
        >
          <div className="dialog-head">
            <div>
              <DialogPrimitive.Title className="dialog-title">
                {prompt.title || "Pi 需要确认"}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="dialog-desc">
                {prompt.message ||
                  "来自 Pi 扩展的交互请求"}
              </DialogPrimitive.Description>
            </div>
          </div>
          <div className="dialog-body extension-prompt-body">
            {prompt.method === "select" &&
              (prompt.options || []).map((option) => (
                <button type="button"
                  key={option}
                  className="extension-option"
                  onClick={() => onRespond({ value: option })}
                >
                  {option}
                  <ChevronRight size={12} />
                </button>
              ))}

            {prompt.method === "confirm" && (
              <div className="extension-confirm">
                <Button
                  variant="secondary"
                  icon={<X size={12} />}
                  onClick={() => onRespond({ confirmed: false })}
                >
                  取消
                </Button>
                <Button
                  variant="primary"
                  icon={<Check size={12} />}
                  onClick={() => onRespond({ confirmed: true })}
                >
                  确认
                </Button>
              </div>
            )}

            {prompt.method === "input" && (
              <input
                className="input"
                autoFocus
                value={value}
                placeholder={prompt.placeholder || ""}
                onChange={(event) => setValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    onRespond({ value });
                  }
                }}
              />
            )}

            {prompt.method === "editor" && (
              <textarea
                className="input extension-editor"
                autoFocus
                value={value}
                onChange={(event) => setValue(event.target.value)}
              />
            )}
          </div>
          <div className="dialog-foot">
            <span className="muted">
              Pi extension · {prompt.method}
            </span>
            <div>
              <Button
                variant="secondary"
                icon={<X size={13} />}
                onClick={onCancel}
              >
                取消
              </Button>
              {(prompt.method === "input" ||
                prompt.method === "editor") && (
                <Button
                  variant="primary"
                  icon={<Check size={13} />}
                  onClick={() => onRespond({ value })}
                >
                  提交
                </Button>
              )}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function ArchivedSessionsDialog({
  open,
  onOpenChange,
  onRestored,
  onNotify,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestored: () => void;
  onNotify: (title: string, desc?: string) => void;
}) {
  const [sessions, setSessions] = useState<
    Array<{
      path: string;
      name: string;
      cwd: string;
      messageCount: number;
      modified: string;
      size: number;
    }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState("");

  useEffect(() => {
    if (!open || !window.tesT?.listArchivedSessions) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    void window.tesT
      .listArchivedSessions()
      .then((result) => {
        if (cancelled) {
          return;
        }
        if (result?.error) {
          onNotify("读取归档失败", result.error);
        }
        setSessions(result?.sessions || []);
      })
      .catch((error) => {
        if (!cancelled) {
          onNotify("读取归档失败", String(error));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const restore = (path: string) => {
    if (!window.tesT?.restoreArchivedSession) {
      return;
    }
    setRestoring(path);
    void window.tesT
      .restoreArchivedSession({ path })
      .then((result) => {
        if (result?.error) {
          onNotify("恢复失败", result.error);
          return;
        }
        setSessions((previous) =>
          previous.filter((item) => item.path !== path),
        );
        onRestored();
        onNotify("会话已恢复");
      })
      .catch((error) => onNotify("恢复失败", String(error)))
      .finally(() => setRestoring(""));
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="rx-overlay" />
        <DialogPrimitive.Content className="dialog small archive-dialog">
          <div className="dialog-head">
            <div>
              <DialogPrimitive.Title className="dialog-title">
                归档会话
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="dialog-desc">
                {sessions.length} 个归档文件
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="icon" aria-label="关闭">
                <X size={15} />
              </Button>
            </DialogPrimitive.Close>
          </div>
          <div className="dialog-body archive-list">
            {loading && <div className="file-empty">正在读取…</div>}
            {!loading && sessions.length === 0 && (
              <div className="file-empty">还没有归档会话</div>
            )}
            {!loading &&
              sessions.map((session) => (
                <div className="archive-row" key={session.path}>
                  <Archive size={13} />
                  <span className="archive-main">
                    <b>{session.name}</b>
                    <small>
                      {session.cwd || "未知工作区"} ·{" "}
                      {session.messageCount} 条消息 ·{" "}
                      {relativeSessionTime(session.modified)}
                    </small>
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<RotateCcw size={12} />}
                    disabled={restoring === session.path}
                    onClick={() => restore(session.path)}
                  >
                    {restoring === session.path ? "恢复中…" : "恢复"}
                  </Button>
                </div>
              ))}
          </div>
          <div className="dialog-foot">
            <span className="muted">恢复后回到工作区列表</span>
            <DialogPrimitive.Close asChild>
              <Button variant="primary" icon={<X size={13} />}>
                关闭
              </Button>
            </DialogPrimitive.Close>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function LogDialog({
  open,
  onOpenChange,
  onNotify,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNotify: (title: string, desc?: string) => void;
}) {
  const [text, setText] = useState("");
  const [filePath, setFilePath] = useState("");
  const [loading, setLoading] = useState(false);
  const outputRef = useRef<HTMLPreElement | null>(null);

  const load = () => {
    if (!window.tesT?.readLog) {
      return;
    }
    setLoading(true);
    void window.tesT
      .readLog()
      .then((result) => {
        if (result?.error) {
          onNotify("读取日志失败", result.error);
        }
        setText(result?.text || "");
        setFilePath(result?.path || "");
      })
      .catch((error) => onNotify("读取日志失败", String(error)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (open) {
      load();
    }
  }, [open]);

  useEffect(() => {
    const element = outputRef.current;
    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  }, [text]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="rx-overlay" />
        <DialogPrimitive.Content className="dialog log-dialog">
          <div className="dialog-head">
            <div>
              <DialogPrimitive.Title className="dialog-title">
                运行日志
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="dialog-desc">
                electron.log · 最近 240 KB
              </DialogPrimitive.Description>
            </div>
            <div className="file-head-actions">
              <Button variant="ghost" size="sm" onClick={load}>
                <RotateCcw size={12} /> 刷新
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  void window.tesT?.openDataDir?.();
                }}
              >
                <FolderOpen size={12} /> 数据目录
              </Button>
              <DialogPrimitive.Close asChild>
                <Button variant="icon" aria-label="关闭">
                  <X size={15} />
                </Button>
              </DialogPrimitive.Close>
            </div>
          </div>
          <pre className="log-output" ref={outputRef}>
            {loading && !text ? "正在读取…" : text || "没有日志"}
          </pre>
          <div className="dialog-foot">
            <span className="muted">{filePath || "electron.log"}</span>
            <DialogPrimitive.Close asChild>
              <Button variant="primary" icon={<X size={13} />}>
                关闭
              </Button>
            </DialogPrimitive.Close>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function RenameDialog({
  open,
  value,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  value: string;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState(value);

  useEffect(() => {
    if (open) {
      setName(value);
    }
  }, [open, value]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="rx-overlay" />
        <DialogPrimitive.Content className="dialog small">
          <div className="dialog-head">
            <div>
              <DialogPrimitive.Title className="dialog-title">
                重命名会话
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="dialog-desc">
                只修改显示名称，不改 cwd 和消息内容
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="icon" aria-label="关闭">
                <X size={15} />
              </Button>
            </DialogPrimitive.Close>
          </div>
          <div className="dialog-body">
            <input
              className="input"
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && name.trim()) {
                  onSave(name.trim());
                }
              }}
              placeholder="会话名称"
            />
          </div>
          <div className="dialog-foot">
            <span className="muted">Pi session_info</span>
            <div>
              <Button
                variant="secondary"
                icon={<X size={13} />}
                onClick={() => onOpenChange(false)}
              >
                取消
              </Button>
              <Button
                variant="primary"
                icon={<Save size={13} />}
                disabled={!name.trim()}
                onClick={() => onSave(name.trim())}
              >
                保存
              </Button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

type LoginProvider = {
  id: string;
  name: string;
  hasOAuth: boolean;
  oauthName?: string | null;
  hasApiKey: boolean;
  configured: boolean;
  source?: string | null;
  credentialType?: string | null;
  modelCount: number;
};

type LoginPromptState = {
  id: string;
  provider: string;
  prompt: {
    type: string;
    message?: string;
    placeholder?: string;
    options?: { id: string; label: string; description?: string }[];
  };
};

function LoginDialog({
  open,
  onOpenChange,
  onNotify,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNotify: (title: string, desc?: string) => void;
  onSuccess: () => void;
}) {
  const bridge = window.tesT;
  const [providers, setProviders] = useState<LoginProvider[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "oauth" | "api">("all");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<LoginProvider | null>(null);
  const [mode, setMode] = useState<"oauth" | "api_key">("oauth");
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState("");
  const [event, setEvent] = useState<any>(null);
  const [prompt, setPrompt] = useState<LoginPromptState | null>(null);
  const [promptValue, setPromptValue] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const openedUrl = useRef("");
  const providerListRef = useRef<HTMLDivElement>(null);
  const notifyRef = useRef(onNotify);
  notifyRef.current = onNotify;
  const openChangeRef = useRef(onOpenChange);
  openChangeRef.current = onOpenChange;
  const successRef = useRef(onSuccess);
  successRef.current = onSuccess;
  const wasOpen = useRef(false);

  const reset = () => {
    setSelected(null);
    setMode("oauth");
    setApiKey("");
    setStatus("");
    setEvent(null);
    setPrompt(null);
    setPromptValue("");
    setError("");
    setSuccess(false);
    openedUrl.current = "";
  };

  useEffect(() => {
    if (!open) {
      if (wasOpen.current) {
        bridge?.loginCancel?.();
        reset();
      }
      wasOpen.current = false;
      return;
    }
    wasOpen.current = true;

    setLoading(true);
    setError("");

    const listener = (record: any) => {
      if (record.type === "login_providers") {
        setProviders(Array.isArray(record.providers) ? record.providers : []);
        setLoading(false);
        return;
      }

      if (record.type === "login_event") {
        const next = record.event;
        setEvent(next);
        if (next?.type === "auth_url" && next.url) {
          setStatus(next.instructions || "请在浏览器中完成授权");
          if (openedUrl.current !== next.url) {
            openedUrl.current = next.url;
            void bridge?.openExternal?.(next.url);
          }
        } else if (next?.type === "device_code") {
          setStatus("请在浏览器中输入设备码");
        } else if (next?.type === "progress") {
          setStatus(next.message || "处理中…");
        } else if (next?.type === "info") {
          setStatus(next.message || "");
        }
        return;
      }

      if (record.type === "login_prompt") {
        setPrompt({
          id: record.id,
          provider: record.provider,
          prompt: record.prompt,
        });
        setPromptValue("");
        return;
      }

      if (record.type === "login_logout_success") {
        if (Array.isArray(record.providers)) {
          setProviders(record.providers);
        }
        notifyRef.current("已退出登录", record.provider);
        return;
      }

      if (record.type === "login_success") {
        setSuccess(true);
        setLoading(false);
        setPrompt(null);
        setStatus("登录成功，正在刷新模型…");
        if (Array.isArray(record.providers)) {
          setProviders(record.providers);
        }
        notifyRef.current("Pi 登录成功", record.provider);
        successRef.current();
        window.setTimeout(() => openChangeRef.current(false), 1200);
        return;
      }

      if (record.type === "login_error") {
        setLoading(false);
        setError(record.message || "登录失败");
        setStatus("");
        return;
      }

      if (record.type === "login_cancelled") {
        setLoading(false);
        setStatus("已取消");
        setPrompt(null);
        return;
      }
    };

    bridge?.onRecord(listener);
    void bridge
      ?.loginProviders?.()
      .then((result) => {
        setProviders(result.providers || []);
        if (result.error) {
          setError(result.error);
        }
      })
      .catch((reason) => setError(String(reason)))
      .finally(() => setLoading(false));

    return () => bridge?.offRecord?.(listener);
  }, [open, bridge]);

  const filtered = providers.filter((provider) => {
    if (filter === "oauth" && !provider.hasOAuth) {
      return false;
    }
    if (filter === "api" && !provider.hasApiKey) {
      return false;
    }
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return true;
    }
    return [provider.id, provider.name, provider.oauthName || ""]
      .join(" ")
      .toLowerCase()
      .includes(needle);
  });

  useEffect(() => {
    providerListRef.current?.scrollTo({ top: 0 });
  }, [providers.length, query, filter]);

  const choose = (provider: LoginProvider) => {
    setSelected(provider);
    setMode(provider.hasOAuth ? "oauth" : "api_key");
    setApiKey("");
    setStatus("");
    setEvent(null);
    setPrompt(null);
    setPromptValue("");
    setError("");
    setSuccess(false);
    openedUrl.current = "";
  };

  const start = () => {
    if (!selected) {
      return;
    }

    if (mode === "api_key" && !apiKey.trim()) {
      setError("请输入 API Key");
      return;
    }

    setError("");
    setEvent(null);
    setPrompt(null);
    setStatus(mode === "oauth" ? "正在准备授权…" : "正在验证 API Key…");
    setLoading(true);
    void bridge
      ?.loginStart?.({
        provider: selected.id,
        mode,
        apiKey: apiKey.trim(),
      })
      .then((result) => {
        if (result?.error) {
          setError(result.error);
          setLoading(false);
        }
      })
      .catch((reason) => {
        setError(String(reason));
        setLoading(false);
      });
  };

  const logout = (provider: LoginProvider) => {
    const request = bridge?.logoutProvider?.({ provider: provider.id });
    request?.then((result) => {
      if (result?.error) {
        notifyRef.current("退出登录失败", result.error);
      }
    });
  };

  const respond = (value: string, cancelled = false) => {
    if (!prompt) {
      return;
    }

    void bridge?.loginPromptResponse?.({
      id: prompt.id,
      value,
      cancelled,
    });
    setPrompt(null);
    setPromptValue("");
  };

  const back = () => {
    bridge?.loginCancel?.();
    reset();
  };

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(value) => {
        onOpenChange(value);
        if (!value) {
          reset();
        }
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="rx-overlay" />
        <DialogPrimitive.Content className="dialog login-dialog">
          <div className="dialog-head">
            <div>
              <DialogPrimitive.Title className="dialog-title">
                登录 Pi 服务商
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="dialog-desc">
                直接调用 Pi 原生 ModelRuntime · OAuth / API Key
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="icon" aria-label="关闭">
                <X size={15} />
              </Button>
            </DialogPrimitive.Close>
          </div>

          {!selected ? (
            <>
              <div className="preset-toolbar">
                <div className="search preset-search">
                  <Search size={14} />
                  <input
                    value={query}
                    onChange={(item) => setQuery(item.target.value)}
                    placeholder="搜索服务商…"
                  />
                </div>
                <span className="preset-count">
                  {loading ? "加载中…" : `${filtered.length} 个服务商`}
                </span>
              </div>
              <div className="login-filters">
                {[
                  { id: "all", label: "全部" },
                  { id: "oauth", label: "OAuth" },
                  { id: "api", label: "API Key" },
                ].map((item) => (
                  <button type="button"
                    key={item.id}
                    className={filter === item.id ? "on" : ""}
                    onClick={() =>
                      setFilter(item.id as "all" | "oauth" | "api")
                    }
                  >
                    {item.id === "all" ? (
                      <Globe size={12} />
                    ) : item.id === "oauth" ? (
                      <ShieldCheck size={12} />
                    ) : (
                      <KeyRound size={12} />
                    )}
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="login-provider-scroll" ref={providerListRef}>
                {filtered.map((provider) => (
                  <button type="button"
                    key={provider.id}
                    className="login-provider"
                    onClick={() => choose(provider)}
                  >
                    <span className="login-provider-main">
                      <b>{provider.name}</b>
                      <small>
                        {provider.id} · {provider.modelCount} 个模型
                        {provider.configured ? " · 已配置" : ""}
                      </small>
                    </span>
                    <span className="login-provider-tags">
                      {provider.hasOAuth && <Tag tone="mint">OAuth</Tag>}
                      {provider.hasApiKey && <Tag>API Key</Tag>}
                      {provider.configured && (
                        <span
                          className="login-logout"
                          role="button"
                          tabIndex={0}
                          onClick={(event) => {
                            event.stopPropagation();
                            logout(provider);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.stopPropagation();
                              logout(provider);
                            }
                          }}
                        >
                          <LogOut size={11} /> 退出
                        </span>
                      )}
                      <ChevronRight size={13} />
                    </span>
                  </button>
                ))}
                {!loading && filtered.length === 0 && (
                  <div className="preset-empty">没有匹配的服务商</div>
                )}
              </div>
            </>
          ) : (
            <div className="login-flow">
              <button type="button" className="preset-back" onClick={back}>
                <ChevronLeft size={12} /> 返回服务商
              </button>

              <div className="login-flow-head">
                <span className="login-flow-icon">
                  <LogIn size={16} />
                </span>
                <div>
                  <b>{selected.name}</b>
                  <small>
                    {selected.id} · {selected.modelCount} 个模型
                  </small>
                </div>
              </div>

              {!success && (
                <>
                  {selected.hasOAuth && selected.hasApiKey && (
                    <div className="login-mode">
                      <button type="button"
                        className={mode === "oauth" ? "on" : ""}
                        onClick={() => {
                          setMode("oauth");
                          setError("");
                          setEvent(null);
                          setPrompt(null);
                        }}
                      >
                        <ShieldCheck size={12} /> OAuth 登录
                      </button>
                      <button type="button"
                        className={mode === "api_key" ? "on" : ""}
                        onClick={() => {
                          setMode("api_key");
                          setError("");
                          setEvent(null);
                          setPrompt(null);
                        }}
                      >
                        <KeyRound size={12} /> API Key
                      </button>
                    </div>
                  )}

                  {mode === "api_key" && (
                    <>
                      <label className="field-label">API Key</label>
                      <input
                        className="input"
                        type="password"
                        value={apiKey}
                        onChange={(item) => setApiKey(item.target.value)}
                        placeholder="sk-..."
                      />
                    </>
                  )}

                  {status && <p className="login-status">{status}</p>}

                  {event?.type === "auth_url" && (
                    <div className="login-auth-box">
                      <b>浏览器授权</b>
                      <p>{event.instructions || "在浏览器中完成授权后回到这里。"}</p>
                      <div className="login-auth-actions">
                        <Button
                          variant="secondary"
                          onClick={() => void bridge?.openExternal?.(event.url)}
                        >
                          <Link2 size={12} /> 打开授权页
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            copyText(event.url);
                            onNotify("已复制授权链接");
                          }}
                        >
                          <Copy size={12} /> 复制链接
                        </Button>
                      </div>
                    </div>
                  )}

                  {event?.type === "device_code" && (
                    <div className="login-auth-box">
                      <b>设备码登录</b>
                      <p>在浏览器中输入下面的设备码：</p>
                      <div className="login-device-code">
                        <code>{event.userCode}</code>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            copyText(event.userCode);
                            onNotify("已复制设备码");
                          }}
                        >
                          <Copy size={12} /> 复制
                        </Button>
                      </div>
                      <Button
                        variant="secondary"
                        onClick={() =>
                          void bridge?.openExternal?.(event.verificationUri)
                        }
                      >
                        <Link2 size={12} /> 打开验证页
                      </Button>
                    </div>
                  )}

                  {prompt && (
                    <div className="login-prompt">
                      <b>{prompt.prompt.message || "需要补充信息"}</b>
                      {prompt.prompt.type === "select" ? (
                        <div className="login-prompt-options">
                          {prompt.prompt.options?.map((option) => (
                            <button type="button"
                              key={option.id}
                              className="login-prompt-option"
                              onClick={() => respond(option.id)}
                            >
                              <span className="login-prompt-option-main">
                                <ArrowRight size={12} />
                                <b>{option.label}</b>
                              </span>
                              {option.description && (
                                <small>{option.description}</small>
                              )}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="preset-manual">
                          <input
                            className="input"
                            type={
                              prompt.prompt.type === "secret"
                                ? "password"
                                : "text"
                            }
                            value={promptValue}
                            onChange={(item) =>
                              setPromptValue(item.target.value)
                            }
                            placeholder={prompt.prompt.placeholder || ""}
                          />
                          <Button
                            variant="secondary"
                            icon={<Check size={12} />}
                            onClick={() => respond(promptValue)}
                            disabled={!promptValue.trim()}
                          >
                            提交
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {error && <p className="preset-error">{error}</p>}

                  <div className="dialog-foot preset-foot">
                    <span className="muted">
                      {mode === "oauth"
                        ? "授权完成后会自动保存到 Pi auth.json"
                        : "Key 只写入本机 auth.json"}
                    </span>
                    <div>
                      <Button
                        variant="secondary"
                        icon={<X size={12} />}
                        onClick={back}
                      >
                        取消
                      </Button>
                      <Button
                        variant="primary"
                        onClick={start}
                        disabled={loading || (mode === "api_key" && !apiKey.trim())}
                      >
                        <LogIn size={12} />
                        {loading ? "处理中…" : "开始登录"}
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {success && (
                <div className="login-success">
                  <Check size={20} />
                  <b>登录成功</b>
                  <p>正在刷新 Pi 模型列表…</p>
                </div>
              )}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

const PROVIDER_API_OPTIONS = [
  { id: "openai-completions", label: "OpenAI Chat Completions" },
  { id: "openai-responses", label: "OpenAI Responses" },
  { id: "anthropic-messages", label: "Anthropic Messages" },
  { id: "google-generative-ai", label: "Google Generative AI" },
  { id: "bedrock-converse-stream", label: "Amazon Bedrock" },
] as const;

const LOCAL_PROVIDER_PRESETS = [
  {
    name: "Ollama",
    baseUrl: "http://127.0.0.1:11434/v1",
    api: "openai-completions",
    apiKey: "ollama",
  },
  {
    name: "LM Studio",
    baseUrl: "http://127.0.0.1:1234/v1",
    api: "openai-completions",
    apiKey: "lm-studio",
  },
  {
    name: "vLLM",
    baseUrl: "http://127.0.0.1:8000/v1",
    api: "openai-completions",
    apiKey: "vllm",
  },
] as const;

function CustomProviderDialog({
  open,
  onOpenChange,
  onNotify,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNotify: (title: string, desc?: string) => void;
  onSaved: () => void;
}) {
  const bridge = window.tesT;
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [api, setApi] = useState("openai-completions");
  const [apiKey, setApiKey] = useState("");
  const [models, setModels] = useState("");
  const [fetching, setFetching] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [error, setError] = useState("");
  const requestId = useRef("");
  const notifyRef = useRef(onNotify);
  notifyRef.current = onNotify;
  const savedRef = useRef(onSaved);
  savedRef.current = onSaved;

  useEffect(() => {
    if (!open || !bridge?.isShell) {
      return;
    }

    const listener = (record: any) => {
      if (
        record.type !== "models_fetched" ||
        record.requestId !== requestId.current
      ) {
        return;
      }

      setFetching(false);
      if (record.error) {
        setLatency(null);
        setError(String(record.error));
        return;
      }

      const ids = (Array.isArray(record.models) ? record.models : [])
        .map((item: any) => String(item?.id || "").trim())
        .filter(Boolean);
      setModels(ids.join("\n"));
      setLatency(typeof record.ms === "number" ? record.ms : null);
      notifyRef.current(
        `已拉取 ${ids.length} 个模型`,
        typeof record.ms === "number" ? `${record.ms} ms` : undefined,
      );
    };

    bridge.onRecord(listener);
    return () => bridge.offRecord?.(listener);
  }, [open, bridge]);

  const close = () => {
    onOpenChange(false);
    setError("");
    setFetching(false);
  };

  const fetchModels = (override?: {
    baseUrl: string;
    api: string;
    apiKey: string;
  }) => {
    const targetBaseUrl = override?.baseUrl || baseUrl;
    const targetApi = override?.api || api;
    const targetApiKey = override?.apiKey || apiKey;
    if (!bridge?.isShell || !targetBaseUrl.trim() || !targetApiKey.trim()) {
      setError("请先填写 Base URL 和 API Key");
      return;
    }

    const id = `custom-models-${Date.now()}`;
    requestId.current = id;
    setFetching(true);
    setLatency(null);
    setError("");
    void bridge.fetchModels({
      requestId: id,
      baseUrl: targetBaseUrl.trim(),
      api: targetApi,
      apiKey: targetApiKey.trim(),
    });
  };

  const save = () => {
    const modelList = models
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (!name.trim() || !baseUrl.trim() || !apiKey.trim()) {
      setError("渠道名称、Base URL 和 API Key 都必须填写");
      return;
    }
    if (modelList.length === 0) {
      setError("至少填写一个模型 ID");
      return;
    }

    const request = bridge?.saveProvider?.({
      key: `custom-${Date.now()}`,
      name: name.trim(),
      baseUrl: baseUrl.trim(),
      api,
      apiKey: apiKey.trim(),
      models: modelList.map((id) => ({ id, name: id })),
    });
    request?.then((result) => {
        if (result?.error) {
          setError(result.error);
          return;
        }
        notifyRef.current("渠道已添加", name.trim());
        savedRef.current();
        close();
      });
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="rx-overlay" />
        <DialogPrimitive.Content className="dialog custom-provider-dialog">
          <div className="dialog-head">
            <div>
              <DialogPrimitive.Title className="dialog-title">
                添加自定义 Provider
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="dialog-desc">
                写入 Pi 的 models.json · 支持 OpenAI / Anthropic / Gemini
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="icon" aria-label="关闭">
                <X size={15} />
              </Button>
            </DialogPrimitive.Close>
          </div>

          <div className="dialog-body custom-provider-body">
            <div className="provider-presets">
              <span>本地预设</span>
              {LOCAL_PROVIDER_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => {
                    setName(preset.name);
                    setBaseUrl(preset.baseUrl);
                    setApi(preset.api);
                    setApiKey(preset.apiKey);
                    setModels("");
                    setError("");
                    fetchModels({
                      baseUrl: preset.baseUrl,
                      api: preset.api,
                      apiKey: preset.apiKey,
                    });
                  }}
                >
                  {preset.name}
                </button>
              ))}
            </div>
            <label className="field-label">渠道名称</label>
            <input
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="例如 我的中转站"
            />

            <label className="field-label">Base URL</label>
            <input
              className="input"
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder="https://api.example.com/v1"
            />

            <label className="field-label">API 类型</label>
            <SelectPrimitive.Root value={api} onValueChange={setApi}>
              <SelectPrimitive.Trigger className="select-trigger">
                <span className="select-trigger-value">
                  <Package size={12} />
                  <SelectPrimitive.Value />
                </span>
                <SelectPrimitive.Icon>
                  <ChevronDown size={12} />
                </SelectPrimitive.Icon>
              </SelectPrimitive.Trigger>
              <SelectPrimitive.Portal>
                <SelectPrimitive.Content
                  className="select-content"
                  position="popper"
                  sideOffset={5}
                >
                  <SelectPrimitive.Viewport className="select-viewport">
                    {PROVIDER_API_OPTIONS.map((item) => (
                      <SelectPrimitive.Item
                        key={item.id}
                        value={item.id}
                        className="select-item"
                      >
                        <SelectPrimitive.ItemIndicator className="select-indicator">
                          <Check size={11} />
                        </SelectPrimitive.ItemIndicator>
                        <SelectPrimitive.ItemText>
                          {item.label}
                        </SelectPrimitive.ItemText>
                      </SelectPrimitive.Item>
                    ))}
                  </SelectPrimitive.Viewport>
                </SelectPrimitive.Content>
              </SelectPrimitive.Portal>
            </SelectPrimitive.Root>

            <label className="field-label">API Key</label>
            <input
              className="input"
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="sk-..."
            />

            <div className="custom-provider-models">
              <div>
                <b>模型 ID</b>
                <small>每行一个，或自动拉取</small>
              </div>
              <Button
                variant="secondary"
                onClick={() => fetchModels()}
                disabled={fetching}
              >
                <RotateCcw size={12} />
                {fetching ? "拉取中…" : "自动拉取"}
              </Button>
            </div>
  {latency !== null && (
    <p className="provider-check">
      检测通过 · {latency} ms · 已写入模型列表
    </p>
  )}
            <textarea
              className="input custom-provider-textarea"
              value={models}
              onChange={(event) => setModels(event.target.value)}
              rows={5}
              placeholder={"gpt-5.1-codex\nclaude-sonnet-4-5"}
            />

            {error && <p className="preset-error">{error}</p>}
          </div>

          <div className="dialog-foot">
            <span className="muted">
              Key 只写入本机 models.json
            </span>
            <div>
              <Button
                variant="secondary"
                icon={<X size={12} />}
                onClick={close}
              >
                取消
              </Button>
              <Button variant="primary" onClick={save}>
                <Plus size={12} /> 保存 Provider
              </Button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function ModelBrowserDialog({
  open,
  onOpenChange,
  onSelect,
  onNotify,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (model: CatalogModel) => void;
  onNotify: (title: string, desc?: string) => void;
}) {
  const bridge = window.tesT;
  const [models, setModels] = useState<CatalogModel[]>([]);
  const [providers, setProviders] = useState<CatalogProvider[]>([]);
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState("all");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const notifyRef = useRef(onNotify);
  notifyRef.current = onNotify;

  useEffect(() => {
    if (!open) {
      return;
    }
    setLoading(true);
    setError("");

    const request = bridge?.listModelCatalog?.();
    request
      ?.then((result) => {
        if (result?.error) {
          setError(result.error);
          return;
        }
        setModels(result?.models || []);
        setProviders(result?.providers || []);
      })
      .catch((reason) => setError(String(reason)))
      .finally(() => setLoading(false));
  }, [open, bridge]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return models.filter((model) => {
      if (provider !== "all" && model.provider !== provider) {
        return false;
      }
      if (onlyAvailable && !model.available) {
        return false;
      }
      if (!needle) {
        return true;
      }
      return [model.id, model.name, model.provider, model.providerName]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [models, provider, onlyAvailable, query]);

  const groups = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        available: boolean;
        models: CatalogModel[];
      }
    >();

    for (const item of filtered) {
      let group = map.get(item.provider);
      if (!group) {
        group = {
          id: item.provider,
          name: item.providerName,
          available: item.available,
          models: [],
        };
        map.set(item.provider, group);
      }
      group.available = group.available || item.available;
      group.models.push(item);
    }

    return [...map.values()].sort(
      (a, b) =>
        Number(b.available) - Number(a.available) ||
        a.name.localeCompare(b.name),
    );
  }, [filtered]);

  const availableTotal = useMemo(
    () => models.filter((item) => item.available).length,
    [models],
  );

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="rx-overlay" />
        <DialogPrimitive.Content className="dialog model-browser-dialog">
          <div className="dialog-head">
            <div>
              <DialogPrimitive.Title className="dialog-title">
                全部模型
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="dialog-desc">
                Pi 内置目录 · {availableTotal} 个可用 / 共 {models.length} 个 ·{" "}
                {providers.length} 个 Provider
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="icon" aria-label="关闭">
                <X size={15} />
              </Button>
            </DialogPrimitive.Close>
          </div>

          <div className="preset-toolbar">
            <div className="search preset-search">
              <Search size={14} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索模型、Provider…"
              />
            </div>
            <span className="preset-count">
              {loading ? "加载中…" : `${filtered.length} / ${models.length} 个`}
            </span>
          </div>

          <div className="model-browser-filters">
            <SelectPrimitive.Root value={provider} onValueChange={setProvider}>
              <SelectPrimitive.Trigger className="select-trigger">
                <span className="select-trigger-value">
                  <Globe size={12} />
                  <SelectPrimitive.Value />
                </span>
                <SelectPrimitive.Icon>
                  <ChevronDown size={12} />
                </SelectPrimitive.Icon>
              </SelectPrimitive.Trigger>
              <SelectPrimitive.Portal>
                <SelectPrimitive.Content
                  className="select-content"
                  position="popper"
                  sideOffset={5}
                >
                  <SelectPrimitive.Viewport className="select-viewport">
                    <SelectPrimitive.Item
                      value="all"
                      className="select-item"
                    >
                      <SelectPrimitive.ItemText>
                        全部 Provider
                      </SelectPrimitive.ItemText>
                    </SelectPrimitive.Item>
                    {providers.map((item) => (
                      <SelectPrimitive.Item
                        key={item.id}
                        value={item.id}
                        className="select-item"
                      >
                        <SelectPrimitive.ItemText>
                          {item.name} · {item.modelCount}
                        </SelectPrimitive.ItemText>
                      </SelectPrimitive.Item>
                    ))}
                  </SelectPrimitive.Viewport>
                </SelectPrimitive.Content>
              </SelectPrimitive.Portal>
            </SelectPrimitive.Root>
            <label className="model-browser-toggle">
              <Checkbox
                checked={onlyAvailable}
                onChange={() => setOnlyAvailable((value) => !value)}
              />
              仅显示可用模型
            </label>
          </div>

          {error && <p className="preset-error">{error}</p>}

          <div className="model-browser-list">
            {groups.map((group) => (
              <div className="model-browser-group" key={group.id}>
                <div className="model-browser-group-head">
                  <span className="model-browser-group-name">
                    {group.name}
                  </span>
                  <span className="model-browser-group-meta">
                    {group.id} · {group.models.length} 个
                  </span>
                  <Tag tone={group.available ? "mint" : "amber"}>
                    {group.available ? "已配置" : "需登录"}
                  </Tag>
                </div>
                {group.models.map((item) => (
                  <button type="button"
                    key={`${item.provider}:${item.id}`}
                    className={`model-browser-row ${
                      item.available ? "" : "locked"
                    }`}
                    onClick={() => {
                      if (!item.available) {
                        notifyRef.current(
                          "需要先登录",
                          `${item.providerName} 还没有配置`,
                        );
                        return;
                      }
                      onSelect(item);
                      onOpenChange(false);
                    }}
                  >
                    <span className="model-browser-main">
                      <b>{item.name}</b>
                      <small>
                        {item.provider} · {item.id}
                      </small>
                    </span>
                    <span className="model-browser-side">
                      {item.contextWindow ? (
                        <span>
                          {item.contextWindow >= 1_000_000
                            ? `${Math.round(item.contextWindow / 1_000_000)}M`
                            : `${Math.round(item.contextWindow / 1_000)}k`}
                        </span>
                      ) : null}
                      <Tag tone={item.available ? "mint" : "amber"}>
                        {item.available ? "可用" : "需登录"}
                      </Tag>
                      <ChevronRight size={12} />
                    </span>
                  </button>
                ))}
              </div>
            ))}
            {!loading && filtered.length === 0 && (
              <div className="preset-empty">没有匹配的模型</div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function RemoteDialog({
  open,
  onOpenChange,
  status,
  onStart,
  onStop,
  onRefresh,
  onStartTunnel,
  onStopTunnel,
  onNotify,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: TesTRemoteStatus | null;
  onStart: () => void;
  onStop: () => void;
  onRefresh: () => void;
  onStartTunnel: () => void;
  onStopTunnel: () => void;
  onNotify: (title: string, desc?: string) => void;
}) {
  const running = Boolean(status?.running);
  const url = status?.url || "";
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="rx-overlay" />
        <DialogPrimitive.Content className="dialog remote-dialog">
          <div className="dialog-head">
            <div>
              <DialogPrimitive.Title className="dialog-title">
                手机远程
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="dialog-desc">
                同一 Wi-Fi 下扫码，用手机继续让 Pi 干活
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="icon" aria-label="关闭">
                <X size={15} />
              </Button>
            </DialogPrimitive.Close>
          </div>

          {!running ? (
            <div className="remote-start">
              <span className="remote-start-icon">
                <Smartphone size={28} />
              </span>
              <b>让手机接管当前 Pi 会话</b>
              <p>
                开启后会生成一个局域网地址和二维码。手机与电脑连同一个
                Wi-Fi，扫码即可继续对话、看流式输出、切换 PC 上的历史会话、
                发语音指令和切换模型。手机浏览器里也可以“添加到主屏幕”，
                当成独立 App 使用。
              </p>
              <Button variant="primary" onClick={onStart}>
                <Wifi size={13} /> 启动手机远程
              </Button>
              {status?.error && (
                <p className="preset-error">{status.error}</p>
              )}
            </div>
          ) : (
            <div className="remote-body">
              <div className="remote-qr">
                {status?.qrSvg ? (
                  <div
                    className="remote-qr-svg"
                    dangerouslySetInnerHTML={{ __html: status.qrSvg }}
                  />
                ) : (
                  <div className="remote-qr-empty">二维码生成中…</div>
                )}
              </div>

              <div className="remote-info">
                <div className="remote-status-row">
                  <span className="remote-live">
                    <i /> 运行中
                  </span>
                  <span>{status?.clients || 0} 台设备</span>
                  <span>端口 {status?.port || "—"}</span>
                </div>
                <div className="remote-url">
                  <code>{url}</code>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      const ok = await copyText(url);
                      onNotify(
                        ok ? "已复制远程地址" : "复制失败",
                        ok ? url : "请手动选择地址复制",
                      );
                    }}
                  >
                    <Copy size={12} /> 复制
                  </Button>
                </div>
                <div
                  className={`remote-public ${
                    status?.publicUrl ? "on" : ""
                  }`}
                >
                  <div className="remote-public-head">
                    <b>
                      {status?.publicUrl
                        ? "公网访问已开启"
                        : "外网访问"}
                    </b>
                    {status?.publicUrl && (
                      <Tag tone="mint">Serveo</Tag>
                    )}
                  </div>
                  <p>
                    {status?.publicUrl
                      ? "现在可以在任何网络下扫码或打开上面的地址。请勿把链接分享给他人。"
                      : "开启 Serveo 临时公网隧道后，手机在别的地方也能连。"}
                  </p>
                  {status?.publicUrl ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<WifiOff size={12} />}
                      onClick={onStopTunnel}
                    >
                      关闭公网
                    </Button>
                  ) : status?.tunnelState === "downloading" ||
                    status?.tunnelState === "starting" ? (
                    <span className="remote-tunnel-progress">
                      {status?.tunnelMessage || "正在建立公网隧道…"}
                    </span>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={onStartTunnel}
                    >
                      <Wifi size={12} /> 开启外网访问
                    </Button>
                  )}
                  {status?.tunnelError && (
                    <p className="preset-error">{status.tunnelError}</p>
                  )}
                </div>
                <div className="remote-addresses">
                  {(status?.urls || []).map((entry) => (
                    <div key={entry.url}>
                      <span>
                        {entry.kind === "tailscale"
                          ? "Tailscale"
                          : entry.name}
                      </span>
                      <code>{entry.address}</code>
                    </div>
                  ))}
                </div>
                {status?.localOnly && (
                  <p className="remote-warning">
                    没有检测到局域网 IPv4 地址，手机可能无法连接。
                  </p>
                )}
                {status?.error && (
                  <p className="preset-error">{status.error}</p>
                )}
                <div className="remote-actions">
                  <Button variant="secondary" onClick={onRefresh}>
                    <RotateCcw size={12} /> 刷新令牌
                  </Button>
                  <Button
                    variant="ghost"
                    icon={<Power size={12} />}
                    onClick={onStop}
                  >
                    停止远程
                  </Button>
                </div>
                <p className="remote-note">
                  默认仅限同一局域网；开启外网后可在任何网络使用。首次启动如
                  Windows 防火墙弹窗，请允许“专用网络”。外网隧道由
                  Serveo 提供，地址是临时的，断开后失效。首次打开公网地址可能看到
                  Serveo 提示页，继续访问即可。刷新令牌或停止远程后，旧二维码立即失效。
                  手机端会记住令牌，之后可从主屏幕直接打开；令牌失效时重新扫码即可。
                  长期稳定使用可安装 Tailscale，手机和电脑登录同一
                  tailnet 后，Tailscale 地址会自动出现在上方。
                </p>
              </div>
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export default function App() {
  const bridge = window.tesT;
  const isShell = Boolean(bridge?.isShell);
  const params = new URLSearchParams(window.location.search);
  const [dark, setDark] = useState(params.has("dark"));
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
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [contextTokens, setContextTokens] = useState(0);

  const [liveTools, setLiveTools] = useState<LiveTool[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    params.has("collapsed") ? { "/Pi": false } : {},
  );
  const [draft, setDraft] = useState(
    params.has("slash") ? "/" : params.has("mention") ? "@" : "",
  );
  const [contextFiles, setContextFiles] = useState<ContextAttachment[]>([]);
  const [contextDrag, setContextDrag] = useState(false);
  const [draggedContextId, setDraggedContextId] = useState<string | null>(null);
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
  const [sessionName, setSessionName] = useState("新会话");
  const [modelOpen, setModelOpen] = useState(params.has("menu"));
  const [reasoningOpen, setReasoningOpen] = useState(false);
  const [reasoning, setReasoning] = useState("medium");
  const [cmdOpen, setCmdOpen] = useState(params.has("cmd"));
  const [cmdQuery, setCmdQuery] = useState("");
  const [cmdIndex, setCmdIndex] = useState(0);
  const [slashIndex, setSlashIndex] = useState(0);
  const [slashDismissed, setSlashDismissed] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionDismissed, setMentionDismissed] = useState(false);
  const [workspaceFiles, setWorkspaceFiles] = useState<
    { path: string; name: string; size: number }[]
  >([]);
  const [workspaceFilesLoading, setWorkspaceFilesLoading] =
    useState(false);
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
  const [findOpen, setFindOpen] = useState(params.has("find"));
  const [findQuery, setFindQuery] = useState(
    params.get("find") && params.get("find") !== "1"
      ? params.get("find") || ""
      : "",
  );
  const [findIndex, setFindIndex] = useState(0);
  const [sessionQuery, setSessionQuery] = useState("");
  const [sessionResults, setSessionResults] = useState<
    TesTSessionSearchResult[]
  >([]);
  const [sessionSearching, setSessionSearching] = useState(false);
  const [demoCheck, setDemoCheck] = useState(true);
  const [demoSwitch, setDemoSwitch] = useState(true);
  const [demoRadio, setDemoRadio] = useState("balanced");
  const [maxed, setMaxed] = useState(false);
  const [showContext, setShowContext] = useState(true);
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
  const [density, setDensity] = useState<Density>("comfortable");
  const [accentKey, setAccentKey] = useState<AccentKey>("mint");
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
  const [branch, setBranch] = useState("main");
  const [gitInfo, setGitInfo] = useState<{
    repo: boolean;
    branch: string | null;
    branches: string[];
  }>({ repo: false, branch: null, branches: [] });
  const [changes, setChanges] = useState<GitChange[]>([]);
  const [diffOpen, setDiffOpen] = useState(false);
  const [diffFile, setDiffFile] = useState<GitChange | null>(null);
  const [diffPatch, setDiffPatch] = useState("");
  const [diffSource, setDiffSource] = useState<
    "worktree" | "index" | "file"
  >("worktree");
  const [diffLoading, setDiffLoading] = useState(false);
  const [staging, setStaging] = useState(false);
  const [stagingHunk, setStagingHunk] = useState(false);
  const [revertingHunk, setRevertingHunk] = useState(false);
  const [revertingFile, setRevertingFile] = useState(false);
  const [commitOpen, setCommitOpen] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [workspace, setWorkspace] = useState("");
  const [recentWorkspaces, setRecentWorkspaces] = useState<string[]>([]);
  const [worktrees, setWorktrees] = useState<
    Array<{
      path: string;
      branch: string;
      changes?: number;
      ahead?: number;
      behind?: number;
    }>
  >([]);
  const [worktreeBusy, setWorktreeBusy] = useState(false);
  const [pendingWorktreePath, setPendingWorktreePath] = useState("");
  const [pendingWorktreeMerge, setPendingWorktreeMerge] = useState("");
  const [worktreeMergeConflict, setWorktreeMergeConflict] = useState(false);
  const [worktreeMergeConflicts, setWorktreeMergeConflicts] = useState<
    string[]
  >([]);
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
  const queuedTextsRef = useRef<string[]>([]);
  const extensionQueueRef = useRef<ExtensionPrompt[]>([]);
  const tabsRef = useRef<SessionTab[]>([]);
  const activePathRef = useRef("");
  const closeTabRef = useRef<(path: string) => void>(() => {});
  const cycleTabRef = useRef<(delta: number) => void>(() => {});
  const sessionRefreshTimer = useRef<number | null>(null);
  const sessionLoadSeq = useRef(0);
  const messageRequestSeq = useRef(0);
  const historyCacheRef = useRef(new Map<string, ChatMessage[]>());
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
  const stickToBottomRef = useRef(true);
  const dragFrameRef = useRef<number | null>(null);
  const dragPointRef = useRef<{ x: number; y: number } | null>(null);

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

  const scrollMessagesToBottom = (behavior: ScrollBehavior = "auto") => {
    window.requestAnimationFrame(() => {
      const element = messagesRef.current;
      if (!element) {
        return;
      }
      element.scrollTo({ top: element.scrollHeight, behavior });
    });
  };

  const handleMessagesScroll = () => {
    const element = messagesRef.current;
    if (!element) {
      return;
    }
    const distanceFromBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 72;
  };

  useEffect(() => {
    const viewport = messagesRef.current;
    if (!viewport) {
      return;
    }
    const content = viewport.querySelector(".thread");
    if (!content) {
      return;
    }
    const observer = new ResizeObserver(() => {
      if (stickToBottomRef.current) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (messagesLoading || historyLoading || !stickToBottomRef.current) {
      return;
    }
    scrollMessagesToBottom();
  }, [liveMessages, messagesLoading, historyLoading]);

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

  const narrow = useMediaQuery("(max-width: 1050px)");
  const tiny = useMediaQuery("(max-width: 760px)");

  const accent = accents[accentKey];

  const notify = (title: string, desc?: string) => {
    setToast({ id: Date.now(), title, desc });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  };

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
    setContextDrag(false);
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

  const sendPrompt = (text: string, attachments: ContextAttachment[]) => {
    if (!text && attachments.length === 0) return;
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
    const fullMessage = attachmentText
      ? `${outbound}\n\n${attachmentText}`
      : outbound;
    const attachmentSummary =
      attachments.length > 0
        ? `\n\n📎 ${attachments.map((file) => file.name).join(" · ")}`
        : "";
    const displayText = `${message}${attachmentSummary}`;

    if (isShell) {
      const busy = pending || streamActiveRef.current;
      setPending(true);
      if (busy) {
        queuedTextsRef.current.push(displayText);
      } else {
        setLiveMessages((prev) => [
          ...prev,
          {
            id: `user-${Date.now()}`,
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
        setQueuedMessages((count) => count + 1);
      }
      notify(
        busy ? "已排队给 Pi" : "已发送给 Pi",
        attachments.length > 0
          ? `RPC · ${attachments.length} 个上下文附件`
          : busy
            ? "当前任务结束后自动发送"
            : "RPC · 等待模型响应",
      );
      return;
    }

    setSent((prev) => [...prev, displayText]);
    setPending(true);
    notify("已发送给 Pi", "RPC 队列 · 等待模型响应");
    if (replyTimer.current) window.clearTimeout(replyTimer.current);
    replyTimer.current = window.setTimeout(() => setPending(false), 1400);
  };

  const send = () => {
    const text = draft.trim();
    if (!text && contextFiles.length === 0) return;
    const attachments = contextFiles;
    setDraft("");
    setContextFiles([]);
    composerRef.current?.focus();
    sendPrompt(text, attachments);
  };

  const stopPi = () => {
    if (!isShell) {
      return;
    }
    bridge?.send({ id: `abort-${Date.now()}`, type: "abort" });
    queuedTextsRef.current = [];
    setQueuedMessages(0);
    notify("已请求中断", "Pi 会停下手上的步骤");
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

  const editMessage = (text: string) => {
    forkSession(text, "truncate");
  };

  const forkTargetTextRef = useRef("");
  const forkModeRef = useRef<"fork" | "truncate">("fork");

  const forkSession = (
    text = "",
    mode: "fork" | "truncate" = "fork",
  ) => {
    if (!isShell) {
      notify("分叉会话", "桌面端中可用");
      return;
    }
    forkModeRef.current = mode;
    forkTargetTextRef.current = text;
    bridge?.send({
      id: `fork-list-${Date.now()}`,
      type: "get_fork_messages",
    });
    notify(
      mode === "truncate" ? "正在回到该消息" : "正在准备分叉",
      text
        ? "定位到这条消息"
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
      })
      .catch(() => {
        // Workspace discovery is optional; the UI can still use sessions.
      });

    return () => {
      cancelled = true;
    };
  }, [isShell, bridge]);

  useEffect(() => {
    if (!workspaceOpen || !isShell || !bridge?.gitWorktreeList) {
      return;
    }
    let cancelled = false;
    void bridge
      .gitWorktreeList({ cwd: workspace })
      .then((result) => {
        if (!cancelled && Array.isArray(result?.worktrees)) {
          setWorktrees(
            result.worktrees
              .filter((item) => item.path !== workspaceCwd)
              .map((item) => ({
                path: item.path,
                branch: item.branch,
                changes: item.changes,
                ahead: item.ahead,
                behind: item.behind,
              })),
          );
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [workspaceOpen, workspace, isShell, bridge]);

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
          setDraft(String(record.text || ""));
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
          let target = messages[messages.length - 1];
          if (targetText) {
            target =
              [...messages]
                .reverse()
                .find(
                  (item: { text?: string }) =>
                    String(item.text || "").trim() ===
                    targetText.trim(),
                ) || target;
          }
          if (!target?.entryId) {
            notify(
              forkModeRef.current === "truncate" ? "无法编辑" : "无法分叉",
              "找不到可用的用户消息",
            );
            return;
          }
          bridge.send({
            id: `tree-${Date.now()}`,
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
          if (!record.success || record.data?.cancelled) {
            if (!record.success) {
              notify(
                record.command === "navigate_tree"
                  ? "编辑失败"
                  : "分叉失败",
                record.error || "Pi 未返回原因",
              );
            }
            return;
          }
          const text = String(record.data?.text || "").trim();
          if (text) {
            setDraft(text);
          }
          forkTargetTextRef.current = "";
          forkModeRef.current = "fork";
          sessionLoadSeq.current += 1;
          setLiveMessages([]);
          setLiveTools([]);
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
              : "已分叉会话",
            record.command === "navigate_tree"
              ? "后续消息已从当前分支移除，可修改后重新发送"
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
          const rawMessages = Array.isArray(record.data?.messages)
            ? record.data.messages
            : [];
          const visibleMessages =
            rawMessages.length > 800
              ? rawMessages.slice(-800)
              : rawMessages;

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
                    result,
                    state: message.isError ? "error" : "done",
                    startedAt: Date.now(),
                  });
                }
                return;
              }

              if (message.role === "assistant") {
                const content = Array.isArray(message.content)
                  ? message.content
                  : [];
                for (const block of content) {
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
                      args: block.arguments,
                      state: "done",
                      startedAt: Date.now(),
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
          queuedTextsRef.current = [];
          setQueuedMessages(0);
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
        if (update?.type === "text_delta" && streamingRef.current) {
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
          setLiveMessages((previous) => [
            ...previous,
            {
              id: `user-queued-${Date.now()}`,
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
        queuedTextsRef.current = [];
        setQueuedMessages(0);
        requestStats();
        refreshSessions();
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

  const sessionTree = useMemo(
    () =>
      isShell && bridge?.listSessions
        ? buildSessionTree(sessionInfos)
        : tree,
    [isShell, bridge?.listSessions, sessionInfos],
  );
  const flatSessions = useMemo(
    () => flattenSessions(sessionTree),
    [sessionTree],
  );
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
    (isShell ? "选择工作目录" : "F:\\Pi+CC");
  const draftKey = activeSessionPath
    ? `session:${activeSessionPath}`
    : `workspace:${workspace || "none"}`;

  useEffect(() => {
    if (
      params.has("slash") ||
      params.has("mention") ||
      params.has("find")
    ) {
      return;
    }
    const saved = localStorage.getItem(`tesT.draft.${draftKey}`);
    setDraft(saved || "");
    setMentionDismissed(true);
  }, [draftKey]);

  useEffect(() => {
    if (params.has("slash") || params.has("mention")) {
      return;
    }
    const timer = window.setTimeout(() => {
      const key = `tesT.draft.${draftKey}`;
      if (draft) {
        localStorage.setItem(key, draft);
      } else {
        localStorage.removeItem(key);
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [draft, draftKey]);

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

  useEffect(() => {
    if (!isShell || !bridge?.gitInfo) {
      return;
    }
    const cwd = activeSession?.cwd || workspace;
    if (!cwd) {
      return;
    }
    let cancelled = false;
    void bridge
      .gitInfo({ cwd })
      .then((info) => {
        if (cancelled || !info) {
          return;
        }
        setGitInfo(info);
        if (info.branch) {
          setBranch(info.branch);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isShell, bridge, activeSession?.cwd, workspace]);

  const currentCwd = activeSession?.cwd || workspace;

  const refreshChanges = () => {
    if (!isShell || !bridge?.gitStatus || !currentCwd) {
      setChanges([]);
      return;
    }
    void bridge
      .gitStatus({ cwd: currentCwd })
      .then((result) => {
        setChanges(Array.isArray(result?.files) ? result.files : []);
      })
      .catch(() => setChanges([]));
  };

  useEffect(() => {
    if (!isShell || !bridge?.gitStatus || !currentCwd) {
      setChanges([]);
      return;
    }
    let cancelled = false;
    void bridge
      .gitStatus({ cwd: currentCwd })
      .then((result) => {
        if (!cancelled) {
          setChanges(Array.isArray(result?.files) ? result.files : []);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [
    isShell,
    bridge,
    currentCwd,
    sessionStats?.totalMessages,
    sessionStats?.toolCalls,
  ]);

  const fetchDiff = (change: GitChange) => {
    setDiffLoading(true);
    setDiffPatch("");
    setDiffSource("worktree");
    if (!isShell || !bridge?.gitDiff || !currentCwd) {
      setDiffLoading(false);
      return;
    }
    void bridge
      .gitDiff({ cwd: currentCwd, path: change.path })
      .then((result) => {
        setDiffPatch(result?.patch || "");
        setDiffSource(result?.source || "worktree");
        if (result?.error) {
          notify("读取 diff 失败", result.error);
        }
      })
      .catch((error) => {
        setDiffPatch("");
        notify("读取 diff 失败", String(error));
      })
      .finally(() => setDiffLoading(false));
  };

  const openDiff = (change: GitChange) => {
    setDiffFile(change);
    setDiffOpen(true);
    fetchDiff(change);
  };

  const stageHunk = (patch: string) => {
    if (!isShell || !bridge?.gitStageHunk || !currentCwd) {
      return;
    }
    setStagingHunk(true);
    void bridge
      .gitStageHunk({ cwd: currentCwd, patch })
      .then((result) => {
        if (result?.error) {
          notify("暂存 hunk 失败", result.error);
          return;
        }
        notify("已暂存 hunk");
        if (diffFile) {
          fetchDiff(diffFile);
        }
        refreshChanges();
      })
      .catch((error) => notify("暂存 hunk 失败", String(error)))
      .finally(() => setStagingHunk(false));
  };

  const revertHunk = (patch: string) => {
    if (!isShell || !bridge?.gitRevertHunk || !currentCwd) {
      return;
    }
    setRevertingHunk(true);
    void bridge
      .gitRevertHunk({ cwd: currentCwd, patch })
      .then((result) => {
        if (result?.error) {
          notify("还原 hunk 失败", result.error);
          return;
        }
        notify("已还原 hunk");
        if (diffFile) {
          fetchDiff(diffFile);
        }
        refreshChanges();
      })
      .catch((error) => notify("还原 hunk 失败", String(error)))
      .finally(() => setRevertingHunk(false));
  };

  const revertFile = (change: GitChange) => {
    if (!isShell || !bridge?.gitRevertFile || !currentCwd) {
      return;
    }
    setRevertingFile(true);
    void bridge
      .gitRevertFile({ cwd: currentCwd, path: change.path })
      .then((result) => {
        if (result?.error) {
          notify("还原文件失败", result.error);
          return;
        }
        notify("文件已还原", change.path);
        setDiffOpen(false);
        setDiffFile(null);
        refreshChanges();
      })
      .catch((error) => notify("还原文件失败", String(error)))
      .finally(() => setRevertingFile(false));
  };

  const stageFile = (change: GitChange) => {
    if (!isShell || !bridge?.gitStage || !currentCwd) {
      return;
    }
    setStaging(true);
    void bridge
      .gitStage({ cwd: currentCwd, path: change.path })
      .then((result) => {
        if (result?.error) {
          notify("暂存失败", result.error);
          return;
        }
        notify("已暂存", change.path);
        setDiffOpen(false);
        setDiffFile(null);
        refreshChanges();
      })
      .catch((error) => notify("暂存失败", String(error)))
      .finally(() => setStaging(false));
  };

  const unstageFile = (change: GitChange) => {
    if (!isShell || !bridge?.gitUnstage || !currentCwd) {
      return;
    }
    setStaging(true);
    void bridge
      .gitUnstage({ cwd: currentCwd, path: change.path })
      .then((result) => {
        if (result?.error) {
          notify("取消暂存失败", result.error);
          return;
        }
        notify("已取消暂存", change.path);
        setDiffOpen(false);
        setDiffFile(null);
        refreshChanges();
      })
      .catch((error) => notify("取消暂存失败", String(error)))
      .finally(() => setStaging(false));
  };

  const commitChanges = (message: string) => {
    if (!isShell || !bridge?.gitCommit || !currentCwd) {
      notify("无法提交", "当前环境不支持 Git 提交");
      return;
    }
    setCommitting(true);
    void bridge
      .gitCommit({ cwd: currentCwd, message })
      .then((result) => {
        if (result?.error) {
          notify("提交失败", result.error);
          return;
        }
        notify("已提交", message);
        setCommitOpen(false);
        refreshChanges();
      })
      .catch((error) => notify("提交失败", String(error)))
      .finally(() => setCommitting(false));
  };

  const toggleFolder = (path: string) => {
    setExpanded((prev) => ({ ...prev, [path]: !(prev[path] ?? true) }));
  };

  const toggleContext = () => {
    if (narrow) setSheetMode("context");
    else setShowContext((value) => !value);
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
    notify("模型已切换", `${item.name} · ${item.provider}`);
  };

  const applyReasoning = (level: string) => {
    setReasoning(level);
    if (isShell) {
      bridge?.send({ type: "set_thinking_level", level });
    }
  };

  const changeBranch = (value: string) => {
    if (!isShell || !bridge?.gitCheckout) {
      setBranch(value);
      return;
    }
    const cwd = activeSession?.cwd || workspace;
    void bridge
      .gitCheckout({ cwd, branch: value })
      .then((result) => {
        if (result?.error) {
          notify("切换分支失败", result.error);
          return;
        }
        const next = result?.info?.branch || result?.branch || value;
        setBranch(next);
        if (result?.info) {
          setGitInfo(result.info);
        }
        notify("分支已切换", next);
      })
      .catch((error) => notify("切换分支失败", String(error)));
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
          })),
          extensions: (result.extensions ?? []).map((item) => ({
            name: item.name,
            desc: item.desc,
            enabled: item.enabled,
            kind: "扩展" as const,
            scope: item.scope,
            readonly: item.readonly,
            path: item.path,
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
      setMessagesLoading(isShell && !cached);
      setHistoryLoading(isShell && !cached);
      stickToBottomRef.current = true;
      resetStream();
      setPending(false);
      setSessionStats(null);
      setContextTokens(0);
      if (session.cwd && !sameWorkspacePath(session.cwd, workspace)) {
        setWorkspace(session.cwd);
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
                stickToBottomRef.current = true;
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
        setSessionStats(null);
        setContextTokens(0);
      }
      refreshSessions();
      notify("会话已归档", session.title);
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
    setMessagesLoading(false);
    setHistoryLoading(false);
    resetStream();
    setPending(false);
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

  const createIsolatedWorktree = () => {
    if (!isShell || !bridge?.gitWorktreeCreate) {
      notify("隔离工作区", "桌面端中可用");
      return;
    }
    setWorktreeBusy(true);
    const name = `agent-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19)}`;
    void bridge
      .gitWorktreeCreate({ cwd: workspaceCwd, name })
      .then((result) => {
        if (result?.error || !result?.path) {
          notify("创建隔离工作区失败", result?.error);
          return;
        }
        notify("隔离工作区已创建", result.branch || result.path);
        selectWorkspace(result.path);
      })
      .catch((error) => notify("创建隔离工作区失败", String(error)))
      .finally(() => setWorktreeBusy(false));
  };

  const removeIsolatedWorktree = (item: {
    path: string;
    branch: string;
  }) => {
    if (!bridge?.gitWorktreeRemove) {
      return;
    }
    if (pendingWorktreePath !== item.path) {
      setPendingWorktreePath(item.path);
      return;
    }
    setPendingWorktreePath("");
    void bridge
      .gitWorktreeRemove({
        cwd: workspace,
        path: item.path,
        deleteBranch: true,
      })
      .then((result) => {
        if (result?.error) {
          notify("删除 Worktree 失败", result.error);
          return;
        }
        notify(
          "Worktree 已删除",
          result.branchError
            ? `分支保留：${result.branchError}`
            : item.branch || item.path,
        );
        setWorktrees((items) =>
          items.filter((entry) => entry.path !== item.path),
        );
      })
      .catch((error) => notify("删除 Worktree 失败", String(error)));
  };

  const mergeIsolatedWorktree = (item: {
    path: string;
    branch: string;
  }) => {
    if (!bridge?.gitWorktreeMerge || !item.branch) {
      return;
    }
    if (pendingWorktreeMerge !== item.path) {
      setPendingWorktreeMerge(item.path);
      return;
    }
    setPendingWorktreeMerge("");
    void bridge
      .gitWorktreeMerge({ cwd: workspace, branch: item.branch })
      .then((result) => {
        if (result?.error) {
          notify("合并 Worktree 失败", result.error);
          setWorktreeMergeConflict(true);
          setWorktreeMergeConflicts(result.conflicts || []);
          return;
        }
        setWorktreeMergeConflict(false);
        setWorktreeMergeConflicts([]);
        notify("Worktree 已合并", item.branch);
      })
      .catch((error) => notify("合并 Worktree 失败", String(error)));
  };

  const abortWorktreeMerge = () => {
    void bridge?.gitWorktreeMergeAbort?.({ cwd: workspace }).then((result) => {
      if (result?.error) {
        notify("中止合并失败", result.error);
        return;
      }
      setWorktreeMergeConflict(false);
      setWorktreeMergeConflicts([]);
      notify("已中止 Worktree 合并", "主工作区已恢复");
    });
  };

  const continueWorktreeMerge = () => {
    void bridge?.gitWorktreeMergeContinue?.({ cwd: workspace }).then((result) => {
      if (result?.error) {
        notify("继续合并失败", result.error);
        return;
      }
      setWorktreeMergeConflict(false);
      setWorktreeMergeConflicts([]);
      notify("Worktree 合并已完成");
    });
  };

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
    if (isShell) {
      bridge?.send({
        id: `new-session-${Date.now()}`,
        type: "new_session",
      });
      setLiveMessages([]);
      setLiveTools([]);
      setMessagesLoading(false);
      setHistoryLoading(false);
      sessionLoadSeq.current += 1;
      latestSwitchRequestId.current = "";
      latestMessagesRequestId.current = "";
      pendingSwitchRef.current = null;
      resetStream();
      setPending(false);
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

  const findMatches = useMemo(() => {
    const needle = findQuery.trim().toLowerCase();
    if (!needle) {
      return [];
    }
    return liveMessages
      .filter((message) =>
        message.text.toLowerCase().includes(needle),
      )
      .map((message) => message.id);
  }, [liveMessages, findQuery]);

  useEffect(() => {
    if (!findOpen || findMatches.length === 0) {
      return;
    }
    const id = findMatches[Math.min(findIndex, findMatches.length - 1)];
    const target = Array.from(
      document.querySelectorAll<HTMLElement>("[data-msg-id]"),
    ).find((element) => element.dataset.msgId === id);
    target?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [findOpen, findIndex, findMatches]);

  const commands = [
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
          aria-hidden="true"
        />
      ),
      run: () => setDark((value) => !value),
    },
  ];

  const filteredCommands = commands.filter((command) =>
    command.label.toLowerCase().includes(cmdQuery.trim().toLowerCase()),
  );

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
        setDraft(`/${command.name} `);
        setSlashDismissed(true);
        window.setTimeout(() => composerRef.current?.focus(), 0);
      },
    }));

  const allSlashCommands = [...slashCommands, ...piSlashCommands];

  const slashMatch = /^\/([^\s]*)$/.exec(draft);
  const slashOpen =
    Boolean(slashMatch) && !gallery && !slashDismissed;
  const slashQuery = (slashMatch?.[1] ?? "").toLowerCase();
  const filteredSlash = allSlashCommands.filter(
    (command) =>
      command.name.startsWith(slashQuery) ||
      command.label.toLowerCase().includes(slashQuery),
  );

  const mentionMatch = /(?:^|\s)@([^\s@]*)$/.exec(draft);
  const mentionOpen =
    Boolean(mentionMatch) && !gallery && !mentionDismissed;
  const mentionQuery = (mentionMatch?.[1] ?? "").toLowerCase();
  const filteredMentions = mentionQuery
    ? workspaceFiles
        .filter((file) =>
          file.path.toLowerCase().includes(mentionQuery),
        )
        .slice(0, 40)
    : workspaceFiles.slice(0, 40);

  const insertMention = (path: string) => {
    const index = draft.lastIndexOf("@");
    const before = index >= 0 ? draft.slice(0, index) : draft;
    setDraft(`${before}@${path} `);
    setMentionDismissed(true);
    composerRef.current?.focus();
  };

  useEffect(() => {
    setCmdIndex(0);
  }, [cmdQuery, cmdOpen]);

  useEffect(() => {
    setSlashIndex(0);
  }, [slashQuery]);

  useEffect(() => {
    setMentionIndex(0);
  }, [mentionQuery]);

  useEffect(() => {
    setWorkspaceFiles([]);
  }, [activeSession?.cwd, workspace]);

  useEffect(() => {
    if (
      !mentionOpen ||
      !isShell ||
      !bridge?.listFiles ||
      workspaceFiles.length > 0
    ) {
      return;
    }
    let cancelled = false;
    setWorkspaceFilesLoading(true);
    void bridge
      .listFiles({ cwd: activeSession?.cwd || workspace })
      .then((result) => {
        if (!cancelled && Array.isArray(result?.files)) {
          setWorkspaceFiles(
            [...result.files].sort(
              (a, b) =>
                mentionRank(a.path) - mentionRank(b.path) ||
                a.path.localeCompare(b.path, "zh-CN"),
            ),
          );
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          setWorkspaceFilesLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    mentionOpen,
    isShell,
    bridge,
    workspaceFiles.length,
    activeSession?.cwd,
    workspace,
  ]);


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
    const onKey = (event: KeyboardEvent) => {
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
      document.documentElement.classList.remove("dark");
    };
  }, []);

  const renderNode = (node: TreeNode, depth: number, path: string) => {
    const id = `${path}/${node.name}`;
    const open = expanded[id] ?? true;
    const isRoot = depth === 1;
    return (
      <div key={id} className="tree-node">
        <button type="button"
          className={`tree-folder ${isRoot ? "root" : ""}`}
          style={{ paddingLeft: 6 + (depth - 1) * 14 }}
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

        {open && (
          <>
            {node.sessions?.map((session) => {
              const index = flatSessions.indexOf(session);
              return (
                <ContextMenuPrimitive.Root
                  key={session.path || session.title}
                >
                  <ContextMenuPrimitive.Trigger asChild>
                    <button type="button"
                      className={`tree-session ${
                        (session.path
                          ? session.path === activeSessionPath
                          : index === active)
                          ? "active"
                          : ""
                      }`}
                      style={{
                        paddingLeft:
                          10 +
                          depth * 14 +
                          (session.depth ?? 0) * 16,
                      }}
                      onClick={() => selectSession(session)}
                    >
                      {session.depth ? (
                        <GitBranch size={11} className="fork-icon" />
                      ) : (
                        <FileText size={11} />
                      )}
                      <HoverCardPrimitive.Root
                        openDelay={340}
                        closeDelay={90}
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

  const sidebarView = useMemo(
    () => renderNode(sessionTree, 1, ""),
    [
      sessionTree,
      expanded,
      activeSessionPath,
      active,
      flatSessions,
      model.short,
      pinnedPaths,
    ],
  );

  return (
    <TooltipPrimitive.Provider delayDuration={320}>
      <div
        className={`app ${dark ? "dark" : ""} ${
          density === "compact" ? "compact" : ""
        } ${isShell ? "shell" : ""}`}
      >
      <div className={`desktop ${maxed ? "maxed" : ""}`}>
        <div className="window">
          <header
            className="titlebar"
            onPointerDown={(event) => {
              if (!isShell || !bridge) return;
              const target = event.target as HTMLElement;
              if (
                target.closest("button, input, a, .project-chip, .omnibox")
              ) {
                return;
              }
              (event.currentTarget as HTMLElement).setPointerCapture(
                event.pointerId,
              );
              bridge.beginDrag(event.screenX, event.screenY);
            }}
            onPointerMove={(event) => {
              if (isShell && event.buttons === 1) {
                dragPointRef.current = {
                  x: event.screenX,
                  y: event.screenY,
                };
                if (dragFrameRef.current === null) {
                  dragFrameRef.current = window.requestAnimationFrame(() => {
                    dragFrameRef.current = null;
                    const point = dragPointRef.current;
                    if (point) {
                      bridge?.dragTo(point.x, point.y);
                    }
                  });
                }
              }
            }}
            onPointerUp={() => {
              if (dragFrameRef.current !== null) {
                window.cancelAnimationFrame(dragFrameRef.current);
                dragFrameRef.current = null;
              }
              if (isShell) bridge?.endDrag();
            }}
            onPointerCancel={() => {
              if (dragFrameRef.current !== null) {
                window.cancelAnimationFrame(dragFrameRef.current);
                dragFrameRef.current = null;
              }
              if (isShell) bridge?.endDrag();
            }}
          >
            <div className="tb-left">
              <img
                className="brand-mark-img"
                src={brandTerminal}
                alt="TesT"
                title="TesT"
              />
              <span className="tb-divider" />
              <PopoverPrimitive.Root
                open={workspaceOpen}
                onOpenChange={setWorkspaceOpen}
              >
                <PopoverPrimitive.Trigger asChild>
                  <button type="button" className="project-chip" title={workspaceCwd}>
                    <Folder size={12} />
                    <span>{workspaceCwd}</span>
                    <ChevronDown size={11} />
                  </button>
                </PopoverPrimitive.Trigger>
                <PopoverPrimitive.Portal>
                  <PopoverPrimitive.Content
                    className="popover workspace-menu"
                    side="bottom"
                    align="start"
                    sideOffset={8}
                  >
                    <div className="menu-label workspace-menu-head">
                      <span>工作区</span>
                      <span className="model-menu-count">
                        {recentWorkspaces.length} 个
                      </span>
                    </div>
                    <div className="workspace-list model-menu-scroll">
                      {recentWorkspaces.map((item) => {
                        const active =
                          item.toLowerCase() ===
                          workspaceCwd.toLowerCase();
                        return (
                          <button type="button"
                            key={item}
                            className={`menu-item ${
                              active ? "active" : ""
                            }`}
                            onClick={() => selectWorkspace(item)}
                            title={item}
                          >
                            <span className="provider-mark ghost">
                              <Folder size={12} />
                            </span>
                            <span className="m-main">
                              <span className="m-name">
                                {workspaceLabel(item)}
                              </span>
                              <span className="m-meta">{item}</span>
                            </span>
                            {active && (
                              <Check size={13} className="menu-check" />
                            )}
                          </button>
                        );
                      })}
                      {recentWorkspaces.length === 0 && (
                        <div className="preset-empty">
                          还没有最近工作区
                        </div>
                      )}
                    </div>
                    {gitInfo.repo && (
                      <>
                        <div className="menu-label workspace-menu-head">
                          <span>隔离 Worktree</span>
                          <span className="model-menu-count">
                            {worktrees.length} 个
                          </span>
                        </div>
                        <div className="workspace-list">
                          {worktrees.map((item) => (
                            <div
                              key={item.path}
                              className={`workspace-worktree ${
                                pendingWorktreePath === item.path
                                  ? "confirming"
                                  : ""
                              }`}
                            >
                              <button
                                type="button"
                                className="workspace-worktree-main"
                                onClick={() => selectWorkspace(item.path)}
                                title={item.path}
                              >
                                <span className="provider-mark ghost">
                                  <GitBranch size={12} />
                                </span>
                                <span className="m-main">
                                  <span className="m-name">
                                    {item.branch || workspaceLabel(item.path)}
                                  </span>
                                  <span className="m-meta">{item.path}</span>
                                  <span className="m-meta">
                                    {item.changes ?? 0} 个改动
                                    {typeof item.ahead === "number"
                                      ? ` · 领先 ${item.ahead} / 落后 ${item.behind ?? 0}`
                                      : ""}
                                  </span>
                                </span>
                                <ChevronRight size={12} />
                              </button>
                              <button
                                type="button"
                                className={`workspace-worktree-merge ${
                                  pendingWorktreeMerge === item.path
                                    ? "confirming"
                                    : ""
                                }`}
                                aria-label={`合并 Worktree ${
                                  item.branch || item.path
                                }`}
                                title={
                                  pendingWorktreeMerge === item.path
                                    ? "再次点击确认合并到主工作区"
                                    : "合并到主工作区"
                                }
                                onClick={() => mergeIsolatedWorktree(item)}
                              >
                                <GitMerge size={11} />
                              </button>
                              <button
                                type="button"
                                className="workspace-worktree-remove"
                                aria-label={`删除 Worktree ${
                                  item.branch || item.path
                                }`}
                                title={
                                  pendingWorktreePath === item.path
                                    ? "再次点击确认删除"
                                    : "删除 Worktree"
                                }
                                onClick={() => removeIsolatedWorktree(item)}
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            className="menu-item"
                            disabled={worktreeBusy}
                            onClick={createIsolatedWorktree}
                          >
                            <span className="provider-mark ghost">
                              <GitBranch size={12} />
                            </span>
                            <span className="m-main">
                              <span className="m-name">
                                {worktreeBusy
                                  ? "正在创建隔离工作区…"
                                  : "新建隔离工作区"}
                              </span>
                              <span className="m-meta">
                                独立分支与目录，适合并行 Agent
                              </span>
                            </span>
                            <Plus size={12} />
                          </button>
                          {worktreeMergeConflict && (
                            <>
                              {worktreeMergeConflicts.length > 0 && (
                                <div className="worktree-conflicts">
                                  {worktreeMergeConflicts.map((file) => (
                                    <code key={file}>{file}</code>
                                  ))}
                                </div>
                              )}
                              <button
                                type="button"
                                className="menu-item"
                                onClick={continueWorktreeMerge}
                              >
                                <span className="provider-mark ghost">
                                  <GitMerge size={12} />
                                </span>
                                <span className="m-main">
                                  <span className="m-name">
                                    继续合并
                                  </span>
                                  <span className="m-meta">
                                    冲突处理完成后继续提交
                                  </span>
                                </span>
                              </button>
                              <button
                                type="button"
                                className="menu-item danger"
                                onClick={abortWorktreeMerge}
                              >
                                <span className="provider-mark ghost">
                                  <X size={12} />
                                </span>
                                <span className="m-main">
                                  <span className="m-name">
                                    中止未完成的合并
                                  </span>
                                  <span className="m-meta">
                                    恢复主工作区到合并前状态
                                  </span>
                                </span>
                              </button>
                            </>
                          )}
                        </div>
                      </>
                    )}
                    <div className="menu-sep" />
                    <button type="button"
                      className="menu-item"
                      onClick={chooseWorkspace}
                    >
                      <span className="provider-mark ghost">
                        <FolderPlus size={12} />
                      </span>
                      <span className="m-main">
                        <span className="m-name">打开文件夹…</span>
                        <span className="m-meta">
                          选择一个新的工作目录
                        </span>
                      </span>
                      <ChevronRight size={12} />
                    </button>
                    <PopoverPrimitive.Arrow
                      className="popover-arrow"
                      width={10}
                      height={5}
                    />
                  </PopoverPrimitive.Content>
                </PopoverPrimitive.Portal>
              </PopoverPrimitive.Root>
            </div>

            <div className="tb-center">
              <button type="button" className="omnibox" onClick={() => setCmdOpen(true)}>
                <Search size={13} />
                <span>搜索或执行命令…</span>
                <kbd>Ctrl K</kbd>
              </button>
            </div>

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
          </header>

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
                  <aside className="sidebar">
                    <div className="sidebar-top">
                      <div className="side-title">
                        <span>工作区</span>
                      </div>
                      <div className="side-actions">
                        <Button
                          variant="primary"
                          size="sm"
                          className="glass-primary"
                          onClick={newSession}
                        >
                          <Plus size={13} /> 新建会话
                        </Button>
                        <Button
                          variant="icon"
                          title="刷新会话列表"
                          onClick={refreshSessions}
                        >
                          <RotateCcw size={14} />
                        </Button>
                      </div>
                    </div>

                    <ScrollAreaPrimitive.Root className="session-scroll">
                      <ScrollAreaPrimitive.Viewport className="session-viewport">
                        <div className="session-list tree">
                          {pinnedSessions.length > 0 && (
                            <div className="pinned-group">
                              <div className="pinned-head">
                                <Pin size={11} />
                                <span>置顶</span>
                                <small>{pinnedSessions.length}</small>
                              </div>
                              {pinnedSessions.map((session) => (
                                <button type="button"
                                  key={`pin-${session.path}`}
                                  className={`pinned-session ${
                                    session.path === activeSessionPath
                                      ? "active"
                                      : ""
                                  }`}
                                  onClick={() => selectSession(session)}
                                  title={session.title}
                                >
                                  <span className="pinned-session-title">
                                    <Pin size={10} />
                                    <span>{session.title}</span>
                                  </span>
                                  <small>{session.meta}</small>
                                </button>
                              ))}
                            </div>
                          )}
                          {sidebarView}
                        </div>
                      </ScrollAreaPrimitive.Viewport>
                      <ScrollAreaPrimitive.Scrollbar
                        className="scroll-area-bar"
                        orientation="vertical"
                      >
                        <ScrollAreaPrimitive.Thumb className="scroll-area-thumb" />
                      </ScrollAreaPrimitive.Scrollbar>
                      <ScrollAreaPrimitive.Corner />
                    </ScrollAreaPrimitive.Root>

                    <div className="sidebar-foot">
                      <div className="foot-user">
                        <span className="avatar">U</span>
                        <div>
                          <b>本地用户</b>
                        </div>
                      </div>
                    </div>
                  </aside>
                </Panel>
              )}

              {!tiny && (
                <Separator
                  id="handle-sidebar"
                  className="resize-handle"
                />
              )}

              <Panel id="chat" minSize="36%" className="panel">
                <main className="chat">
                  {sessionTabs.length > 1 && (
                    <div
                      className="session-tabs"
                      role="tablist"
                      aria-label="打开的会话"
                    >
                      {sessionTabs.map((tab) => (
                        <div
                          className={`session-tab ${
                            tab.path === activeSessionPath ? "on" : ""
                          }`}
                          key={tab.path}
                        >
                          <button type="button"
                            className="session-tab-main"
                            role="tab"
                            aria-selected={
                              tab.path === activeSessionPath
                            }
                            onClick={() =>
                              selectSessionByPath(tab.path)
                            }
                          >
                            <FileText size={11} />
                            <span>{tab.title}</span>
                          </button>
                          <button type="button"
                            className="session-tab-close"
                            aria-label={`关闭 ${tab.title}`}
                            onClick={() => closeTab(tab.path)}
                          >
                            <X size={9} />
                          </button>
                        </div>
                      ))}
                      <button type="button"
                        className="session-tab-new"
                        title="新建会话"
                        onClick={() => newSessionRef.current()}
                      >
                        <Plus size={11} />
                      </button>
                    </div>
                  )}
                  <div className="chat-head">
                    <div className="chat-title">
                      <div className="crumbs">
                        <span className="crumb-back">会话</span>
                        <ChevronRight size={11} />
                        <span className="crumb-cur">
                          {isShell
                            ? sessionName ||
                              activeSession?.title ||
                              "新会话"
                            : activeSession?.title || "新会话"}
                        </span>
                      </div>
                      <div className="chat-sub">
                        <span
                          className={`badge ${
                            model.id ? "badge-mint" : "badge-amber"
                          }`}
                        >
                          <i className="dot" />
                          {model.id
                            ? pending
                              ? "运行中"
                              : "就绪"
                            : "待配置"}
                        </span>
                        {(!isShell || piStatus !== "ready") && (
                          <span>
                            {isShell
                              ? "连接中"
                              : activeSession?.meta || ""}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="chat-actions">
                      <Tooltip tip="上下文面板">
                        <Button
                          variant="icon"
                          onClick={toggleContext}
                          title="切换上下文面板"
                        >
                          <PanelRight size={15} />
                        </Button>
                      </Tooltip>
                      <DropdownMenuPrimitive.Root>
                        <DropdownMenuPrimitive.Trigger asChild>
                          <Button
                            variant="icon"
                            title="会话操作"
                            aria-label="会话操作"
                          >
                            <MoreHorizontal size={15} />
                          </Button>
                        </DropdownMenuPrimitive.Trigger>
                        <DropdownMenuPrimitive.Portal>
                          <DropdownMenuPrimitive.Content
                            className="menu-content"
                            align="end"
                            sideOffset={6}
                          >
                            <DropdownMenuPrimitive.Label className="menu-label">
                              会话
                            </DropdownMenuPrimitive.Label>
                            <DropdownMenuPrimitive.Item
                              className="menu-item"
                              onSelect={() => {
                                if (activeSession) {
                                  openRename(activeSession);
                                }
                              }}
                            >
                              <Pencil size={13} /> 重命名
                            </DropdownMenuPrimitive.Item>
                            <DropdownMenuPrimitive.Item
                              className="menu-item"
                              onSelect={() => {
                                if (activeSession) {
                                  archiveSessionFile(activeSession);
                                }
                              }}
                            >
                              <Archive size={13} /> 归档会话
                            </DropdownMenuPrimitive.Item>
                            <DropdownMenuPrimitive.Separator className="menu-sep" />
                            <DropdownMenuPrimitive.Item
                              className="menu-item danger"
                              onSelect={() => {
                                if (activeSession) {
                                  setDeleteTarget(activeSession);
                                }
                              }}
                            >
                              <Trash2 size={13} /> 删除会话
                            </DropdownMenuPrimitive.Item>
                          </DropdownMenuPrimitive.Content>
                        </DropdownMenuPrimitive.Portal>
                      </DropdownMenuPrimitive.Root>
                    </div>
                  </div>

                  {findOpen && (
                    <div className="findbar">
                      <Search size={13} />
                      <input
                        autoFocus
                        value={findQuery}
                        onChange={(event) => {
                          setFindQuery(event.target.value);
                          setFindIndex(0);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") {
                            setFindOpen(false);
                          } else if (event.key === "Enter") {
                            event.preventDefault();
                            if (findMatches.length > 0) {
                              setFindIndex((index) =>
                                event.shiftKey
                                  ? (index - 1 + findMatches.length) %
                                    findMatches.length
                                  : (index + 1) % findMatches.length,
                              );
                            }
                          }
                        }}
                        placeholder="在当前会话中查找…"
                      />
                      <span className="find-count">
                        {findQuery.trim()
                          ? findMatches.length
                            ? `${findIndex + 1}/${findMatches.length}`
                            : "0/0"
                          : ""}
                      </span>
                      <button
                        type="button"
                        className="find-nav"
                        aria-label="上一个"
                        onClick={() => {
                          if (findMatches.length > 0) {
                            setFindIndex(
                              (index) =>
                                (index - 1 + findMatches.length) %
                                findMatches.length,
                            );
                          }
                        }}
                      >
                        <ChevronLeft size={12} />
                      </button>
                      <button
                        type="button"
                        className="find-nav"
                        aria-label="下一个"
                        onClick={() => {
                          if (findMatches.length > 0) {
                            setFindIndex(
                              (index) =>
                                (index + 1) % findMatches.length,
                            );
                          }
                        }}
                      >
                        <ChevronRight size={12} />
                      </button>
                      <button
                        type="button"
                        className="find-nav"
                        aria-label="关闭查找"
                        onClick={() => setFindOpen(false)}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}

                  <div
                    className="messages"
                    ref={messagesRef}
                    onScroll={handleMessagesScroll}
                    aria-busy={messagesLoading}
                  >
                    <div className="thread">
                      {!isShell && (
                        <>
                      <div className="message user">
                        <div className="msg-meta">你 · 14:02</div>
                        <div className="bubble user-bubble">
                          帮我把这个项目的桌面端骨架搭起来，先只做界面，不接后端。
                        </div>
                      </div>

                      <div className="message assistant">
                        <div className="msg-meta">
                          <span className="model-chip">
                            <span className="model-dot" />
                            {model.label}
                          </span>
                          <span>14:03</span>
                        </div>

                        <p>先把信息层级定下来，再动代码。三栏工作台：</p>
                        <ul>
                          <li>左侧：项目与会话树，支持搜索、标签、未读</li>
                          <li>中间：文档式消息流，工具调用折叠成卡片</li>
                          <li>右侧：当前上下文，模型、目录、分支、用量</li>
                        </ul>

                        <div className="tool-stack">
                          <ToolCard
                            name="read"
                            target="src/App.tsx"
                            duration="124 ms"
                          >
                            <div className="tool-line">
                              <span className="tk">ok</span>
                              读取 42 行 · 1 个导入块 · 0 个警告
                            </div>
                          </ToolCard>
                          <ToolCard
                            name="edit"
                            target="src/styles.css"
                            state="running"
                          >
                            <div className="tool-line">
                              <span className="tk">…</span>
                              正在写入样式 token 与卡片层级
                            </div>
                          </ToolCard>
                        </div>

                        <PlanCard />

                        <p>骨架先固定间距与状态，再接 Pi RPC：</p>
                        <CodeCard
                          lang="tsx"
                          code={`<div className="layout">
  <aside className="sidebar" />
  <main className="chat" />
  <aside className="context" />
</div>`}
                        />

                        <div className="msg-actions">
                          <button type="button"
                            onClick={async () => {
                              const ok = await copyText(
                                "先把信息层级定下来，再动代码。",
                              );
                              if (ok) notify("已复制回复");
                            }}
                          >
                            <Copy size={12} /> 复制
                          </button>
                          <button type="button"
                            onClick={() =>
                              notify("已重新生成", "沿用当前上下文")
                            }
                          >
                            <RotateCcw size={12} /> 重试
                          </button>
                          <button
                            type="button"
                            aria-label="这条回复有帮助"
                            title="这条回复有帮助"
                            onClick={() => notify("已记录反馈")}
                          >
                            <ThumbsUp size={12} />
                          </button>
                        </div>
                      </div>

                      {sent.map((item, index) => (
                        <div className="message user" key={`${item}-${index}`}>
                          <div className="msg-meta">你 · 现在</div>
                          <div className="bubble user-bubble">{item}</div>
                        </div>
                      ))}

                      {pending && (
                        <div className="message assistant">
                          <div className="thinking">
                            <DotSpinner />
                            <span>Pi 正在思考…</span>
                          </div>
                        </div>
                      )}
                        </>
                      )}

                      {isShell && (
                        <>
                          {(messagesLoading || historyLoading) && (
                            <div className="empty-chat messages-loading">
                              <div className="thinking">
                                <DotSpinner />
                                <span>正在载入会话…</span>
                              </div>
                            </div>
                          )}

                          {!messagesLoading &&
                            !historyLoading &&
                            liveMessages.length === 0 &&
                            !pending && (
                              <div className="empty-chat">
                                <img
                                  className="empty-bug"
                                  src={emptyBug}
                                  alt=""
                                />
                              </div>
                            )}

                          {liveMessages.map((message) => (
                            <div
                              className={`message ${message.role} ${
                                findMatches[findIndex] === message.id
                                  ? "find-hit"
                                  : findMatches.includes(message.id)
                                    ? "find-match"
                                    : ""
                              }`}
                              key={message.id}
                              data-msg-id={message.id}
                            >
                              <div className="msg-meta">
                                {message.role === "user"
                                  ? "你 · 现在"
                                  : model.label}
                              </div>
                              {message.role === "user" ? (
                                <div className="bubble user-bubble">
                                  {message.text}
                                </div>
                              ) : (
                                <div className="assistant-text">
                                  <MarkdownText text={message.text} />
                                </div>
                              )}
                              <div className="msg-actions">
                                <button type="button"
                                  onClick={async () => {
                                    const ok = await copyText(message.text);
                                    if (ok) notify("已复制");
                                  }}
                                >
                                  <Copy size={12} /> 复制
                                </button>
                                {message.role === "user" ? (
                                  <>
                                    <button type="button"
                                      onClick={() => editMessage(message.text)}
                                    >
                                      <Pencil size={12} /> 编辑并截断
                                    </button>
                                  </>
                                ) : (
                                  <button type="button"
                                    onClick={() => retryMessage(message.id)}
                                  >
                                    <RotateCcw size={12} /> 重试
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}

                          {liveTools.map((tool) => (
                            <div
                              className="message assistant"
                              key={tool.id}
                            >
                              <div className="msg-meta">
                                工具 · {tool.name}
                              </div>
                              <ToolCard
                                name={tool.name}
                                target={toolTarget(tool)}
                                duration={
                                  tool.durationMs
                                    ? `${Math.max(1, Math.round(tool.durationMs))} ms`
                                    : undefined
                                }
                                state={
                                  tool.state === "running"
                                    ? "running"
                                    : tool.state === "error"
                                      ? "error"
                                      : "done"
                                }
                              >
                                {tool.args !== undefined && (
                                  <pre className="tool-preview">
                                    {previewValue(tool.args)}
                                  </pre>
                                )}
                                {tool.partial !== undefined && (
                                  <pre className="tool-preview">
                                    {previewValue(tool.partial)}
                                  </pre>
                                )}
                                {tool.result !== undefined && (
                                  <pre className="tool-preview">
                                    {previewValue(tool.result)}
                                  </pre>
                                )}
                              </ToolCard>
                            </div>
                          ))}

                          {streamActive && <StreamingBubble model={model} />}

                          {pending && !streamActive && (
                            <div className="message assistant">
                              <div className="thinking">
                                <DotSpinner />
                                <span>Pi 正在思考…</span>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="composer-wrap">
                    {(Object.keys(extensionStatuses).length > 0 ||
                      Object.keys(extensionWidgets).length > 0) && (
                      <div className="extension-strip">
                        {Object.entries(extensionStatuses).map(
                          ([key, text]) => (
                            <span className="extension-status" key={key}>
                              <i />
                              {text}
                            </span>
                          ),
                        )}
                        {Object.entries(extensionWidgets).map(
                          ([key, widget]) => (
                            <pre className="extension-widget" key={key}>
                              {widget.lines.join("\n")}
                            </pre>
                          ),
                        )}
                      </div>
                    )}
                    <div
                      className={`composer ${contextDrag ? "is-dragging" : ""}`}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setContextDrag(true);
                      }}
                      onDragLeave={(event) => {
                        if (
                          !event.currentTarget.contains(
                            event.relatedTarget as Node | null,
                          )
                        ) {
                          setContextDrag(false);
                        }
                      }}
                      onDrop={onContextDrop}
                    >
                      <input
                        ref={contextInputRef}
                        type="file"
                        multiple
                        hidden
                        onChange={(event) => {
                          void onContextFiles(event.target.files);
                          event.target.value = "";
                        }}
                      />
                      {contextFiles.length > 0 && (
                        <div className="context-chips">
                          {contextFiles.map((file) => (
                            <span
                              className={`context-chip ${
                                draggedContextId === file.id ? "is-dragging" : ""
                              }`}
                              key={file.id}
                              data-context-id={file.id}
                              title={`${file.path} · 拖动排序`}
                              draggable
                              onDragStart={(event) => {
                                event.stopPropagation();
                                event.dataTransfer.effectAllowed = "move";
                                event.dataTransfer.setData("text/plain", file.id);
                                setDraggedContextId(file.id);
                              }}
                              onDragOver={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                event.dataTransfer.dropEffect = "move";
                              }}
                              onDrop={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                reorderContext(
                                  event.dataTransfer.getData("text/plain") ||
                                    draggedContextId ||
                                    "",
                                  file.id,
                                );
                                setDraggedContextId(null);
                                setContextDrag(false);
                              }}
                              onDragEnd={() => {
                                setDraggedContextId(null);
                                setContextDrag(false);
                              }}
                            >
                              {file.kind === "image" ? (
                                <ImageIcon size={11} />
                              ) : (
                                <FileText size={11} />
                              )}
                              <span>{file.name}</span>
                              <small>{formatBytes(file.size)}</small>
                              <button
                                type="button"
                                aria-label={`移除 ${file.name}`}
                                onClick={() => removeContext(file.id)}
                              >
                                <X size={10} />
                              </button>
                            </span>
                          ))}
                          <span className="context-total">
                            ≈{" "}
                            {formatTokenCount(
                              contextFiles.reduce(
                                (sum, file) =>
                                  sum +
                                  (file.kind === "text"
                                    ? Math.ceil(
                                        (file.text?.length || 0) / 4,
                                      )
                                    : 0),
                                0,
                              ),
                            )}{" "}
                            tokens
                          </span>
                        </div>
                      )}
                      {mentionOpen && (
                        <div className="slash-menu mention-menu" role="listbox">
                          <div className="slash-head">
                            <span>文件引用</span>
                            <span>
                              {workspaceFilesLoading
                                ? "读取中…"
                                : `${workspaceFiles.length} 个文件`}
                            </span>
                          </div>
                          <div className="slash-list">
                            {filteredMentions.map((file, index) => (
                              <button
                                type="button"
                                key={file.path}
                                role="option"
                                aria-selected={index === mentionIndex}
                                className={`slash-item ${
                                  index === mentionIndex ? "active" : ""
                                }`}
                                onMouseEnter={() => setMentionIndex(index)}
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  insertMention(file.path);
                                }}
                              >
                                <span className="slash-icon">
                                  <FileText size={13} />
                                </span>
                                <span className="slash-main">
                                  <span className="slash-label">
                                    {file.path}
                                  </span>
                                  <span className="slash-desc">
                                    {formatBytes(file.size)}
                                  </span>
                                </span>
                                <code>@</code>
                              </button>
                            ))}
                            {!workspaceFilesLoading &&
                              filteredMentions.length === 0 && (
                                <div className="slash-empty">
                                  没有匹配的文件
                                </div>
                              )}
                          </div>
                          <div className="slash-foot">
                            <span>
                              <kbd>↑</kbd>
                              <kbd>↓</kbd> 选择
                            </span>
                            <span>
                              <kbd>↵</kbd> 插入路径
                            </span>
                            <span>
                              <kbd>Esc</kbd> 关闭
                            </span>
                          </div>
                        </div>
                      )}
                      {slashOpen && (
                        <div className="slash-menu" role="listbox">
                          <div className="slash-head">
                            <span>命令</span>
                            <span>输入以筛选</span>
                          </div>
                          <div className="slash-list">
                            {filteredSlash.map((command, index) => (
                              <button
                                type="button"
                                key={command.name}
                                role="option"
                                aria-selected={index === slashIndex}
                                className={`slash-item ${
                                  index === slashIndex ? "active" : ""
                                }`}
                                onMouseEnter={() => setSlashIndex(index)}
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  setDraft("");
                                  command.run();
                                  composerRef.current?.focus();
                                }}
                              >
                                <span className="slash-icon">
                                  {command.icon}
                                </span>
                                <span className="slash-main">
                                  <span className="slash-label">
                                    {command.label}
                                  </span>
                                  <span className="slash-desc">
                                    {command.desc}
                                  </span>
                                </span>
                                <code>
                                  {(command as { tag?: string }).tag ??
                                    `/${command.name}`}
                                </code>
                              </button>
                            ))}
                            {filteredSlash.length === 0 && (
                              <div className="slash-empty">
                                没有匹配的命令 · 直接回车发送
                              </div>
                            )}
                          </div>
                          <div className="slash-foot">
                            <span>
                              <kbd>↑</kbd>
                              <kbd>↓</kbd> 选择
                            </span>
                            <span>
                              <kbd>↵</kbd> 执行
                            </span>
                            <span>
                              <kbd>Esc</kbd> 关闭
                            </span>
                          </div>
                        </div>
                      )}
                      <textarea
                        ref={composerRef}
                        value={draft}
                        onChange={(event) => {
                          setDraft(event.target.value);
                          setSlashDismissed(false);
                          setMentionDismissed(false);
                        }}
                        onBlur={() => setSlashDismissed(true)}
                        onPaste={(event) => {
                          const files = Array.from(
                            event.clipboardData?.files || [],
                          ).filter((file) =>
                            file.type.startsWith("image/"),
                          );
                          if (files.length > 0) {
                            event.preventDefault();
                            void readBrowserContext(files);
                          }
                        }}
                        onKeyDown={(event) => {
                          if (mentionOpen) {
                            if (event.key === "ArrowDown") {
                              event.preventDefault();
                              setMentionIndex((index) =>
                                Math.min(
                                  index + 1,
                                  Math.max(
                                    0,
                                    filteredMentions.length - 1,
                                  ),
                                ),
                              );
                              return;
                            }
                            if (event.key === "ArrowUp") {
                              event.preventDefault();
                              setMentionIndex((index) =>
                                Math.max(index - 1, 0),
                              );
                              return;
                            }
                            if (
                              event.key === "Tab" ||
                              (event.key === "Enter" &&
                                !event.shiftKey)
                            ) {
                              const file =
                                filteredMentions[mentionIndex] ??
                                filteredMentions[0];
                              if (file) {
                                event.preventDefault();
                                insertMention(file.path);
                                return;
                              }
                            }
                            if (event.key === "Escape") {
                              event.preventDefault();
                              setMentionDismissed(true);
                              return;
                            }
                          }
                          if (slashOpen) {
                            if (event.key === "ArrowDown") {
                              event.preventDefault();
                              setSlashIndex((index) =>
                                Math.min(
                                  index + 1,
                                  Math.max(0, filteredSlash.length - 1),
                                ),
                              );
                              return;
                            }
                            if (event.key === "ArrowUp") {
                              event.preventDefault();
                              setSlashIndex((index) =>
                                Math.max(index - 1, 0),
                              );
                              return;
                            }
                            if (
                              event.key === "Tab" ||
                              (event.key === "Enter" && !event.shiftKey)
                            ) {
                              const command =
                                filteredSlash[slashIndex] ??
                                filteredSlash[0];
                              if (command) {
                                event.preventDefault();
                                setDraft("");
                                command.run();
                                return;
                              }
                            }
                            if (event.key === "Escape") {
                              event.preventDefault();
                              setSlashDismissed(true);
                              return;
                            }
                          }
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            send();
                          }
                        }}
                        placeholder="Message pi…"
                        rows={2}
                      />

                      <div className="composer-bar">
                        <div className="composer-tools">
                          <button type="button"
                            className={`pill plan-pill ${
                              planMode ? "is-active" : "subtle"
                            }`}
                            onClick={togglePlanMode}
                            title={
                              planMode
                                ? "计划模式：Pi 会先给方案"
                                : "开启计划模式：先出方案，确认后执行"
                            }
                          >
                            <FileText size={12} />
                            {planMode ? "计划中" : "计划"}
                          </button>
                          <PopoverPrimitive.Root
                            open={modelOpen}
                            onOpenChange={setModelOpen}
                          >
                            <PopoverPrimitive.Trigger asChild>
                              <button type="button" className="pill">
                                <span
                                  className={`model-dot ${
                                    model.id ? "" : "off"
                                  }`}
                                />
                                {model.short}
                                <ChevronDown size={11} />
                              </button>
                            </PopoverPrimitive.Trigger>
                            <PopoverPrimitive.Portal>
                              <PopoverPrimitive.Content
                                className="popover model-menu"
                                side="top"
                                align="start"
                                sideOffset={10}
                              >
                                <div className="model-menu-inner">
                                  <div className="menu-label model-menu-head">
                                    <span>Pi 模型 · 快捷切换</span>
                                    <span className="model-menu-count">
                                      {availableModels.length} 个可用
                                    </span>
                                  </div>
                                  <div className="model-menu-scroll">
                                    {availableModels.length === 0 && (
                                      <button type="button"
                                        className="menu-item"
                                        onClick={() => {
                                          setModelOpen(false);
                                          setSettingsTab("models");
                                          setSettingsOpen(true);
                                        }}
                                      >
                                        <span className="provider-mark ghost">
                                          <Settings size={12} />
                                        </span>
                                        <span className="m-main">
                                          <span className="m-name">
                                            未配置模型
                                          </span>
                                          <span className="m-meta">
                                            在设置或 models.json 中添加
                                          </span>
                                        </span>
                                        <ChevronRight size={12} />
                                      </button>
                                    )}
                                    {availableModels.map((item) => (
                                  <button type="button"
                                    key={item.id}
                                    className={`menu-item ${
                                      item.id === model.id ? "active" : ""
                                    }`}
                                    onClick={() => {
                                      applyModel(item);
                                      setModelOpen(false);
                                      notify(
                                        "模型已切换",
                                        `${item.label} · ${item.provider}`,
                                      );
                                    }}
                                  >
                                    <span className="provider-mark">
                                      {item.provider[0]}
                                    </span>
                                    <span className="m-main">
                                      <span className="m-name">{item.label}</span>
                                      <span className="m-meta">
                                        {item.provider} · {item.ctx} context
                                      </span>
                                    </span>
                                    {item.badge && (
                                      <Tag tone="blue">{item.badge}</Tag>
                                    )}
                                    {item.id === model.id && (
                                      <Check size={13} className="menu-check" />
                                    )}
                                  </button>
                                    ))}
                                  </div>
                                </div>
                                <PopoverPrimitive.Arrow
                                  className="popover-arrow"
                                  width={10}
                                  height={5}
                                />
                              </PopoverPrimitive.Content>
                            </PopoverPrimitive.Portal>
                          </PopoverPrimitive.Root>

                          <PopoverPrimitive.Root
                            open={reasoningOpen}
                            onOpenChange={setReasoningOpen}
                          >
                            <PopoverPrimitive.Trigger asChild>
                              <button type="button" className="pill">
                                <Zap size={12} />
                                {reasoning}
                                <ChevronDown size={11} />
                              </button>
                            </PopoverPrimitive.Trigger>
                            <PopoverPrimitive.Portal>
                              <PopoverPrimitive.Content
                                className="popover reasoning-menu"
                                side="top"
                                align="start"
                                sideOffset={10}
                              >
                                <div className="menu-label">推理强度</div>
                                <ToggleGroupPrimitive.Root
                                  className="toggle-group vertical"
                                  type="single"
                                  value={reasoning}
                                  onValueChange={(value) => {
                                    if (!value) return;
                                    applyReasoning(value);
                                    setReasoningOpen(false);
                                    notify("推理强度", value);
                                  }}
                                >
                                  {thinkingLevels.map((level) => (
                                    <ToggleGroupPrimitive.Item
                                      key={level}
                                      value={level}
                                      className="toggle-item"
                                    >
                                      {level === "low" ? (
                                        <Gauge size={11} />
                                      ) : level === "medium" ? (
                                        <Zap size={11} />
                                      ) : (
                                        <Brain size={11} />
                                      )}
                                      {thinkingLabel(level)}
                                    </ToggleGroupPrimitive.Item>
                                  ))}
                                </ToggleGroupPrimitive.Root>
                                <PopoverPrimitive.Arrow
                                  className="popover-arrow"
                                  width={10}
                                  height={5}
                                />
                              </PopoverPrimitive.Content>
                            </PopoverPrimitive.Portal>
                          </PopoverPrimitive.Root>

                          <button type="button"
                            className={`pill ${
                              contextFiles.length > 0 ? "" : "subtle"
                            }`}
                            onClick={pickContext}
                            title="添加文件或图片作为上下文，也可以直接拖进来"
                          >
                            <Paperclip size={12} />
                            {contextFiles.length > 0
                              ? `上下文 ${contextFiles.length}`
                              : "添加上下文"}
                          </button>
                          <button type="button"
                            className="pill subtle"
                            onClick={pickContextFolder}
                            title="添加整个文件夹，最多读取 40 个文本文件"
                          >
                            <FolderPlus size={12} />
                            文件夹
                          </button>
                        </div>
                        <div className="composer-right">
                          {queuedMessages > 0 && (
                            <span
                              className="queue-pill"
                              title="已排队的消息"
                            >
                              排队 {queuedMessages}
                            </span>
                          )}
                          {compacting && (
                            <span className="queue-pill compacting">
                              压缩中…
                            </span>
                          )}
                          <span className="ctx-pct">
                            {(() => {
                              const used =
                                contextTokens ||
                                sessionStats?.contextUsage?.tokens ||
                                null;
                              const limit =
                                sessionStats?.contextUsage?.contextWindow ||
                                model.contextWindow;
                              return used != null && limit
                                ? `${Math.min(
                                    100,
                                    Math.round((used / limit) * 100),
                                  )}%`
                                : "—";
                            })()}
                          </span>
                          <button type="button"
                            className={`send-btn ${
                              pending || streamActive ? "stop" : ""
                            }`}
                            onClick={pending || streamActive ? stopPi : send}
                            title={
                              pending || streamActive ? "停止生成" : "发送"
                            }
                            aria-label={
                              pending || streamActive ? "停止生成" : "发送"
                            }
                          >
                            <MorphIcon
                              icon={
                                pending || streamActive
                                  ? SquareNode
                                  : ArrowUpNode
                              }
                              size={pending || streamActive ? 12 : 15}
                              strokeWidth={2.4}
                              aria-hidden="true"
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </main>
              </Panel>

              {showContext && !narrow && (
                <Separator
                  id="handle-context"
                  className="resize-handle"
                />
              )}

              {showContext && !narrow && (
                <Panel
                  id="context"
                  defaultSize="22%"
                  minSize="17%"
                  maxSize="34%"
                  className="panel"
                >
                  <aside className="context">
                    <div className="context-head">
                      <h2>上下文</h2>
                      <div>
                        <Button
                          variant="icon"
                          onClick={() => setShowContext(false)}
                          title="关闭上下文面板"
                        >
                          <X size={14} />
                        </Button>
                      </div>
                    </div>

                    <ContextCards
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
                    />
                  </aside>
                </Panel>
              )}
            </Group>
          </div>
        </div>
      </div>

      {cmdOpen && (
        <div className="cmd-overlay" onMouseDown={() => setCmdOpen(false)}>
          <div className="cmd" onMouseDown={(event) => event.stopPropagation()}>
            <div className="cmd-input">
              <Search size={15} />
              <input
                autoFocus
                value={cmdQuery}
                onChange={(event) => setCmdQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setCmdIndex((index) =>
                      Math.min(index + 1, filteredCommands.length - 1),
                    );
                  } else if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setCmdIndex((index) => Math.max(index - 1, 0));
                  } else if (event.key === "Enter") {
                    const command = filteredCommands[cmdIndex];
                    if (command) {
                      command.run();
                      setCmdOpen(false);
                    }
                  }
                }}
                placeholder="输入命令或搜索…"
              />
              <kbd>Esc</kbd>
            </div>
            <div className="cmd-list">
              <div className="cmd-group">操作</div>
              {filteredCommands.map((command, index) => (
                <button type="button"
                  key={command.label}
                  className={`cmd-item ${index === cmdIndex ? "active" : ""}`}
                  onMouseEnter={() => setCmdIndex(index)}
                  onClick={() => {
                    command.run();
                    setCmdOpen(false);
                  }}
                >
                  <span className="cmd-icon">{command.icon}</span>
                  <span>{command.label}</span>
                  <span className="cmd-hint">{command.hint}</span>
                </button>
              ))}
              {filteredCommands.length === 0 && (
                <div className="cmd-empty">没有匹配的命令</div>
              )}
            </div>
            <div className="cmd-foot">
              <span>
                <kbd>↑</kbd>
                <kbd>↓</kbd> 选择
              </span>
              <span>
                <kbd>↵</kbd> 执行
              </span>
            </div>
          </div>
        </div>
      )}

      {gallery && (
        <div className="gallery-overlay" onMouseDown={() => setGallery(false)}>
          <div
            className="gallery"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="gallery-head">
              <div>
                <h2>设计零件</h2>
                <p>M0 · 窗口 / 卡片 / 组件 / Radix 原语</p>
              </div>
              <Button
                variant="icon"
                aria-label="关闭设计零件"
                onClick={() => setGallery(false)}
              >
                <X size={16} />
              </Button>
            </div>

            <section className="gallery-section">
              <h3>窗口 Window</h3>
              <div className="window-demo">
                <div className="window-demo-bar">
                  <span className="window-demo-brand">
                    <img className="brand-mark-img sm" src={brandTerminal} alt="TesT" />
                  </span>
                  <span className="window-demo-title">工作台</span>
                  <CaptionButtons small />
                </div>
                <div className="window-demo-body">
                  <span className="skeleton" style={{ width: "34%" }} />
                  <span className="skeleton" style={{ width: "78%" }} />
                  <span className="skeleton" style={{ width: "62%" }} />
                </div>
              </div>
              <p className="gallery-note">
                自绘标题栏 44px：左侧品牌与工作区，中间全局搜索，右侧 Windows
                风格最小化 / 最大化 / 关闭。关闭悬停 #C42B1C。
              </p>
            </section>

            <section className="gallery-section">
              <h3>卡片 Card</h3>
              <div className="gallery-grid">
                <div className="demo-card">
                  <div className="demo-card-head">
                    <span className="demo-icon">
                      <Cpu size={12} />
                    </span>
                    <b>基础卡片</b>
                    <Tag tone="mint">hover</Tag>
                  </div>
                  <p className="demo-desc">
                    1px 描边 + 极浅阴影；悬停抬升 1px、阴影加深。所有面板共用一套。
                  </p>
                  <div className="demo-foot">
                    <span className="muted">12px 圆角</span>
                    <Button size="sm" variant="secondary">
                      <Eye size={13} /> 查看
                    </Button>
                  </div>
                </div>

                <div className="demo-card">
                  <div className="demo-card-head">
                    <span className="demo-icon">
                      <Zap size={12} />
                    </span>
                    <b>指标卡片</b>
                  </div>
                  <div className="demo-big">
                    42<span>%</span>
                  </div>
                  <Progress value={42} />
                  <div className="meter-foot">
                    <span>84k tokens</span>
                    <span>200k</span>
                  </div>
                </div>

                <div className="demo-card">
                  <div className="demo-card-head">
                    <span className="demo-icon">
                      <Wrench size={12} />
                    </span>
                    <b>工具卡片</b>
                    <Tag>read</Tag>
                  </div>
                  <ToolCard name="read" target="src/App.tsx" duration="124 ms">
                    <div className="tool-line">
                      <span className="tk">ok</span> 读取 42 行
                    </div>
                  </ToolCard>
                </div>

                <div className="demo-card">
                  <div className="demo-card-head">
                    <span className="demo-icon">
                      <Puzzle size={12} />
                    </span>
                    <b>拖入安装</b>
                  </div>
                  <button type="button"
                    className="dropzone"
                    onClick={() => notify("拖入安装", "支持 .zip / 文件夹")}
                  >
                    <Plus size={13} /> 拖入 .zip / 文件夹
                  </button>
                  <p className="demo-desc">
                    扩展与技能共用同一个入口，拖进来即安装。
                  </p>
                </div>
              </div>
            </section>

            <section className="gallery-section">
              <h3>Radix / shadcn 原语</h3>
              <div className="gallery-row">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setGallery(false);
                    setSettingsOpen(true);
                  }}
                >
                  <Sliders size={13} /> 设置 Dialog
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setGallery(false);
                    setCloseOpen(true);
                  }}
                >
                  <X size={13} /> 退出 AlertDialog
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setGallery(false);
                    setSheetMode("extensions");
                  }}
                >
                  <Puzzle size={13} /> 扩展 Sheet
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setGallery(false);
                    setModelOpen(true);
                  }}
                >
                  <Sparkles size={13} /> 模型 Popover
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setGallery(false);
                    setSheetMode("context");
                  }}
                >
                  <PanelRight size={13} /> 上下文 Sheet
                </Button>
              </div>
              <div className="gallery-row gallery-row-gap">
                <Segmented
                  value={demoRadio}
                  onChange={setDemoRadio}
                  options={[
                    {
                      value: "fast",
                      label: "快",
                      icon: <Zap size={11} />,
                    },
                    {
                      value: "balanced",
                      label: "平衡",
                      icon: <Gauge size={11} />,
                    },
                    {
                      value: "deep",
                      label: "深",
                      icon: <Brain size={11} />,
                    },
                  ]}
                />
                <ToggleGroupPrimitive.Root
                  className="toggle-group"
                  type="single"
                  value={reasoning}
                  onValueChange={(value) => {
                    if (value) applyReasoning(value);
                  }}
                >
                  <ToggleGroupPrimitive.Item value="low" className="toggle-item">
                    <Gauge size={11} /> low
                  </ToggleGroupPrimitive.Item>
                  <ToggleGroupPrimitive.Item
                    value="medium"
                    className="toggle-item"
                  >
                    <Zap size={11} /> medium
                  </ToggleGroupPrimitive.Item>
                  <ToggleGroupPrimitive.Item value="high" className="toggle-item">
                    <Brain size={11} /> high
                  </ToggleGroupPrimitive.Item>
                </ToggleGroupPrimitive.Root>
                <span className="muted">
                  右键任意会话 · 悬停会话标题 · 拖动分栏
                </span>
              </div>
            </section>

            <section className="gallery-section">
              <h3>按钮 Button</h3>
              <div className="gallery-row">
                <Button variant="primary">
                  <Check size={13} /> 主要
                </Button>
                <Button variant="secondary">
                  <ArrowRight size={13} /> 次要
                </Button>
                <Button variant="ghost">
                  <Sparkles size={13} /> 幽灵
                </Button>
                <Button variant="danger">
                  <TriangleAlert size={13} /> 危险
                </Button>
                <Button variant="icon" aria-label="设置">
                  <Settings size={15} />
                </Button>
                <Button variant="primary" disabled>
                  <CircleAlert size={13} /> 禁用
                </Button>
                <button type="button" className="btn btn-fill">
                  <PaintBucket size={13} /> 描边填充
                </button>
                <button type="button" className="btn btn-press">
                  <MousePointerClick size={13} /> 按压反馈
                </button>
              </div>
            </section>

            <section className="gallery-section">
              <h3>表单 Form</h3>
              <div className="gallery-grid">
                <div className="demo-card">
                  <label className="field-label">输入框</label>
                  <div className="input-with-icon">
                    <Search size={13} />
                    <input className="input" placeholder="搜索模型…" />
                  </div>
                  <label className="field-label">选择</label>
                  <button type="button" className="select-like">
                    <span>
                      <Sliders size={12} /> {model.label}
                    </span>
                    <ChevronDown size={13} />
                  </button>
                </div>
                <div className="demo-card">
                  <div className="check-row">
                    <Checkbox
                      checked={demoCheck}
                      onChange={() => setDemoCheck((value) => !value)}
                    />
                    <span>记住这个工作区</span>
                  </div>
                  <div className="check-row">
                    <Switch
                      checked={demoSwitch}
                      onChange={() => setDemoSwitch((value) => !value)}
                    />
                    <span>自动压缩上下文</span>
                  </div>
                  <div className="check-row">
                    <Segmented
                      value={demoRadio}
                      onChange={setDemoRadio}
                      options={[
                        {
                          value: "fast",
                          label: "快",
                          icon: <Zap size={11} />,
                        },
                        {
                          value: "balanced",
                          label: "平衡",
                          icon: <Gauge size={11} />,
                        },
                        {
                          value: "deep",
                          label: "深",
                          icon: <Brain size={11} />,
                        },
                      ]}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="gallery-section">
              <h3>反馈 Feedback</h3>
              <div className="gallery-row">
                <Tag>默认</Tag>
                <Tag tone="mint">在线</Tag>
                <Tag tone="blue">模型</Tag>
                <Tag tone="amber">等待</Tag>
                <Tag tone="red">错误</Tag>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => notify("已保存到 Pi 配置", "models.json")}
                >
                  <Bell size={13} /> 触发 Toast
                </Button>
                <span className="ring" />
                <DotSpinner />
              </div>
              <div className="skeleton-stack">
                <span className="skeleton" style={{ width: "46%" }} />
                <span className="skeleton" style={{ width: "82%" }} />
                <span className="skeleton" style={{ width: "64%" }} />
              </div>
            </section>

            <section className="gallery-section">
              <h3>微交互 Micro</h3>
              <div className="gallery-row">
                <CopyButton text="const answer = 42;" />
                <Tooltip tip="极简淡入 Tooltip">
                  <button type="button" className="btn btn-secondary">
                    <Sparkles size={13} /> 悬停我
                  </button>
                </Tooltip>
                <span className="muted">
                  160–220ms · cubic-bezier(.2,.8,.2,1)
                </span>
              </div>
            </section>
          </div>
        </div>
      )}

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
        onOpenFolder={openExtensionsFolder}
        onTrustProject={trustProject}
      />

      <DialogPrimitive.Root
        open={sheetMode === "context"}
        onOpenChange={(open) => setSheetMode(open ? "context" : null)}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="rx-overlay" />
          <DialogPrimitive.Content
            className="sheet"
            tabIndex={-1}
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              (event.currentTarget as HTMLElement).focus();
            }}
          >
            <div className="sheet-head">
              <div>
                <DialogPrimitive.Title className="sheet-title">
                  上下文
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="sheet-desc">
                  模型、工作区、改动与扩展
                </DialogPrimitive.Description>
              </div>
              <DialogPrimitive.Close asChild>
                <Button variant="icon" aria-label="关闭">
                  <X size={15} />
                </Button>
              </DialogPrimitive.Close>
            </div>
            <ScrollAreaPrimitive.Root className="scroll-area">
              <ScrollAreaPrimitive.Viewport className="scroll-area-viewport">
                <div className="sheet-body context-sheet">
                  <ContextCards
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
                  />
                </div>
              </ScrollAreaPrimitive.Viewport>
              <ScrollAreaPrimitive.Scrollbar
                className="scroll-area-bar"
                orientation="vertical"
              >
                <ScrollAreaPrimitive.Thumb className="scroll-area-thumb" />
              </ScrollAreaPrimitive.Scrollbar>
              <ScrollAreaPrimitive.Corner />
            </ScrollAreaPrimitive.Root>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

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
      </div>
    </TooltipPrimitive.Provider>
  );
}
