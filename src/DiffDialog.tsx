import { useEffect, useMemo, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Minus, Plus, RotateCcw, X } from "lucide-react";
import { Button } from "./Button";
import { parseDiff } from "./diff";
import type { GitChange } from "./git-types";

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

export { DiffDialog };
