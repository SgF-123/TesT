import { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  GitCommitHorizontal,
  RefreshCw,
  X,
} from "lucide-react";
import { Button } from "./Button";

type CommitDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  count: number;
  committing: boolean;
  onCommit: (message: string) => void;
};

export default function CommitDialog({
  open,
  onOpenChange,
  count,
  committing,
  onCommit,
}: CommitDialogProps) {
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
