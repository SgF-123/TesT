import { Quote, X } from "lucide-react";
import type { DraftAnnotation } from "./annotations";
import { isInactiveLspStatus, stripAnsi } from "./text-sanitize";

export function ExtensionStrip({
  statuses,
  widgets,
}: {
  statuses: Record<string, string>;
  widgets: Record<string, { lines: string[] }>;
}) {
  const visibleStatuses = Object.entries(statuses)
    .map(([key, text]) => [key, stripAnsi(text).replace(/\s+/g, " ").trim()] as const)
    .filter(
      ([key, text]) => text.length > 0 && !isInactiveLspStatus(key, text),
    );
  const visibleWidgets = Object.entries(widgets)
    .map(
      ([key, widget]) =>
        [
          key,
          widget.lines
            .map((line) => stripAnsi(line).replace(/\s+$/g, ""))
            .filter(Boolean),
        ] as const,
    )
    .filter(([, lines]) => lines.length > 0);

  if (visibleStatuses.length === 0 && visibleWidgets.length === 0) {
    return null;
  }

  return (
    <div className="extension-strip">
      {visibleStatuses.map(([key, text]) => (
        <span className="extension-status" key={key}>
          <i />
          {text}
        </span>
      ))}
      {visibleWidgets.map(([key, lines]) => (
        <pre className="extension-widget" key={key}>
          {lines.join("\n")}
        </pre>
      ))}
    </div>
  );
}

export function AnnotationStrip({
  annotations,
  onClear,
  onRemove,
  onLocate,
}: {
  annotations: DraftAnnotation[];
  onClear: () => void;
  onRemove: (id: string) => void;
  onLocate: (messageId: string) => void;
}) {
  if (annotations.length === 0) {
    return null;
  }

  return (
    <div className="annotation-strip">
      <div className="annotation-strip-head">
        <span>
          <Quote size={11} />
          {annotations.length} 条引用
        </span>
        <button type="button" onClick={onClear}>
          清空
        </button>
      </div>
      <div className="annotation-strip-list">
        {annotations.map((annotation) => (
          <div className="annotation-chip" key={annotation.id}>
            <button
              type="button"
              className="annotation-chip-main"
              title={
                annotation.messageId
                  ? "定位到引用消息"
                  : annotation.quote
              }
              onClick={() => {
                if (annotation.messageId) {
                  onLocate(annotation.messageId);
                }
              }}
            >
              <span>{annotation.quote}</span>
              {annotation.note && <small>{annotation.note}</small>}
            </button>
            <button
              type="button"
              className="annotation-chip-remove"
              aria-label="移除引用"
              onClick={() => onRemove(annotation.id)}
            >
              <X size={10} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
