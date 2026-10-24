import { useEffect, useState } from "react";

type WorktreeEntry = {
  path: string;
  branch: string;
  changes?: number;
  ahead?: number;
  behind?: number;
};

type UseWorktreeControllerOptions = {
  isShell: boolean;
  bridge: typeof window.tesT;
  notify: (title: string, desc?: string) => void;
  workspace: string;
  workspaceCwd: string;
  workspaceOpen: boolean;
  onSelectWorkspace: (cwd: string) => void;
};

export function useWorktreeController({
  isShell,
  bridge,
  notify,
  workspace,
  workspaceCwd,
  workspaceOpen,
  onSelectWorkspace,
}: UseWorktreeControllerOptions) {
  const [worktrees, setWorktrees] = useState<WorktreeEntry[]>([]);
  const [worktreeBusy, setWorktreeBusy] = useState(false);
  const [pendingWorktreePath, setPendingWorktreePath] = useState("");
  const [pendingWorktreeMerge, setPendingWorktreeMerge] = useState("");
  const [worktreeMergeConflict, setWorktreeMergeConflict] = useState(false);
  const [worktreeMergeConflicts, setWorktreeMergeConflicts] = useState<
    string[]
  >([]);

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
  }, [
    workspaceOpen,
    workspace,
    workspaceCwd,
    isShell,
    bridge,
  ]);

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
        onSelectWorkspace(result.path);
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
    void bridge?.gitWorktreeMergeContinue?.({ cwd: workspace }).then(
      (result) => {
        if (result?.error) {
          notify("继续合并失败", result.error);
          return;
        }
        setWorktreeMergeConflict(false);
        setWorktreeMergeConflicts([]);
        notify("Worktree 合并已完成");
      },
    );
  };

  return {
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
  };
}
