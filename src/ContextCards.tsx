import * as SelectPrimitive from "@radix-ui/react-select";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Cpu,
  FileText,
  FolderOpen,
  GitBranch,
  Plus,
  RotateCcw,
} from "lucide-react";
import type { GitChange } from "./git-types";
import { Progress } from "./Progress";
import type { Model } from "./settings-config";
import { Tag } from "./Tag";
import {
  formatCost,
  formatTokenCount,
  messageCount,
  type SessionStats,
} from "./usage";

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
  onConfigureModel,
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
  onConfigureModel?: () => void;
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
          {!model.id && onConfigureModel && (
            <button
              type="button"
              className="ctx-configure"
              onClick={onConfigureModel}
              aria-label="配置模型"
            >
              配置
            </button>
          )}
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

export default ContextCards;
