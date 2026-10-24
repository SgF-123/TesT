import {
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  Check,
  MessageSquarePlus,
  Quote,
  X,
} from "lucide-react";
import { normalizeAnnotationQuote } from "./annotations";

type SelectionToolbarProps = {
  containerRef: RefObject<HTMLDivElement | null>;
  onAdd: (quote: string, note: string, messageId: string | null) => void;
};

type SelectionState = {
  quote: string;
  messageId: string | null;
  left: number;
  top: number;
};

function elementFromNode(node: Node | null) {
  if (!node) return null;
  return node.nodeType === Node.ELEMENT_NODE
    ? (node as Element)
    : node.parentElement;
}

export default function SelectionToolbar({
  containerRef,
  onAdd,
}: SelectionToolbarProps) {
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [commentOpen, setCommentOpen] = useState(false);
  const [note, setNote] = useState("");
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const captureSelection = () => {
      const container = containerRef.current;
      const shell = container?.parentElement;
      const activeSelection = window.getSelection();

      if (
        !container ||
        !shell ||
        !activeSelection ||
        activeSelection.isCollapsed ||
        activeSelection.rangeCount === 0
      ) {
        return;
      }

      const range = activeSelection.getRangeAt(0);
      if (!container.contains(range.commonAncestorContainer)) {
        return;
      }

      const startMessage = elementFromNode(range.startContainer)?.closest<HTMLElement>(
        "[data-msg-id]",
      );
      const endMessage = elementFromNode(range.endContainer)?.closest<HTMLElement>(
        "[data-msg-id]",
      );
      if (!startMessage || startMessage !== endMessage) {
        return;
      }

      const quote = normalizeAnnotationQuote(activeSelection.toString(), 2000);
      if (quote.length < 2) {
        return;
      }

      const shellRect = shell.getBoundingClientRect();
      const rangeRect = range.getBoundingClientRect();
      const width = selectionWidth(quote);
      const left = Math.max(
        12,
        Math.min(
          shellRect.width - width - 12,
          rangeRect.left - shellRect.left + rangeRect.width / 2 - width / 2,
        ),
      );
      const below = rangeRect.bottom - shellRect.top + 8;
      const top =
        below + 130 < shellRect.height
          ? below
          : Math.max(8, rangeRect.top - shellRect.top - 52);

      setCommentOpen(false);
      setNote("");
      setSelection({
        quote,
        messageId: startMessage.dataset.msgId ?? null,
        left,
        top,
      });
    };

    const clearIfOutside = (event: PointerEvent) => {
      if (toolbarRef.current?.contains(event.target as Node)) {
        return;
      }
      setSelection(null);
      setCommentOpen(false);
    };

    document.addEventListener("pointerup", captureSelection);
    document.addEventListener("pointerdown", clearIfOutside);
    document.addEventListener("keyup", captureSelection);
    return () => {
      document.removeEventListener("pointerup", captureSelection);
      document.removeEventListener("pointerdown", clearIfOutside);
      document.removeEventListener("keyup", captureSelection);
    };
  }, [containerRef]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const hide = () => {
      setSelection(null);
      setCommentOpen(false);
    };
    container.addEventListener("scroll", hide, { passive: true });
    return () => container.removeEventListener("scroll", hide);
  }, [containerRef]);

  useEffect(() => {
    if (!commentOpen) return;
    const frame = window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setCommentOpen(false);
        setNote("");
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [commentOpen]);

  if (!selection) {
    return null;
  }

  const finish = (nextNote = "") => {
    onAdd(selection.quote, nextNote, selection.messageId);
    window.getSelection()?.removeAllRanges();
    setSelection(null);
    setCommentOpen(false);
    setNote("");
  };

  return (
    <div
      ref={toolbarRef}
      className="selection-toolbar"
      data-comment={commentOpen ? "true" : undefined}
      style={{ left: selection.left, top: selection.top }}
      onMouseDown={(event) => {
        if (!(event.target instanceof HTMLTextAreaElement)) {
          event.preventDefault();
        }
      }}
    >
      {!commentOpen ? (
        <div className="selection-toolbar-actions">
          <button type="button" onClick={() => finish()}>
            <Quote size={12} />
            引用
          </button>
          <button
            type="button"
            onClick={() => {
              setCommentOpen(true);
              setNote("");
            }}
          >
            <MessageSquarePlus size={12} />
            批注
          </button>
          <button
            type="button"
            className="selection-toolbar-close"
            aria-label="关闭引用工具条"
            onClick={() => setSelection(null)}
          >
            <X size={11} />
          </button>
        </div>
      ) : (
        <div className="selection-comment-editor">
          <div className="selection-comment-quote">{selection.quote}</div>
          <textarea
            ref={textareaRef}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="补充你的批注，回车提交"
            rows={2}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                finish(note);
              }
            }}
          />
          <div className="selection-comment-actions">
            <button
              type="button"
              onClick={() => {
                setCommentOpen(false);
                setNote("");
              }}
            >
              取消
            </button>
            <button
              type="button"
              className="is-primary"
              onClick={() => finish(note)}
            >
              <Check size={11} />
              添加
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function selectionWidth(quote: string) {
  if (quote.length > 480) return 380;
  if (quote.length > 220) return 320;
  return 214;
}
