import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { Trash2, X } from "lucide-react";
import { Button } from "./Button";

type DeleteSessionDialogProps = {
  open: boolean;
  title: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export default function DeleteSessionDialog({
  open,
  title,
  onOpenChange,
  onConfirm,
}: DeleteSessionDialogProps) {
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
