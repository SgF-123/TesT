import { useEffect, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  FolderOpen,
  RotateCcw,
  X,
} from "lucide-react";
import { Button } from "./Button";

type LogDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNotify: (title: string, desc?: string) => void;
};

export default function LogDialog({
  open,
  onOpenChange,
  onNotify,
}: LogDialogProps) {
  const [text, setText] = useState("");
  const [filePath, setFilePath] = useState("");
  const [loading, setLoading] = useState(false);
  const outputRef = useRef<HTMLPreElement | null>(null);

  const load = () => {
    if (!window.tesT?.readLog) {
      return;
    }
    setLoading(true);
    void window.tesT
      .readLog()
      .then((result) => {
        if (result?.error) {
          onNotify("读取日志失败", result.error);
        }
        setText(result?.text || "");
        setFilePath(result?.path || "");
      })
      .catch((error) => onNotify("读取日志失败", String(error)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (open) {
      load();
    }
  }, [open]);

  useEffect(() => {
    const element = outputRef.current;
    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  }, [text]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="rx-overlay" />
        <DialogPrimitive.Content className="dialog log-dialog">
          <div className="dialog-head">
            <div>
              <DialogPrimitive.Title className="dialog-title">
                运行日志
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="dialog-desc">
                electron.log · 最近 240 KB
              </DialogPrimitive.Description>
            </div>
            <div className="file-head-actions">
              <Button variant="ghost" size="sm" onClick={load}>
                <RotateCcw size={12} /> 刷新
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  void window.tesT?.openDataDir?.();
                }}
              >
                <FolderOpen size={12} /> 数据目录
              </Button>
              <DialogPrimitive.Close asChild>
                <Button variant="icon" aria-label="关闭">
                  <X size={15} />
                </Button>
              </DialogPrimitive.Close>
            </div>
          </div>
          <pre className="log-output" ref={outputRef}>
            {loading && !text ? "正在读取…" : text || "没有日志"}
          </pre>
          <div className="dialog-foot">
            <span className="muted">{filePath || "electron.log"}</span>
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
