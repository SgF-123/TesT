import { memo } from "react";
import {
  Bookmark,
  Copy,
  Pencil,
  RotateCcw,
} from "lucide-react";
import { copyText } from "./clipboard";
import type { ChatMessage } from "./chat-types";
import MarkdownText from "./Markdown";

type MessageRowProps = {
  message: ChatMessage;
  modelLabel: string;
  cwd?: string;
  findState: "" | "match" | "hit";
  turnNumber?: number;
  bookmarked?: boolean;
  onToggleBookmark?: (messageId: string) => void;
  onNotify: (title: string, desc?: string) => void;
  onEdit: (messageId: string, text: string) => void;
  onRetry: (messageId: string) => void;
};

export const MessageRow = memo(function MessageRow({
  message,
  modelLabel,
  cwd,
  findState,
  turnNumber,
  bookmarked = false,
  onToggleBookmark,
  onNotify,
  onEdit,
  onRetry,
}: MessageRowProps) {
  return (
    <div
      className={`message ${message.role} ${
        findState === "hit"
          ? "find-hit"
          : findState === "match"
            ? "find-match"
            : ""
      }`}
      data-msg-id={message.id}
    >
      <div className="msg-meta">
        {message.role === "user" ? (
          <>
            {turnNumber !== undefined && (
              <span className="turn-inline-label">
                {onToggleBookmark && (
                  <button
                    type="button"
                    className={`turn-inline-bookmark ${
                      bookmarked ? "is-on" : ""
                    }`}
                    aria-label={bookmarked ? "取消本轮书签" : "添加本轮书签"}
                    aria-pressed={bookmarked}
                    title={bookmarked ? "取消本轮书签" : "添加本轮书签"}
                    onClick={() => onToggleBookmark(message.id)}
                  >
                    <Bookmark size={11} aria-hidden="true" />
                  </button>
                )}
                <span className="turn-inline-number">#{turnNumber}</span>
              </span>
            )}
            <span>你 · 现在</span>
          </>
        ) : (
          modelLabel
        )}
      </div>
      {message.role === "user" ? (
        <div className="bubble user-bubble">{message.text}</div>
      ) : (
        <div className="assistant-text">
          <MarkdownText text={message.text} cwd={cwd} />
        </div>
      )}
      <div className="msg-actions">
        <button
          type="button"
          onClick={async () => {
            const ok = await copyText(message.text);
            if (ok) onNotify("已复制");
          }}
        >
          <Copy size={12} /> 复制
        </button>
        {message.role === "user" ? (
          <button
            type="button"
            title="从这条消息创建编辑分支"
            onClick={() => onEdit(message.id, message.text)}
          >
            <Pencil size={12} /> 编辑
          </button>
        ) : (
          <button type="button" onClick={() => onRetry(message.id)}>
            <RotateCcw size={12} /> 重试
          </button>
        )}
      </div>
    </div>
  );
});
