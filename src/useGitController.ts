import { useEffect, useState } from "react";
import type { GitChange } from "./git-types";

type GitInfo = {
  repo: boolean;
  branch: string | null;
  branches: string[];
  error?: string;
};

type UseGitControllerOptions = {
  isShell: boolean;
  bridge: typeof window.tesT;
  cwd: string;
  notify: (title: string, desc?: string) => void;
  refreshKey?: unknown;
};

export function useGitController({
  isShell,
  bridge,
  cwd,
  notify,
  refreshKey,
}: UseGitControllerOptions) {
  const [branch, setBranch] = useState("main");
  const [gitInfo, setGitInfo] = useState<GitInfo>({
    repo: false,
    branch: null,
    branches: [],
  });
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

  useEffect(() => {
    if (!isShell || !bridge?.gitInfo || !cwd) {
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
  }, [isShell, bridge, cwd]);

  const refreshChanges = () => {
    if (!isShell || !bridge?.gitStatus || !cwd) {
      setChanges([]);
      return;
    }
    void bridge
      .gitStatus({ cwd })
      .then((result) => {
        setChanges(Array.isArray(result?.files) ? result.files : []);
      })
      .catch(() => setChanges([]));
  };

  useEffect(() => {
    if (!isShell || !bridge?.gitStatus || !cwd) {
      setChanges([]);
      return;
    }
    let cancelled = false;
    void bridge
      .gitStatus({ cwd })
      .then((result) => {
        if (!cancelled) {
          setChanges(Array.isArray(result?.files) ? result.files : []);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isShell, bridge, cwd, refreshKey]);

  const fetchDiff = (change: GitChange) => {
    setDiffLoading(true);
    setDiffPatch("");
    setDiffSource("worktree");
    if (!isShell || !bridge?.gitDiff || !cwd) {
      setDiffLoading(false);
      return;
    }
    void bridge
      .gitDiff({ cwd, path: change.path })
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
    if (!isShell || !bridge?.gitStageHunk || !cwd) {
      return;
    }
    setStagingHunk(true);
    void bridge
      .gitStageHunk({ cwd, patch })
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
    if (!isShell || !bridge?.gitRevertHunk || !cwd) {
      return;
    }
    setRevertingHunk(true);
    void bridge
      .gitRevertHunk({ cwd, patch })
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
    if (!isShell || !bridge?.gitRevertFile || !cwd) {
      return;
    }
    setRevertingFile(true);
    void bridge
      .gitRevertFile({ cwd, path: change.path })
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
    if (!isShell || !bridge?.gitStage || !cwd) {
      return;
    }
    setStaging(true);
    void bridge
      .gitStage({ cwd, path: change.path })
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
    if (!isShell || !bridge?.gitUnstage || !cwd) {
      return;
    }
    setStaging(true);
    void bridge
      .gitUnstage({ cwd, path: change.path })
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
    if (!isShell || !bridge?.gitCommit || !cwd) {
      notify("无法提交", "当前环境不支持 Git 提交");
      return;
    }
    setCommitting(true);
    void bridge
      .gitCommit({ cwd, message })
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

  const changeBranch = (value: string) => {
    if (!isShell || !bridge?.gitCheckout) {
      setBranch(value);
      return;
    }
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

  return {
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
  };
}
