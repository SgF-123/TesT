import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { LogOut, X } from "lucide-react";
import { Button } from "./Button";

type CloseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export default function CloseDialog({
  open,
  onOpenChange,
  onConfirm,
}: CloseDialogProps) {
  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className="rx-overlay" />
        <AlertDialogPrimitive.Content className="dialog small">
          <div className="dialog-head">
            <div>
              <AlertDialogPrimitive.Title className="dialog-title">
                退出 TesT？
              </AlertDialogPrimitive.Title>
              <AlertDialogPrimitive.Description className="dialog-desc">
                会话记录会保留，Pi RPC 进程将在退出时停止。
              </AlertDialogPrimitive.Description>
            </div>
          </div>
          <div className="dialog-body alert-body">
            <p className="muted">
              下班前记得把未完成的会话留在工作区里，下次启动可以继续。
            </p>
          </div>
          <div className="dialog-foot">
            <div>
              <AlertDialogPrimitive.Cancel asChild>
                <Button variant="secondary" icon={<X size={13} />}>
                  取消
                </Button>
              </AlertDialogPrimitive.Cancel>
              <AlertDialogPrimitive.Action asChild>
                <Button
                  variant="danger"
                  icon={<LogOut size={13} />}
                  onClick={onConfirm}
                >
                  退出
                </Button>
              </AlertDialogPrimitive.Action>
            </div>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
