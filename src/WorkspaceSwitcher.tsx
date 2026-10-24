import {
  Check,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderPlus,
  GitBranch,
  GitMerge,
  MessagesSquare,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

export type WorkspaceWorktree = {
  path: string;
  branch: string;
  changes?: number;
  ahead?: number;
  behind?: number;
};

type WorkspaceSwitcherProps = {
  open: boolean;
  cwd: string;
  scratch: boolean;
  recent: string[];
  repo: boolean;
  worktrees: WorkspaceWorktree[];
  worktreeBusy: boolean;
  pendingWorktreePath: string;
  pendingWorktreeMerge: string;
  mergeConflict: boolean;
  mergeConflicts: string[];
  onOpenChange: (open: boolean) => void;
  onSelect: (path: string) => void;
  onChoose: () => void;
  onCreateWorktree: () => void;
  onRemoveWorktree: (item: WorkspaceWorktree) => void;
  onMergeWorktree: (item: WorkspaceWorktree) => void;
  onAbortMerge: () => void;
  onContinueMerge: () => void;
};

function workspaceLabel(value: string) {
  const clean = String(value || "").replace(/[\\/]+$/, "");
  return clean.split(/[\\/]/).pop() || clean || "工作区";
}

export function WorkspaceSwitcher({
  open,
  cwd,
  scratch,
  recent,
  repo,
  worktrees,
  worktreeBusy,
  pendingWorktreePath,
  pendingWorktreeMerge,
  mergeConflict,
  mergeConflicts,
  onOpenChange,
  onSelect,
  onChoose,
  onCreateWorktree,
  onRemoveWorktree,
  onMergeWorktree,
  onAbortMerge,
  onContinueMerge,
}: WorkspaceSwitcherProps) {
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <PopoverPrimitive.Trigger asChild>
        <button type="button" className="project-chip" title={cwd}>
          {scratch ? <MessagesSquare size={12} /> : <Folder size={12} />}
          <span>{scratch ? "不在项目" : cwd}</span>
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
            <span className="model-menu-count">{recent.length} 个</span>
          </div>
          <div className="workspace-list model-menu-scroll">
            {recent.map((item) => {
              const active = item.toLowerCase() === cwd.toLowerCase();
              return (
                <button
                  type="button"
                  key={item}
                  className={`menu-item ${active ? "active" : ""}`}
                  onClick={() => onSelect(item)}
                  title={item}
                >
                  <span className="provider-mark ghost">
                    <Folder size={12} />
                  </span>
                  <span className="m-main">
                    <span className="m-name">{workspaceLabel(item)}</span>
                    <span className="m-meta">{item}</span>
                  </span>
                  {active && <Check size={13} className="menu-check" />}
                </button>
              );
            })}
            {recent.length === 0 && (
              <div className="preset-empty">还没有最近工作区</div>
            )}
          </div>
          {repo && (
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
                      pendingWorktreePath === item.path ? "confirming" : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="workspace-worktree-main"
                      onClick={() => onSelect(item.path)}
                      title={item.path}
                    >
                      <span className="provider-mark ghost">
                        <GitBranch size={12} />
                      </span>
                      <span className="m-main">
                        <span className="m-name">
                          {item.branch || workspaceLabel(item.path)}
                        </span>
                        <span className="m-meta">
                          {item.changes ?? 0} 个改动
                          {typeof item.ahead === "number"
                            ? ` · 领先 ${item.ahead} / 落后 ${
                                item.behind ?? 0
                              }`
                            : ""}
                        </span>
                      </span>
                      <ChevronRight size={12} />
                    </button>
                    <button
                      type="button"
                      className={`workspace-worktree-merge ${
                        pendingWorktreeMerge === item.path ? "confirming" : ""
                      }`}
                      aria-label={`合并 Worktree ${
                        item.branch || item.path
                      }`}
                      title={
                        pendingWorktreeMerge === item.path
                          ? "再次点击确认合并到主工作区"
                          : "合并到主工作区"
                      }
                      onClick={() => onMergeWorktree(item)}
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
                      onClick={() => onRemoveWorktree(item)}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="menu-item"
                  disabled={worktreeBusy}
                  onClick={onCreateWorktree}
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
                {mergeConflict && (
                  <>
                    {mergeConflicts.length > 0 && (
                      <div className="worktree-conflicts">
                        {mergeConflicts.map((file) => (
                          <code key={file}>{file}</code>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      className="menu-item"
                      onClick={onContinueMerge}
                    >
                      <span className="provider-mark ghost">
                        <GitMerge size={12} />
                      </span>
                      <span className="m-main">
                        <span className="m-name">继续合并</span>
                        <span className="m-meta">
                          冲突处理完成后继续提交
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="menu-item danger"
                      onClick={onAbortMerge}
                    >
                      <span className="provider-mark ghost">
                        <X size={12} />
                      </span>
                      <span className="m-main">
                        <span className="m-name">中止未完成的合并</span>
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
          <button type="button" className="menu-item" onClick={onChoose}>
            <span className="provider-mark ghost">
              <FolderPlus size={12} />
            </span>
            <span className="m-main">
              <span className="m-name">打开文件夹…</span>
              <span className="m-meta">选择一个新的工作目录</span>
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
  );
}
