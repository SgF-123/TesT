export type QueueEntry = {
  id: string;
  text: string;
  kind: "steering" | "followUp";
};

export function buildQueueEntries(
  steering: unknown,
  followUp: unknown,
): QueueEntry[] {
  const toItems = (value: unknown, kind: QueueEntry["kind"]) =>
    (Array.isArray(value) ? value : [])
      .map((item) => String(item ?? "").trim())
      .filter(Boolean)
      .map((text, index) => ({
        id: `${kind}-${index}-${text.slice(0, 12)}`,
        text,
        kind,
      }));

  return [
    ...toItems(steering, "steering"),
    ...toItems(followUp, "followUp"),
  ];
}

export function removeQueueEntry(
  entries: readonly QueueEntry[],
  target: QueueEntry,
) {
  const index = entries.findIndex(
    (entry) => entry.kind === target.kind && entry.text === target.text,
  );
  if (index < 0) return [...entries];
  return [...entries.slice(0, index), ...entries.slice(index + 1)];
}

export function queueSignature(entries: readonly QueueEntry[]) {
  return entries
    .map((entry) => `${entry.kind}\u0000${entry.text}`)
    .join("\u0001");
}

export function appendQueueTextToDraft(draft: string, text: string) {
  const queued = String(text ?? "").trim();
  if (!queued) return draft;
  const current = draft.trim();
  return current ? `${queued}\n\n${current}` : queued;
}
