import { useState } from "react";
import { Check as CheckNode, Copy as CopyNode } from "lucide";
import { MorphIcon } from "morphicons/react";
import { copyText } from "./clipboard";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={`copy-btn ${copied ? "copied" : ""}`}
      onClick={async () => {
        const ok = await copyText(text);
        setCopied(ok);
        window.setTimeout(() => setCopied(false), 1500);
      }}
    >
      <MorphIcon
        icon={copied ? CheckNode : CopyNode}
        size={13}
        spring="smooth"
        reducedMotion="user"
        className="copy-glyph"
      />
      <span>{copied ? "已复制" : "复制"}</span>
    </button>
  );
}
