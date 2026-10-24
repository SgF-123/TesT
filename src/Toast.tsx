import type { CSSProperties } from "react";
import { Check, X } from "lucide-react";

export type ToastData = {
  id: number;
  title: string;
  desc?: string;
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
  durationMs?: number;
};

export default function Toast({
  data,
  onClose,
}: {
  data: ToastData;
  onClose: () => void;
}) {
  const runAction = () => {
    onClose();
    void data.onAction?.();
  };

  return (
    <div
      className="toast"
      key={data.id}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      style={
        {
          "--toast-duration": `${data.durationMs ?? 2600}ms`,
        } as CSSProperties
      }
    >
      <span className="toast-icon">
        <Check size={13} strokeWidth={2.5} />
      </span>
      <div className="toast-body">
        <div className="toast-title">{data.title}</div>
        {data.desc && <div className="toast-desc">{data.desc}</div>}
      </div>
      {data.actionLabel && data.onAction && (
        <button
          type="button"
          className="toast-action"
          onClick={runAction}
        >
          {data.actionLabel}
        </button>
      )}
      <button
        type="button"
        className="toast-close"
        onClick={onClose}
        aria-label="关闭提示"
      >
        <X size={12} />
      </button>
      <span className="toast-progress" />
    </div>
  );
}
