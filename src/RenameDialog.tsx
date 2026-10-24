import { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Save, X } from "lucide-react";
import { Button } from "./Button";

type RenameDialogProps = {
  open: boolean;
  value: string;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string) => void;
};

export default function RenameDialog({
  open,
  value,
  onOpenChange,
  onSave,
}: RenameDialogProps) {
  const [name, setName] = useState(value);

  useEffect(() => {
    if (open) {
      setName(value);
    }
  }, [open, value]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="rx-overlay" />
        <DialogPrimitive.Content className="dialog small">
          <div className="dialog-head">
            <div>
              <DialogPrimitive.Title className="dialog-title">
                重命名会话
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="dialog-desc">
                只修改显示名称，不改 cwd 和消息内容
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="icon" aria-label="关闭">
                <X size={15} />
              </Button>
            </DialogPrimitive.Close>
          </div>
          <div className="dialog-body">
            <input
              className="input"
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && name.trim()) {
                  onSave(name.trim());
                }
              }}
              placeholder="会话名称"
            />
          </div>
          <div className="dialog-foot">
            <span className="muted">Pi session_info</span>
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
                icon={<Save size={13} />}
                disabled={!name.trim()}
                onClick={() => onSave(name.trim())}
              >
                保存
              </Button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
