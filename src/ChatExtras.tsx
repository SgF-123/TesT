import {
  memo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  Check,
  Copy,
  FileText,
  Minus,
  Sparkles,
  Square,
  X,
} from "lucide-react";
import { copyText } from "./clipboard";
import MarkdownText from "./Markdown";
import type { Model } from "./settings-config";
import { streamStore } from "./stream-store";
import { Tag } from "./Tag";

export function PlanCard() {
  const steps = [
    { label: "定布局与栅格", state: "done" },
    { label: "锁定颜色 / 圆角 / 动效", state: "done" },
    { label: "接入 Pi RPC", state: "now" },
  ] as const;

  return (
    <div className="plan-card">
      <div className="plan-head">
        <Sparkles size={12} />
        执行计划
        <Tag tone="mint">2 / 3</Tag>
      </div>
      {steps.map((step) => (
        <div className={`plan-step ${step.state}`} key={step.label}>
          <span className="plan-check">
            {step.state === "done" ? (
              <Check size={9} strokeWidth={3} />
            ) : (
              <span className="plan-dot" />
            )}
          </span>
          <span>{step.label}</span>
          {step.state === "now" && <span className="plan-now">进行中</span>}
        </div>
      ))}
    </div>
  );
}

export function CodeCard({
  code,
  lang = "tsx",
}: {
  code: string;
  lang?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="code-card">
      <div className="code-head">
        <FileText size={11} />
        <span>{lang}</span>
        <button
          type="button"
          className="code-copy"
          onClick={async () => {
            const ok = await copyText(code);
            setCopied(ok);
            window.setTimeout(() => setCopied(false), 1400);
          }}
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? "已复制" : "复制"}
        </button>
      </div>
      <pre>{code}</pre>
    </div>
  );
}

export function CaptionButtons({
  small = false,
  onMinimize,
  onMaximize,
  onClose,
}: {
  small?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
}) {
  return (
    <div className={`caption ${small ? "small" : ""}`}>
      <button
        type="button"
        className="cap"
        aria-label="最小化"
        title="最小化"
        onClick={onMinimize}
      >
        <Minus size={small ? 9 : 13} />
      </button>
      <button
        type="button"
        className="cap"
        aria-label="最大化"
        title="最大化 / 还原"
        onClick={onMaximize}
      >
        <Square size={small ? 7 : 10} />
      </button>
      <button
        type="button"
        className="cap close"
        aria-label="关闭"
        title="关闭"
        onClick={onClose}
      >
        <X size={small ? 9 : 14} />
      </button>
    </div>
  );
}

export const StreamingBubble = memo(function StreamingBubble({
  model,
}: {
  model: Model;
}) {
  const text = useSyncExternalStore(
    streamStore.subscribe,
    streamStore.getSnapshot,
    streamStore.getSnapshot,
  );

  if (!text) {
    return null;
  }

  return (
    <div className="message assistant">
      <div className="msg-meta">
        <span className="model-chip">
          <span className="model-dot" />
          {model.label}
        </span>
      </div>
      <div className="assistant-text">
        <MarkdownText text={text} />
        <span className="caret" />
      </div>
    </div>
  );
});
