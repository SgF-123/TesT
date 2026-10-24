export type DraftAnnotation = {
  id: string;
  quote: string;
  note: string;
  messageId: string | null;
};

export const ANNOTATION_STORAGE_PREFIX = "tesT.annotations.v1:";

export function normalizeAnnotationQuote(text: string, maxLength = 1200) {
  const clean = String(text ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return clean.length > maxLength
    ? `${clean.slice(0, maxLength).trimEnd()}…`
    : clean;
}

export function buildAnnotationContext(
  annotations: readonly DraftAnnotation[],
) {
  const blocks = annotations
    .map((annotation, index) => {
      const quote = normalizeAnnotationQuote(annotation.quote);
      if (!quote) return "";
      const note = normalizeAnnotationQuote(annotation.note, 600);
      return [
        `[引用 ${index + 1}]`,
        ...quote.split("\n").map((line) => `> ${line}`),
        ...(note ? [`批注：${note}`] : []),
      ].join("\n");
    })
    .filter(Boolean);

  return blocks.length
    ? `<quoted_context>\n${blocks.join("\n\n")}\n</quoted_context>`
    : "";
}

export function makeDraftAnnotation(
  quote: string,
  note = "",
  messageId: string | null = null,
): DraftAnnotation {
  return {
    id: `annotation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    quote: normalizeAnnotationQuote(quote),
    note: normalizeAnnotationQuote(note, 600),
    messageId,
  };
}
