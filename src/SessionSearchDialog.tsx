import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Search, X } from "lucide-react";
import { Button } from "./Button";
import { relativeSessionTime } from "./time-format";

type SessionSearchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  onQuery: (value: string) => void;
  results: TesTSessionSearchResult[];
  loading: boolean;
  onSelect: (result: TesTSessionSearchResult) => void;
};

export default function SessionSearchDialog({
  open,
  onOpenChange,
  query,
  onQuery,
  results,
  loading,
  onSelect,
}: SessionSearchDialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="rx-overlay" />
        <DialogPrimitive.Content className="dialog session-search-dialog">
          <div className="dialog-head">
            <div>
              <DialogPrimitive.Title className="dialog-title">
                搜索会话内容
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="dialog-desc">
                搜索标题、cwd 和消息正文
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="icon" aria-label="关闭">
                <X size={15} />
              </Button>
            </DialogPrimitive.Close>
          </div>
          <div className="session-search-input">
            <Search size={13} />
            <input
              autoFocus
              value={query}
              onChange={(event) => onQuery(event.target.value)}
              placeholder="输入关键词，至少 2 个字符…"
            />
            <kbd>Ctrl Shift F</kbd>
          </div>
          <div className="session-search-list">
            {loading && <div className="diff-empty">搜索中…</div>}
            {!loading &&
              query.trim().length >= 2 &&
              results.length === 0 && (
                <div className="diff-empty">没有匹配的会话</div>
              )}
            {!loading &&
              results.map((result) => (
                <button
                  type="button"
                  className="session-search-row"
                  key={result.path}
                  onClick={() => onSelect(result)}
                >
                  <span className="session-search-main">
                    <span className="session-search-title">
                      <Search size={11} />
                      <b>
                        {result.name ||
                          result.firstMessage ||
                          "未命名会话"}
                      </b>
                    </span>
                    <small>{result.cwd || result.path}</small>
                    <span>{result.snippet}</span>
                  </span>
                  <small className="session-search-meta">
                    {result.role === "user"
                      ? "你"
                      : result.role === "assistant"
                        ? "Pi"
                        : "标题"}{" "}
                    · {relativeSessionTime(result.modified)}
                  </small>
                </button>
              ))}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
