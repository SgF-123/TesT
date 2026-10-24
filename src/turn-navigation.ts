export type TurnSourceMessage = {
  id: string;
  role: string;
  text: string;
};

export type TurnNavigationItem = {
  id: string;
  number: number;
  preview: string;
};

export const TURN_NAVIGATOR_MIN_TURNS = 5;

export function normalizeTurnPreview(text: string, maxLength = 110) {
  const clean = String(text ?? "")
    .replace(/\s+/g, " ")
    .trim();

  if (!clean) {
    return "空消息";
  }

  if (clean.length <= maxLength) {
    return clean;
  }

  return `${clean.slice(0, maxLength).trimEnd()}…`;
}

export function buildTurnNavigation(
  messages: readonly TurnSourceMessage[],
): TurnNavigationItem[] {
  const turns: TurnNavigationItem[] = [];

  for (const message of messages) {
    if (message.role !== "user" || !message.id) {
      continue;
    }

    turns.push({
      id: message.id,
      number: turns.length + 1,
      preview: normalizeTurnPreview(message.text),
    });
  }

  return turns;
}

export function findBookmarkedTurn(
  turns: readonly TurnNavigationItem[],
  bookmarkedIds: ReadonlySet<string>,
  currentId: string | null | undefined,
  direction: "previous" | "next",
) {
  if (!turns.length || !bookmarkedIds.size) {
    return null;
  }

  const currentIndex = turns.findIndex((turn) => turn.id === currentId);
  if (currentIndex < 0) {
    const fallback =
      direction === "previous"
        ? [...turns].reverse().find((turn) => bookmarkedIds.has(turn.id))
        : turns.find((turn) => bookmarkedIds.has(turn.id));
    return fallback ?? null;
  }

  if (direction === "previous") {
    for (let index = currentIndex - 1; index >= 0; index -= 1) {
      if (bookmarkedIds.has(turns[index].id)) {
        return turns[index];
      }
    }
    return null;
  }

  for (let index = currentIndex + 1; index < turns.length; index += 1) {
    if (bookmarkedIds.has(turns[index].id)) {
      return turns[index];
    }
  }
  return null;
}
