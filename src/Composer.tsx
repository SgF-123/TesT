import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ComponentProps,
  type Dispatch,
  type DragEvent,
  type RefObject,
  type SetStateAction,
} from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import {
  Brain,
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  FolderPlus,
  Gauge,
  Image as ImageIcon,
  Settings,
  X,
  Zap,
} from "lucide-react";
import {
  ArrowUp as ArrowUpNode,
  Brain as BrainNode,
  Check as CheckNode,
  FileText as FileTextNode,
  Gauge as GaugeNode,
  ListChecks as ListChecksNode,
  Paperclip as PaperclipNode,
  Play as PlayNode,
  Square as SquareNode,
  Zap as ZapNode,
} from "lucide";
import { MorphIcon } from "morphicons/react";
import type { DraftAnnotation } from "./annotations";
import {
  AnnotationStrip,
  ExtensionStrip,
} from "./ComposerExtras";
import type { ContextAttachment, SlashCommand } from "./composer-types";
import type { DraftStore } from "./draft-store";
import { formatBytes } from "./format";
import { formatTokenCount } from "./usage";
import QueuePanel from "./QueuePanel";
import type { Model } from "./settings-config";
import { Tag } from "./Tag";

type ComposerEditor = {
  draftStore: DraftStore;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  inputRef: RefObject<HTMLInputElement | null>;
};

type ComposerExtras = {
  extensionStatuses: Record<string, string>;
  extensionWidgets: Record<string, { lines: string[] }>;
  annotations: DraftAnnotation[];
  setAnnotations: Dispatch<SetStateAction<DraftAnnotation[]>>;
  onLocateAnnotation: (messageId: string) => void;
};

type ComposerContext = {
  files: ContextAttachment[];
  onFiles: (files: FileList | null) => Promise<void>;
  onDrop: (event: DragEvent<HTMLDivElement>) => Promise<void>;
  onRemove: (id: string) => void;
  onReorder: (sourceId: string, targetId: string) => void;
  onPickFolder: () => Promise<void>;
  onReadBrowserFiles: (files: File[]) => Promise<void>;
};

type ComposerAutocomplete = {
  commands: SlashCommand[];
  bridge: typeof window.tesT;
  isShell: boolean;
  workspaceCwd: string;
  draftKey: string;
};

type ComposerMenus = {
  model: Model;
  availableModels: Model[];
  modelOpen: boolean;
  setModelOpen: Dispatch<SetStateAction<boolean>>;
  onSelectModel: (model: Model) => void;
  onOpenModelsSettings: () => void;
  reasoning: string;
  reasoningOpen: boolean;
  setReasoningOpen: Dispatch<SetStateAction<boolean>>;
  thinkingLevels: string[];
  onReasoningChange: (value: string) => void;
};

type ComposerStatus = {
  planMode: boolean;
  onTogglePlanMode: () => void;
  pending: boolean;
  streamActive: boolean;
  interrupted: boolean;
  compacting: boolean;
  contextUsed: number | null;
  contextLimit: number | null;
};

type ComposerActions = {
  send: () => void;
  stop: () => void;
  continueRun: () => void;
};

type ComposerProps = {
  editor: ComposerEditor;
  extras: ComposerExtras;
  context: ComposerContext;
  autocomplete: ComposerAutocomplete;
  menus: ComposerMenus;
  status: ComposerStatus;
  actions: ComposerActions;
  queue: ComponentProps<typeof QueuePanel>;
};

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

