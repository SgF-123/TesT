import {
  memo,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Brain,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  FileText,
  Pencil,
  RotateCcw,
  Wrench,
  X,
} from "lucide-react";
import { Button } from "./Button";
import { CopyButton } from "./CopyButton";
import { DotSpinner, LoadingRing } from "./Loading";
import {
  compactLine,
  fullValue,
  previewValue,
  toolTarget,
} from "./pi-utils";
import type { LiveThinking, LiveTool } from "./process-types";
import { reasoningStore } from "./stream-store";

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
                <LoadingRing /> 运行中
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

type ProcessItem = {
  id: string;
  kind: "tool" | "thinking";
  turnId?: string;
  title: string;
  summary: string;
  state: "running" | "done" | "error";
  meta?: string;
  startedAt: number;
  tool?: LiveTool;
  thinking?: string;
};

type RevertEditOperation = {
  path: string;
  edits: Array<{ oldText: string; newText: string }>;
};

type ActivityFileChange = {
  path: string;
  additions: number;
  deletions: number;
  patches: string[];
  revertOperations: RevertEditOperation[];
};

function objectValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function toolFilePath(tool: LiveTool) {
  const args = objectValue(tool.args);
  for (const key of ["path", "file_path", "file"]) {
    if (args && typeof args[key] === "string" && args[key]) {
      return String(args[key]);
    }
  }
  return "";
}

function diffCounts(diff: string) {
  let additions = 0;
  let deletions = 0;
  for (const line of diff.split(/\r?\n/)) {
    if (line.startsWith("+") && !line.startsWith("+++")) {
      additions += 1;
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      deletions += 1;
    }
  }
  return { additions, deletions };
}

function revertOperationForTool(
  tool: LiveTool,
): RevertEditOperation | null {
  if (tool.name !== "edit" || tool.state === "error") {
    return null;
  }
  const args = objectValue(tool.args);
  if (!args) {
    return null;
  }
  const path = toolFilePath(tool);
  if (!path) {
    return null;
  }
  const rawEdits = Array.isArray(args.edits)
    ? args.edits
    : typeof args.oldText === "string" &&
        typeof args.newText === "string"
      ? [{ oldText: args.oldText, newText: args.newText }]
      : [];
  const edits = rawEdits
    .map((item) => objectValue(item))
    .filter(
      (item): item is Record<string, unknown> =>
        Boolean(
          item &&
            typeof item.oldText === "string" &&
            typeof item.newText === "string",
        ),
    )
    .map((item) => ({
      oldText: String(item.oldText),
      newText: String(item.newText),
    }));
  return edits.length ? { path, edits } : null;
}

function collectActivityFiles(tools: LiveTool[]) {
  const files = new Map<string, ActivityFileChange>();
  const revertOperations: RevertEditOperation[] = [];
  let allRevertible = true;

  for (const tool of tools) {
    if (
      !["edit", "write"].includes(tool.name) ||
      tool.state === "error"
    ) {
      continue;
    }
    const path = toolFilePath(tool);
    if (!path) {
      continue;
    }

    const result = objectValue(tool.result);
    const details = objectValue(result?.details);
    const diff =
      typeof details?.diff === "string"
        ? details.diff
        : typeof details?.patch === "string"
          ? details.patch
          : "";
    const counted = diffCounts(diff);
    const args = objectValue(tool.args);
    const writeLines =
      tool.name === "write" && typeof args?.content === "string"
        ? args.content.split(/\r?\n/).length
        : 0;
    const current = files.get(path);
    if (current) {
      current.additions += counted.additions || writeLines;
      current.deletions += counted.deletions;
      if (diff) {
        current.patches.push(diff);
      }
    } else {
      files.set(path, {
        path,
        additions: counted.additions || writeLines,
        deletions: counted.deletions,
        patches: diff ? [diff] : [],
        revertOperations: [],
      });
    }

    const operation = revertOperationForTool(tool);
    if (operation) {
      files.get(path)?.revertOperations.push(operation);
      revertOperations.push(operation);
    } else {
      allRevertible = false;
    }
  }

  return {
    files: Array.from(files.values()),
    revertOperations,
    allRevertible,
  };
}

