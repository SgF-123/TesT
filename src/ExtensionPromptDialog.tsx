import { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Check,
  ChevronRight,
  X,
} from "lucide-react";
import { Button } from "./Button";

export type ExtensionPrompt = {
  id: string;
  method: "select" | "confirm" | "input" | "editor";
  title?: string;
  message?: string;
  placeholder?: string;
  options?: string[];
  prefill?: string;
};

type ExtensionPromptDialogProps = {
  prompt: ExtensionPrompt | null;
  onRespond: (payload: {
    value?: string;
    confirmed?: boolean;
  }) => void;
  onCancel: () => void;
};

export default function ExtensionPromptDialog({
  prompt,
  onRespond,
  onCancel,
}: ExtensionPromptDialogProps) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (!prompt) {
      return;
    }
    setValue(prompt.method === "editor" ? prompt.prefill || "" : "");
  }, [prompt?.id]);

  if (!prompt) {
    return null;
  }

  return (
    <DialogPrimitive.Root
      open
      onOpenChange={(open) => {
        if (!open) {
          onCancel();
        }
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="rx-overlay" />
        <DialogPrimitive.Content className="dialog small extension-prompt">
          <div className="dialog-head">
            <div>
              <DialogPrimitive.Title className="dialog-title">
                {prompt.title || "Pi 需要确认"}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="dialog-desc">
                {prompt.message || "来自 Pi 扩展的交互请求"}
              </DialogPrimitive.Description>
            </div>
          </div>
          <div className="dialog-body extension-prompt-body">
            {prompt.method === "select" &&
              (prompt.options || []).map((option) => (
                <button
                  type="button"
                  key={option}
                  className="extension-option"
                  onClick={() => onRespond({ value: option })}
                >
                  {option}
                  <ChevronRight size={12} />
                </button>
              ))}

            {prompt.method === "confirm" && (
              <div className="extension-confirm">
                <Button
                  variant="secondary"
                  icon={<X size={12} />}
                  onClick={() => onRespond({ confirmed: false })}
                >
                  取消
                </Button>
                <Button
                  variant="primary"
                  icon={<Check size={12} />}
                  onClick={() => onRespond({ confirmed: true })}
                >
                  确认
                </Button>
              </div>
            )}

            {prompt.method === "input" && (
              <input
                className="input"
                autoFocus
                value={value}
                placeholder={prompt.placeholder || ""}
                onChange={(event) => setValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    onRespond({ value });
                  }
                }}
              />
            )}

            {prompt.method === "editor" && (
              <textarea
                className="input extension-editor"
                autoFocus
                value={value}
                onChange={(event) => setValue(event.target.value)}
              />
            )}
          </div>
          <div className="dialog-foot">
            <span className="muted">
              Pi extension · {prompt.method}
            </span>
            <div>
              <Button
                variant="secondary"
                icon={<X size={13} />}
                onClick={onCancel}
              >
                取消
              </Button>
              {(prompt.method === "input" ||
                prompt.method === "editor") && (
                <Button
                  variant="primary"
                  icon={<Check size={13} />}
                  onClick={() => onRespond({ value })}
                >
                  提交
                </Button>
              )}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
