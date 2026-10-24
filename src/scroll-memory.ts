export type ScrollMemoryEntry = {
  messageId: string | null;
  offset: number;
  top: number;
  atBottom: boolean;
  updatedAt: number;
};

export type ScrollMemoryStore = Record<string, ScrollMemoryEntry>;

export const SCROLL_MEMORY_STORAGE_KEY = "tesT.scrollMemory.v1";
const MAX_SCROLL_MEMORY_ENTRIES = 200;

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export function readScrollMemory(
  storage: StorageLike | null = typeof window === "undefined"
    ? null
    : window.localStorage,
): ScrollMemoryStore {
  try {
    const raw = storage?.getItem(SCROLL_MEMORY_STORAGE_KEY);
    if (!raw) return {};
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== "object") return {};

    const store: ScrollMemoryStore = {};
    for (const [path, entry] of Object.entries(
      value as Record<string, Partial<ScrollMemoryEntry>>,
    )) {
      if (
        !path ||
        !entry ||
        typeof entry.top !== "number" ||
        !Number.isFinite(entry.top)
      ) {
        continue;
      }
      store[path] = {
        messageId:
          typeof entry.messageId === "string" ? entry.messageId : null,
        offset:
          typeof entry.offset === "number" && Number.isFinite(entry.offset)
            ? entry.offset
            : 0,
        top: Math.max(0, entry.top),
        atBottom: entry.atBottom === true,
        updatedAt:
          typeof entry.updatedAt === "number" && Number.isFinite(entry.updatedAt)
            ? entry.updatedAt
            : 0,
      };
    }
    return store;
  } catch {
    return {};
  }
}

export function writeScrollMemory(
  store: ScrollMemoryStore,
  storage: StorageLike | null = typeof window === "undefined"
    ? null
    : window.localStorage,
) {
  try {
    const entries = Object.entries(store)
      .sort((a, b) => b[1].updatedAt - a[1].updatedAt)
      .slice(0, MAX_SCROLL_MEMORY_ENTRIES);
    storage?.setItem(SCROLL_MEMORY_STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // Keep the in-memory reading positions when persistence is unavailable.
  }
}