function toolProcessItem(tool: LiveTool): ProcessItem {
  return {
    id: tool.id,
    kind: "tool",
    turnId: tool.turnId,
    title: tool.name,
    summary: compactLine(toolTarget(tool)),
    state: tool.state,
    meta: tool.durationMs
      ? `${Math.max(1, Math.round(tool.durationMs))} ms`
      : undefined,
    startedAt: tool.startedAt,
    tool,
  };
}

function thinkingProcessItem(item: LiveThinking): ProcessItem {
  return {
    id: item.id,
    kind: "thinking",
    turnId: item.turnId,
    title: "思考",
    summary: compactLine(item.text, 180),
    state: item.state,
    startedAt: item.startedAt,
    thinking: item.text,
  };
}

function processStateText(item: ProcessItem) {
  if (item.state === "running") {
    return "运行中";
  }
  if (item.state === "error") {
    return "失败";
  }
  return item.meta || "完成";
}

const COMMAND_TOOL_NAMES = new Set([
  "bash",
  "shell",
  "exec",
  "powershell",
]);

function toolBlockText(block: unknown): string {
  if (typeof block === "string") {
    return block;
  }
  const record = objectValue(block);
  if (!record) {
    return block === undefined || block === null ? "" : fullValue(block);
  }
  if (record.type === "text") {
    return typeof record.text === "string" ? record.text : "";
  }
  if (record.type === "image") {
    const mime =
      typeof record.mimeType === "string" ? record.mimeType : "image";
    return `[${mime}]`;
  }
  if ("json" in record) {
    return fullValue(record.json);
  }
  if (typeof record.text === "string") {
    return record.text;
  }
  return fullValue(record);
}

function toolResultText(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }
  const record = objectValue(value);
  if (!record) {
    return fullValue(value);
  }
  if (Array.isArray(record.content)) {
    return record.content
      .map(toolBlockText)
      .filter((part) => part.length > 0)
      .join("\n");
  }
  if (typeof record.text === "string") {
    return record.text;
  }
  return fullValue(value);
}

function parseExitCode(text: string): number | null {
  const match = text.match(
    /(?:command\s+)?exit(?:ed\s+with)?\s*code[:\s]+(-?\d+)/i,
  );
  return match ? Number(match[1]) : null;
}

function stripCommandStatus(text: string) {
  const match = text.match(
    /\n*Command (?:exited with code -?\d+|terminated without an exit code)\s*$/i,
  );
  return match ? text.slice(0, match.index).trimEnd() : text.trimEnd();
}

function toolCommand(tool: LiveTool) {
  const args = objectValue(tool.args);
  return typeof args?.command === "string" ? args.command : "";
}

function isCommandTool(tool: LiveTool) {
  return COMMAND_TOOL_NAMES.has(tool.name) || Boolean(toolCommand(tool));
}

function commandOutput(tool: LiveTool) {
  const finalText =
    tool.result === undefined ? "" : toolResultText(tool.result);
  const liveText =
    tool.partial === undefined ? "" : toolResultText(tool.partial);
  return stripCommandStatus(finalText || liveText);
}

function toolExitCode(tool: LiveTool) {
  const result = objectValue(tool.result);
  const structured = objectValue(result?.structuredContent);
  if (typeof structured?.exit_code === "number") {
    return structured.exit_code;
  }
  if (typeof structured?.exitCode === "number") {
    return structured.exitCode;
  }
  return parseExitCode(
    `${toolResultText(tool.result)}\n${toolResultText(tool.partial)}`,
  );
}

type ToolFailure = {
  title: string;
  message: string;
  notes: string[];
  exitCode: number | null;
};

type ProcessFilter = "all" | "tool" | "thinking" | "error";