export function Composer({
  editor,
  extras,
  context,
  autocomplete,
  menus,
  status,
  actions,
  queue,
}: ComposerProps) {
  const { draftStore, textareaRef, inputRef } = editor;
  const draft = useSyncExternalStore(
    draftStore.subscribe,
    draftStore.getSnapshot,
  );
  const setDraft = draftStore.update;
  const {
    extensionStatuses,
    extensionWidgets,
    annotations,
    setAnnotations,
    onLocateAnnotation,
  } = extras;
  const {
    files: contextFiles,
    onFiles,
    onDrop,
    onRemove,
    onReorder,
    onPickFolder,
    onReadBrowserFiles,
  } = context;
  const {
    commands,
    bridge,
    isShell,
    workspaceCwd,
    draftKey,
  } = autocomplete;
  const {
    model,
    availableModels,
    modelOpen,
    setModelOpen,
    onSelectModel,
    onOpenModelsSettings,
    reasoning,
    reasoningOpen,
    setReasoningOpen,
    thinkingLevels,
    onReasoningChange,
  } = menus;
  const {
    planMode,
    onTogglePlanMode,
    pending,
    streamActive,
    interrupted,
    compacting,
    contextUsed,
    contextLimit,
  } = status;
  const { send, stop, continueRun } = actions;

  const [contextDrag, setContextDrag] = useState(false);
  const [draggedContextId, setDraggedContextId] = useState<string | null>(null);
  const [slashIndex, setSlashIndex] = useState(0);
  const [slashDismissed, setSlashDismissed] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionDismissed, setMentionDismissed] = useState(false);
  const [workspaceFiles, setWorkspaceFiles] = useState<
    { path: string; name: string; size: number }[]
  >([]);
  const [workspaceFilesLoading, setWorkspaceFilesLoading] = useState(false);
  const composerComposingRef = useRef(false);
  const composerCompositionEndAtRef = useRef(0);
  const slashItemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const mentionItemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const slashMatch = /^\/([^\s]*)$/.exec(draft);
  const slashOpen = Boolean(slashMatch) && !slashDismissed;
  const slashQuery = (slashMatch?.[1] ?? "").toLowerCase();
  const filteredSlash = commands.filter(
    (command) =>
      command.name.startsWith(slashQuery) ||
      command.label.toLowerCase().includes(slashQuery),
  );
  const mentionMatch = /(?:^|\s)@([^\s@]*)$/.exec(draft);
  const mentionOpen = Boolean(mentionMatch) && !mentionDismissed;
  const mentionQuery = (mentionMatch?.[1] ?? "").toLowerCase();
  const filteredMentions = mentionQuery
    ? workspaceFiles
        .filter((file) => file.path.toLowerCase().includes(mentionQuery))
        .slice(0, 40)
    : workspaceFiles.slice(0, 40);

  useEffect(() => {
    setSlashIndex(0);
  }, [slashQuery]);

  useEffect(() => {
    setMentionIndex(0);
  }, [mentionQuery]);

  useEffect(() => {
    if (!slashOpen) {
      return;
    }
    slashItemRefs.current[slashIndex]?.scrollIntoView({
      block: "nearest",
    });
  }, [slashIndex, slashOpen, slashQuery]);

  useEffect(() => {
    if (!mentionOpen) {
      return;
    }
    mentionItemRefs.current[mentionIndex]?.scrollIntoView({
      block: "nearest",
    });
  }, [mentionIndex, mentionOpen, mentionQuery]);

  useEffect(() => {
    setWorkspaceFiles([]);
  }, [workspaceCwd]);

  useEffect(() => {
    setMentionDismissed(true);
  }, [draftKey]);

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
      .listFiles({ cwd: workspaceCwd })
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
  }, [mentionOpen, isShell, bridge, workspaceCwd, workspaceFiles.length]);

  const insertMention = (path: string) => {
    const index = draft.lastIndexOf("@");
    const before = index >= 0 ? draft.slice(0, index) : draft;
    setDraft(`${before}@${path} `);
    setMentionDismissed(true);
    textareaRef.current?.focus();
  };

  const composerState =
    interrupted && !draft.trim() && contextFiles.length === 0
      ? "continue"
      : pending || streamActive
        ? "stop"
        : "send";
  const contextPercent =
    contextUsed != null && contextLimit
      ? Math.min(100, Math.round((contextUsed / contextLimit) * 100))
      : null;
  const composerIcon =
    composerState === "stop"
      ? SquareNode
      : composerState === "continue"
        ? PlayNode
        : ArrowUpNode;
  const reasoningIcon =
    reasoning === "low"
      ? GaugeNode
      : reasoning === "medium"
        ? ZapNode
        : BrainNode;
  const needsModel = isShell && !model.id;
  const composerDisabled =
    composerState === "send" &&
    (needsModel || (!draft.trim() && contextFiles.length === 0));
  const composerAction =
    composerState === "stop"
      ? stop
      : composerState === "continue"
        ? continueRun
        : send;

  return (
    <div className="composer-wrap">
      <ExtensionStrip statuses={extensionStatuses} widgets={extensionWidgets} />
      <AnnotationStrip
        annotations={annotations}
        onClear={() => setAnnotations([])}
        onRemove={(id) =>
          setAnnotations((previous) =>
            previous.filter((item) => item.id !== id),
          )
        }
        onLocate={onLocateAnnotation}
      />
      <div
        className={`composer ${contextDrag ? "is-dragging" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setContextDrag(true);
        }}
        onDragLeave={(event) => {
          if (
            !event.currentTarget.contains(event.relatedTarget as Node | null)
          ) {
            setContextDrag(false);
          }
        }}
        onDrop={(event) => {
          setContextDrag(false);
          void onDrop(event);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={(event) => {
            void onFiles(event.target.files);
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
                  onReorder(
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
                  onClick={() => onRemove(file.id)}
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
                      ? Math.ceil((file.text?.length || 0) / 4)
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
                  ref={(node) => {
                    mentionItemRefs.current[index] = node;
                  }}
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
                    <span className="slash-label">{file.path}</span>
                    <span className="slash-desc">
                      {formatBytes(file.size)}
                    </span>
                  </span>
                  <code>@</code>
                </button>
              ))}
              {!workspaceFilesLoading && filteredMentions.length === 0 && (
                <div className="slash-empty">没有匹配的文件</div>
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
                  ref={(node) => {
                    slashItemRefs.current[index] = node;
                  }}
                  role="option"
                  aria-selected={index === slashIndex}
                  className={`slash-item ${
                    index === slashIndex ? "active" : ""
                  }`}
                  onMouseEnter={() => setSlashIndex(index)}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    setDraft("");
                    setSlashDismissed(true);
                    command.run();
                    textareaRef.current?.focus();
                  }}
                >
                  <span className="slash-icon">{command.icon}</span>
                  <span className="slash-main">
                    <span className="slash-label">{command.label}</span>
                    <span className="slash-desc">{command.desc}</span>
                  </span>
                  <code>{command.tag ?? `/${command.name}`}</code>
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
          ref={textareaRef}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setSlashDismissed(false);
            setMentionDismissed(false);
          }}
          onCompositionStart={() => {
            composerComposingRef.current = true;
          }}
          onCompositionEnd={() => {
            composerComposingRef.current = false;
            composerCompositionEndAtRef.current = Date.now() + 60;
          }}
          onBlur={() => setSlashDismissed(true)}
          onPaste={(event) => {
            const pastedFiles = Array.from(
              event.clipboardData?.files || [],
            ).filter((file) => file.type.startsWith("image/"));
            if (pastedFiles.length > 0) {
              event.preventDefault();
              void onReadBrowserFiles(pastedFiles);
            }
          }}
          onKeyDown={(event) => {
            if (
              event.nativeEvent.isComposing ||
              event.keyCode === 229 ||
              composerComposingRef.current ||
              Date.now() < composerCompositionEndAtRef.current
            ) {
              return;
            }
            if (mentionOpen) {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setMentionIndex((index) =>
                  Math.min(
                    index + 1,
                    Math.max(0, filteredMentions.length - 1),
                  ),
                );
                return;
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setMentionIndex((index) => Math.max(index - 1, 0));
                return;
              }
              if (
                event.key === "Tab" ||
                (event.key === "Enter" && !event.shiftKey)
              ) {
                const file =
                  filteredMentions[mentionIndex] ?? filteredMentions[0];
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
                setSlashIndex((index) => Math.max(index - 1, 0));
                return;
              }
              if (
                event.key === "Tab" ||
                (event.key === "Enter" && !event.shiftKey)
              ) {
                const command =
                  filteredSlash[slashIndex] ?? filteredSlash[0];
                if (command) {
                  event.preventDefault();
                  setDraft("");
                  setSlashDismissed(true);
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
              if (needsModel) {
                onOpenModelsSettings();
                return;
              }
              send();
            }
          }}
          aria-label="给 Pi 发送消息"
          placeholder="给 Pi 发送消息，或输入 / 查看命令…"
          rows={2}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
        />

        {needsModel && (
          <button
            type="button"
            className="composer-model-required"
            onClick={onOpenModelsSettings}
          >
            <span className="composer-model-required-icon">
              <Settings size={12} />
            </span>
            <span>
              <b>还差一步</b>
              选择默认模型后才能发送
            </span>
            <ChevronRight size={12} />
          </button>
        )}

        <div className="composer-bar">
          <div className="composer-tools">
            <button
              type="button"
              className={`pill plan-pill ${
                planMode ? "is-active" : "subtle"
              }`}
              onClick={onTogglePlanMode}
              aria-pressed={planMode}
              title={
                planMode
                  ? "计划模式：Pi 会先给方案"
                  : "开启计划模式：先出方案，确认后执行"
              }
            >
              <MorphIcon
                icon={planMode ? ListChecksNode : FileTextNode}
                size={12}
                strokeWidth={2.15}
                spring="snappy"
                reducedMotion="user"
                className="pill-glyph"
                aria-hidden="true"
              />
              <span>{planMode ? "计划中" : "计划"}</span>
            </button>
            <PopoverPrimitive.Root open={modelOpen} onOpenChange={setModelOpen}>
              <PopoverPrimitive.Trigger asChild>
                <button
                  type="button"
                  className={`pill model-pill ${modelOpen ? "is-open" : ""}`}
                >
                  <span className={`model-dot ${model.id ? "" : "off"}`} />
                  <span>{model.short}</span>
                  <ChevronDown size={11} className="pill-chevron" />
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
                        <button
                          type="button"
                          className="menu-item"
                          onClick={() => {
                            setModelOpen(false);
                            onOpenModelsSettings();
                          }}
                        >
                          <span className="provider-mark ghost">
                            <Settings size={12} />
                          </span>
                          <span className="m-main">
                            <span className="m-name">未配置模型</span>
                            <span className="m-meta">
                              在设置或 models.json 中添加
                            </span>
                          </span>
                          <ChevronRight size={12} />
                        </button>
                      )}
                      {availableModels.map((item) => (
                        <button
                          type="button"
                          key={item.id}
                          className={`menu-item ${
                            item.id === model.id ? "active" : ""
                          }`}
                          onClick={() => {
                            onSelectModel(item);
                            setModelOpen(false);
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
                          {item.badge && <Tag tone="blue">{item.badge}</Tag>}
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
                <button
                  type="button"
                  className={`pill reasoning-pill ${
                    reasoningOpen ? "is-open" : ""
                  }`}
                  title={`推理强度：${thinkingLabel(reasoning)}`}
                >
                  <MorphIcon
                    icon={reasoningIcon}
                    size={12}
                    strokeWidth={2.1}
                    spring="smooth"
                    reducedMotion="user"
                    className="pill-glyph"
                    aria-hidden="true"
                  />
                  <span>{thinkingLabel(reasoning)}</span>
                  <ChevronDown size={11} className="pill-chevron" />
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
                      if (!value) {
                        return;
                      }
                      onReasoningChange(value);
                      setReasoningOpen(false);
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

            <button
              type="button"
              className={`pill ${
                contextFiles.length > 0 ? "is-active" : "subtle"
              }`}
              onClick={() => inputRef.current?.click()}
              title="添加文件或图片作为上下文，也可以直接拖进来"
            >
              <MorphIcon
                icon={
                  contextFiles.length > 0 ? CheckNode : PaperclipNode
                }
                size={12}
                strokeWidth={2.1}
                spring="smooth"
                reducedMotion="user"
                className="pill-glyph"
                aria-hidden="true"
              />
              {contextFiles.length > 0
                ? `上下文 ${contextFiles.length}`
                : "添加上下文"}
            </button>
            <button
              type="button"
              className="pill subtle"
              onClick={() => void onPickFolder()}
              title="添加整个文件夹，最多读取 40 个文本文件"
            >
              <FolderPlus size={12} />
              文件夹
            </button>
          </div>
          <div className="composer-right">
            <QueuePanel {...queue} />
            {compacting && (
              <span className="queue-pill compacting">压缩中…</span>
            )}
            <span className="composer-hint" aria-hidden="true">
              <kbd>Enter</kbd> 发送
              <span>·</span>
              <kbd>Shift</kbd> + <kbd>Enter</kbd> 换行
            </span>
            <span
              className={`ctx-meter ${
                contextPercent == null
                  ? "is-empty"
                  : contextPercent >= 80
                    ? "is-high"
                    : contextPercent >= 60
                      ? "is-warm"
                      : ""
              }`}
              style={
                {
                  "--ctx-progress": `${contextPercent ?? 0}%`,
                } as CSSProperties
              }
              title={
                contextPercent == null
                  ? "上下文用量未知"
                  : `上下文用量 ${contextPercent}% · ${formatTokenCount(
                      contextUsed ?? 0,
                    )} / ${formatTokenCount(contextLimit ?? 0)}`
              }
              aria-label={
                contextPercent == null
                  ? "上下文用量未知"
                  : `上下文用量 ${contextPercent}%`
              }
            >
              <span className="ctx-meter-ring" aria-hidden="true" />
              <span>
                {contextPercent == null ? "—" : `${contextPercent}%`}
              </span>
            </span>
            <button
              type="button"
              className={`send-btn ${composerState}`}
              onClick={composerAction}
              disabled={composerDisabled}
              title={
                needsModel
                  ? "先配置模型"
                  : composerDisabled
                  ? "输入内容后发送"
                  : composerState === "stop"
                    ? "停止生成"
                    : composerState === "continue"
                      ? "继续生成"
                      : "发送"
              }
              aria-label={
                needsModel
                  ? "先配置模型"
                  : composerState === "stop"
                  ? "停止生成"
                  : composerState === "continue"
                    ? "继续生成"
                    : "发送"
              }
            >
              <span className="send-action" aria-hidden="true">
                <span className="send-halo" />
                <MorphIcon
                  icon={composerIcon}
                  size={14}
                  strokeWidth={2.4}
                  spring={
                    composerState === "stop"
                      ? "snappy"
                      : composerState === "continue"
                        ? "bouncy"
                        : "smooth"
                  }
                  reducedMotion="user"
                  className="send-glyph"
                />
              </span>
              <span className="send-label">
                {composerState === "stop"
                  ? "停止"
                  : composerState === "continue"
                    ? "继续"
                    : "发送"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
