import { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Archive,
  RotateCcw,
  X,
} from "lucide-react";
import { Button } from "./Button";
import { relativeSessionTime } from "./time-format";

type ArchivedSession = {
  path: string;
  name: string;
  cwd: string;
  messageCount: number;
  modified: string;
  size: number;
};

type ArchivedSessionsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestored: () => void;
  onNotify: (title: string, desc?: string) => void;
};

export default function ArchivedSessionsDialog({
  open,
  onOpenChange,
  onRestored,
  onNotify,
}: ArchivedSessionsDialogProps) {
  const [sessions, setSessions] = useState<ArchivedSession[]>([]);
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