function describeToolFailure(
  tool: LiveTool,
  cwd?: string,
): ToolFailure | null {
  if (tool.state !== "error") {
    return null;
  }

  const command = toolCommand(tool);
  const output = `${toolResultText(tool.result)}\n${toolResultText(tool.partial)}`;
  const exitCode = toolExitCode(tool);
  const notes: string[] = [];
  const lower = output.toLowerCase();
  const isGitCommand = /\bgit(?:\.exe)?\b/i.test(command);
  const visibleCwd = cwd?.trim() || "";
  const suppressed =
    /(?:^|\s)2\s*>\s*(?:"?\/dev\/null"?(?=\s|$)|\$null\b|nul\b)/i.test(
      command,
    );
  const shortCircuited = command.includes("&&");

  if (suppressed) {
    notes.push(
      "命令把 stderr 重定向到了空设备，原始错误文本已经被丢弃。",
    );
  }
  if (shortCircuited) {
    notes.push("`&&` 串联命令在首个失败步骤后停止了，后续命令没有执行。");
  }

  if (
    isGitCommand &&
    (exitCode === 128 ||
      lower.includes("not a git repository") ||
      lower.includes("dubious ownership"))
  ) {
    if (lower.includes("dubious ownership")) {
      return {
        title: "Git 拒绝了当前仓库",
        message:
          "目录所有权与当前用户不一致。请把该目录加入 Git 的 safe.directory，再重试。",
        notes,
        exitCode,
      };
    }
    return {
      title: "Git 无法读取当前工作区",
      message: visibleCwd
        ? `当前工作区 ${visibleCwd} 不是 Git 仓库，或 .git 元数据无法访问。请切换到包含 .git 的项目目录，或先在目标目录执行 git init。`
        : "当前目录不是 Git 仓库，或 .git 元数据无法访问。请切换到包含 .git 的项目目录，或先执行 git init。",
      notes,
      exitCode,
    };
  }

  if (exitCode === 127) {
    return {
      title: "找不到命令",
      message: "命令或可执行文件不在 PATH 中，请检查工具是否已安装。",
      notes,
      exitCode,
    };
  }
  if (exitCode === 126) {
    return {
      title: "命令无法执行",
      message: "命令存在，但当前用户没有执行权限，或文件格式不受支持。",
      notes,
      exitCode,
    };
  }
  if (/timed out after/i.test(output)) {
    return {
      title: "命令执行超时",
      message: "命令在超时时间内没有结束，可以缩短命令范围或提高超时时间后重试。",
      notes,
      exitCode,
    };
  }

  const firstError = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) =>
      /(?:error|fatal|failed|not found|cannot|denied|exception)/i.test(line),
    );
  return {
    title: isCommandTool(tool) ? "命令执行失败" : "工具执行失败",
    message: firstError
      ? compactLine(firstError, 320)
      : "执行没有成功完成。展开原始调用与返回可查看完整诊断信息。",
    notes,
    exitCode,
  };
}

function toolArgumentRows(tool: LiveTool) {
  const args = objectValue(tool.args);
  if (!args) {
    return [];
  }
  return Object.entries(args)
    .filter(
      ([key, value]) =>
        value !== undefined &&
        value !== null &&
        !(isCommandTool(tool) && key === "command"),
    )
    .map(([key, value]) => ({
      key,
      value: compactLine(fullValue(value), 260),
    }));
}

const TOOL_ACTIVITY_LABELS: Record<string, string> = {
  read: "读取文件",
  write: "写入文件",
  edit: "编辑文件",
  bash: "运行命令",
  shell: "运行命令",
  exec: "运行命令",
  powershell: "运行命令",
  grep: "搜索内容",
  find: "查找文件",
  ls: "查看目录",
  list: "查看目录",
  web_search: "搜索网络",
  web_fetch: "读取网页",
  subagent: "运行子代理",
};

function processTitle(item: ProcessItem) {
  if (item.kind === "thinking") {
    return item.state === "running" ? "思考中" : "思考";
  }
  return TOOL_ACTIVITY_LABELS[item.title] || item.title;
}

function detailValue(value: unknown, limit = 32000) {
  const text = fullValue(value);
  if (text.length <= limit) {
    return text;
  }
  return `${text.slice(0, limit)}\n\n… 已截断 ${text.length - limit} 个字符`;
}

const ProcessActivity = memo(function ProcessActivity({
  item,
  open,
  onToggle,
  onClose,
  cwd,
}: {
  item: ProcessItem;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  cwd?: string;
}) {
  const tool = item.tool;
  const command = useMemo(() => (tool ? toolCommand(tool) : ""), [tool]);
  const output = useMemo(
    () => (tool ? commandOutput(tool) : ""),
    [tool],
  );
  const exitCode = useMemo(
    () => (tool ? toolExitCode(tool) : null),
    [tool],
  );
  const failure = useMemo(
    () => (tool ? describeToolFailure(tool, cwd) : null),
    [cwd, tool],
  );
  const argumentRows = useMemo(
    () => (tool && open ? toolArgumentRows(tool) : []),
    [open, tool],
  );
  const thinking = useMemo(
    () =>
      open && item.thinking
        ? detailValue(item.thinking)
        : "",
    [item.thinking, open],
  );

  return (
    <article
      className={`process-activity ${item.state} ${open ? "open" : ""}`}
    >
      <button
        type="button"
        className="process-activity-head"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span className={`process-activity-icon ${item.kind}`}>
          {item.kind === "tool" ? (
            <Wrench size={12} />
          ) : (
            <Brain size={12} />
          )}
        </span>
        <span className="process-activity-copy">
          <b>{processTitle(item)}</b>
          {item.summary && item.summary !== item.title && (
            <small title={item.summary}>{item.summary}</small>
          )}
        </span>
        <span className={`process-activity-state ${item.state}`}>
          {item.state === "running" ? (
            <>
              <LoadingRing size={9} /> 运行中
            </>
          ) : item.state === "error" ? (
            <>
              <CircleAlert size={10} />{" "}
              {exitCode === null ? "失败" : `退出码 ${exitCode}`}
            </>
          ) : (
            processStateText(item)
          )}
        </span>
        <ChevronRight size={13} className="process-activity-chev" />
      </button>
      {open && (
        <div className="process-activity-content">
          <div className="process-detail-bar">
            <span>详情</span>
            <button type="button" onClick={onClose}>
              <X size={11} /> 收起
            </button>
          </div>
          {item.kind === "thinking" ? (
            <pre className="process-detail-code thinking">{thinking}</pre>
          ) : (
            <>
              {failure && (
                <div className="process-error-callout" role="status">
                  <div className="process-error-title">
                    <CircleAlert size={14} />
                    <b>{failure.title}</b>
                    {failure.exitCode !== null && (
                      <span>退出码 {failure.exitCode}</span>
                    )}
                  </div>
                  <p>{failure.message}</p>
                  {failure.notes.length > 0 && (
                    <ul>
                      {failure.notes.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {command && (
                <section className="process-detail-section">
                  <div className="process-detail-heading">
                    <span>命令</span>
                    <CopyButton text={command} />
                  </div>
                  <div className="process-command-block">
                    <span aria-hidden="true">$</span>
                    <code>{command}</code>
                  </div>
                </section>
              )}

              {output && (
                <section className="process-detail-section">
                  <div className="process-detail-heading">
                    <span>输出</span>
                    <div className="process-output-actions">
                      <small>{output.split(/\r?\n/).length} 行</small>
                      <CopyButton text={output} />
                    </div>
                  </div>
                  <pre
                    className={`process-detail-code terminal ${failure ? "error" : ""}`}
                  >
                    {output}
                  </pre>
                </section>
              )}

              {argumentRows.length > 0 && (
                <section className="process-detail-section">
                  <div className="process-detail-heading">
                    <span>调用参数</span>
                  </div>
                  <div className="process-argument-list">
                    {argumentRows.map((row) => (
                      <div className="process-argument-row" key={row.key}>
                        <code>{row.key}</code>
                        <span title={row.value}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {(tool?.args !== undefined ||
                tool?.result !== undefined ||
                tool?.partial !== undefined) && (
                <details className="process-raw-details">
                  <summary>
                    <ChevronRight size={11} />
                    原始调用与返回
                  </summary>
                  <div>
                    {tool?.args !== undefined && (
                      <section>
                        <span>参数</span>
                        <pre>{detailValue(tool.args)}</pre>
                      </section>
                    )}
                    {tool?.partial !== undefined && (
                      <section>
                        <span>实时输出</span>
                        <pre>{detailValue(tool.partial)}</pre>
                      </section>
                    )}
                    {tool?.result !== undefined && (
                      <section>
                        <span>结果</span>
                        <pre>{detailValue(tool.result)}</pre>
                      </section>
                    )}
                  </div>
                </details>
              )}

              {!failure &&
                !command &&
                !output &&
                argumentRows.length === 0 &&
                tool?.args === undefined &&
                tool?.result === undefined && (
                  <div className="process-detail-empty">暂无详细记录</div>
                )}
            </>
          )}
        </div>
      )}
    </article>
  );
});

const ProcessRail = memo(function ProcessRail({
  tools,
  thinking,
  active,
  cwd,
  focusTurn,
  onNotify,
}: {
  tools: LiveTool[];
  thinking: LiveThinking[];
  active: boolean;
  cwd?: string;
  focusTurn?: { id: string; number: number } | null;
  onNotify: (title: string, desc?: string) => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [filesOpen, setFilesOpen] = useState(true);
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());
  const [reverting, setReverting] = useState(false);
  const [reverted, setReverted] = useState(false);
  const [filter, setFilter] = useState<ProcessFilter>("all");
  useEffect(() => {
    setReverted(false);
    setFilesOpen(true);
  }, [focusTurn?.id]);
  const liveReasoning = useSyncExternalStore(
    reasoningStore.subscribe,
    reasoningStore.getSnapshot,
    reasoningStore.getSnapshot,
  );
  const items = useMemo(() => {
    const list = [
      ...thinking.map(thinkingProcessItem),
      ...tools.map(toolProcessItem),
    ];
    return list.sort((a, b) => a.startedAt - b.startedAt);
  }, [thinking, tools]);
  const focusTools = useMemo(
    () =>
      focusTurn
        ? tools.filter((tool) => tool.turnId === focusTurn.id)
        : tools,
    [focusTurn, tools],
  );
  const fileData = useMemo(
    () => collectActivityFiles(focusTools),
    [focusTools],
  );
  const allFileData = useMemo(() => collectActivityFiles(tools), [tools]);

  const liveItem: ProcessItem | null = liveReasoning.trim()
    ? {
        id: "live-reasoning",
        kind: "thinking",
        title: "思考中",
        summary: compactLine(liveReasoning, 180),
        state: "running",
        startedAt: Number.MAX_SAFE_INTEGER,
        thinking: liveReasoning,
      }
    : null;
  const allItems = liveItem ? [...items, liveItem] : items;
  const focusItems = focusTurn
    ? allItems.filter((item) => item.turnId === focusTurn.id)
    : [];
  const summaryItems = focusTurn ? focusItems : allItems;
  const toolCount = allItems.filter((item) => item.kind === "tool").length;
  const thinkingCount = allItems.filter(
    (item) => item.kind === "thinking",
  ).length;
  const summaryToolCount = summaryItems.filter(
    (item) => item.kind === "tool",
  ).length;
  const summaryThinkingCount = summaryItems.filter(
    (item) => item.kind === "thinking",
  ).length;
  const errorCount = allItems.filter((item) => item.state === "error").length;
  const summaryErrorCount = summaryItems.filter(
    (item) => item.state === "error",
  ).length;
  const visibleItems = allItems.filter((item) => {
    if (filter === "tool") {
      return item.kind === "tool";
    }
    if (filter === "thinking") {
      return item.kind === "thinking";
    }
    if (filter === "error") {
      return item.state === "error";
    }
    return true;
  });
  const allVisibleOpen =
    visibleItems.length > 0 &&
    visibleItems.every((item) => openIds.has(item.id));
  const fileChanges = fileData.files;
  const allFileChanges = allFileData.files;
  const changedAdditions = fileChanges.reduce(
    (sum, file) => sum + file.additions,
    0,
  );
  const changedDeletions = fileChanges.reduce(
    (sum, file) => sum + file.deletions,
    0,
  );
  const canUndo =
    Boolean(cwd) &&
    fileChanges.length > 0 &&
    fileData.allRevertible &&
    !reverted &&
    !reverting;

  if (!allItems.length && !active) {
    return null;
  }

  const toggleItem = (id: string) => {
    setOpenIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  const openDetails = () => {
    const firstError = allItems.find((item) => item.state === "error");
    if (!detailsOpen && openIds.size === 0 && firstError) {
      setOpenIds(new Set([firstError.id]));
    }
    setDetailsOpen(true);
  };
  const toggleVisibleItems = () => {
    const ids = new Set(visibleItems.map((item) => item.id));
    setOpenIds((previous) => {
      if (allVisibleOpen) {
        return new Set([...previous].filter((id) => !ids.has(id)));
      }
      return new Set([...previous, ...ids]);
    });
  };
  const undoEdits = async () => {
    if (!canUndo || !cwd || !window.tesT?.revertToolEdits) {
      return;
    }
    setReverting(true);
    try {
      const result = await window.tesT.revertToolEdits({
        cwd,
        operations: fileData.revertOperations,
      });
      if (result?.error) {
        onNotify("撤销失败", result.error);
        return;
      }
      setReverted(true);
      onNotify(
        "已撤销编辑",
        `${result?.files?.length || fileChanges.length} 个文件`,
      );
    } catch (error) {
      onNotify("撤销失败", String(error));
    } finally {
      setReverting(false);
    }
  };

  return (
    <>
      <section
        className={`activity-summary-card ${summaryErrorCount ? "has-error" : ""}`}
      >
        <div className="activity-summary-main">
          <span className="activity-summary-icon">
            {active ? (
              <DotSpinner size={17} />
            ) : summaryErrorCount ? (
              <CircleAlert size={13} />
            ) : fileChanges.length ? (
              <Pencil size={13} />
            ) : (
              <Wrench size={13} />
            )}
          </span>
          <span className="activity-summary-copy">
            <b>
              {fileChanges.length
                ? focusTurn
                  ? `#${focusTurn.number} · 本轮改动 ${fileChanges.length} 个文件`
                  : `已编辑 ${fileChanges.length} 个文件`
                : active
                  ? "正在执行"
                  : focusTurn && summaryItems.length === 0
                    ? "本轮无工具操作"
                    : `执行了 ${allItems.length} 个操作`}
            </b>
            <small>
              {reverted ? (
                <span className="activity-reverted">已撤销</span>
              ) : fileChanges.length ? (
                <>
                  <span className="activity-add">
                    +{changedAdditions}
                  </span>
                  <span className="activity-del">
                    -{changedDeletions}
                  </span>
                  <span>
                    {summaryToolCount} 个工具 · {summaryThinkingCount} 次思考
                  </span>
                </>
              ) : (
                <>
                  {summaryToolCount} 个工具 · {summaryThinkingCount} 次思考
                  {active
                    ? " · 正在处理"
                    : summaryErrorCount
                      ? ""
                      : " · 已完成"}
                </>
              )}
              {summaryErrorCount > 0 && (
                <>
                  <span aria-hidden="true"> · </span>
                  <span className="activity-error-count">
                    <CircleAlert size={9} />
                    {summaryErrorCount} 个失败
                  </span>
                </>
              )}
            </small>
          </span>
          <div className="activity-summary-actions">
            {canUndo && (
              <button
                type="button"
                onClick={() => void undoEdits()}
                disabled={reverting}
              >
                <RotateCcw size={11} />
                {reverting ? "撤销中" : "撤销"}
              </button>
            )}
            <button
              type="button"
              className="primary"
              onClick={openDetails}
            >
              {fileChanges.length ? "查看变更" : "查看详情"}
              <ChevronRight size={11} />
            </button>
            {fileChanges.length > 0 && (
              <button
                type="button"
                className="icon"
                aria-label={filesOpen ? "收起文件列表" : "展开文件列表"}
                onClick={() => setFilesOpen((value) => !value)}
              >
                {filesOpen ? (
                  <ChevronUp size={13} />
                ) : (
                  <ChevronDown size={13} />
                )}
              </button>
            )}
          </div>
        </div>
        {fileChanges.length > 0 && filesOpen && (
          <div className="activity-file-list">
            {fileChanges.map((file) => (
              <button
                type="button"
                className="activity-file-row"
                key={file.path}
                title={file.path}
                onClick={openDetails}
              >
                <FileText size={12} />
                <span>{file.path}</span>
                <small className="activity-add">
                  +{file.additions}
                </small>
                <small className="activity-del">
                  -{file.deletions}
                </small>
              </button>
            ))}
          </div>
        )}
      </section>

      <DialogPrimitive.Root
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open);
          if (!open) {
            setOpenIds(new Set());
            setFilter("all");
          }
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="rx-overlay" />
          <DialogPrimitive.Content className="dialog activity-dialog">
            <div className="dialog-head">
              <div>
                <DialogPrimitive.Title className="dialog-title">
                  执行详情
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="activity-dialog-meta">
                  <span>
                    <Wrench size={10} />
                    {toolCount} 个工具
                  </span>
                  <span>
                    <Brain size={10} />
                    {thinkingCount} 次思考
                  </span>
                  {errorCount > 0 && (
                    <span className="error">
                      <CircleAlert size={10} />
                      {errorCount} 个失败
                    </span>
                  )}
                  {cwd && (
                    <code title={cwd} className="activity-dialog-cwd">
                      {cwd}
                    </code>
                  )}
                </DialogPrimitive.Description>
              </div>
              <DialogPrimitive.Close asChild>
                <Button variant="icon" aria-label="关闭">
                  <X size={15} />
                </Button>
              </DialogPrimitive.Close>
            </div>
            <div className="activity-dialog-body">
              {allFileChanges.some((file) => file.patches.length > 0) && (
                <section className="activity-change-preview">
                  <div className="activity-section-title">文件变更</div>
                  {allFileChanges
                    .filter((file) => file.patches.length > 0)
                    .map((file) => (
                      <details className="activity-diff" key={file.path}>
                        <summary>
                          <FileText size={12} />
                          <code>{file.path}</code>
                          <span className="activity-add">
                            +{file.additions}
                          </span>
                          <span className="activity-del">
                            -{file.deletions}
                          </span>
                          <ChevronRight size={12} />
                        </summary>
                        <pre>{file.patches.join("\n\n")}</pre>
                      </details>
                    ))}
                </section>
              )}
              {allItems.length ? (
                <>
                  <div className="activity-process-toolbar">
                    <div
                      className="activity-filter-group"
                      aria-label="筛选执行步骤"
                    >
                      {(
                        [
                          ["all", "全部", allItems.length],
                          ["tool", "工具", toolCount],
                          ["thinking", "思考", thinkingCount],
                          ...(errorCount
                            ? [["error", "失败", errorCount] as const]
                            : []),
                        ] as const
                      ).map(([value, label, count]) => (
                        <button
                          type="button"
                          className={filter === value ? "active" : ""}
                          aria-pressed={filter === value}
                          onClick={() => setFilter(value)}
                          key={value}
                        >
                          {label}
                          <span>{count}</span>
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="activity-expand-all"
                      onClick={toggleVisibleItems}
                    >
                      {allVisibleOpen ? "全部收起" : "全部展开"}
                    </button>
                  </div>
                  <div className="process-list activity-process-list">
                    {visibleItems.map((item) => (
                      <ProcessActivity
                        key={item.id}
                        item={item}
                        cwd={cwd}
                        open={openIds.has(item.id)}
                        onToggle={() => toggleItem(item.id)}
                        onClose={() =>
                          setOpenIds((previous) => {
                            const next = new Set(previous);
                            next.delete(item.id);
                            return next;
                          })
                        }
                      />
                    ))}
                    {!visibleItems.length && (
                      <div className="process-detail-empty">
                        没有符合筛选的步骤
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="process-detail-empty">Pi 正在思考…</div>
              )}
            </div>
            <div className="dialog-foot">
              <span className="muted">
                失败步骤会自动展开；输出与原始数据可分别复制。
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
    </>
  );
});

export { ProcessRail, ToolCard };
