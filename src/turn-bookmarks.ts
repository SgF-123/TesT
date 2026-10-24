export type TurnBookmarkStore = Record<string, string[]>;

export const TURN_BOOKMARK_STORAGE_KEY = "tesT.turnBookmarks.v1";

const MAX_SESSION_KEYS = 200;
const MAX_BOOKMARKS_PER_SESSION = 300;
const MAX_MESSAGE_ID_LENGTH = 256;

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function defaultStorage(): StorageLike | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

function cleanMessageIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value.filter(
        (id): id is string =>
          typeof id === "string" &&
          id.length > 0 &&
          id.length <= MAX_MESSAGE_ID_LENGTH,
      ),
    ),
  ].slice(0, MAX_BOOKMARKS_PER_SESSION);
}

export function readTurnBookmarkStore(
  storage: StorageLike | null = defaultStorage(),
): TurnBookmarkStore {
  try {
    const raw = storage?.getItem(TURN_BOOKMARK_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }

    const store: TurnBookmarkStore = {};
    for (const [sessionPath, ids] of Object.entries(
      value as Record<string, unknown>,
    )) {
      if (!sessionPath) {
        continue;
      }
      const clean = cleanMessageIds(ids);
      if (clean.length) {
        store[sessionPath] = clean;
      }
    }
    return store;
  } catch {
    return {};
  }
}

export function writeTurnBookmarkStore(
  store: TurnBookmarkStore,
  storage: StorageLike | null = defaultStorage(),
) {
  try {
    const entries = Object.entries(store)
      .map(([sessionPath, ids]) => [sessionPath, cleanMessageIds(ids)] as const)
      .filter(([sessionPath, ids]) => sessionPath && ids.length > 0)
      .slice(-MAX_SESSION_KEYS);

    if (!entries.length) {
      storage?.removeItem(TURN_BOOKMARK_STORAGE_KEY);
      return;
    }

    storage?.setItem(
      TURN_BOOKMARK_STORAGE_KEY,
      JSON.stringify(Object.fromEntries(entries)),
    );
  } catch {
    // The in-memory bookmarks remain usable when persistence is unavailable.
  }
}

export function bookmarksForSession(
  store: TurnBookmarkStore,
  sessionPath: string,
) {
  return cleanMessageIds(sessionPath ? store[sessionPath] : []);
}

export function toggleTurnBookmark(
  store: TurnBookmarkStore,
  sessionPath: string,
  messageId: string,
) {
  if (!sessionPath || !messageId) {
    return store;
  }

  const current = new Set(bookmarksForSession(store, sessionPath));
  if (current.has(messageId)) {
    current.delete(messageId);
  } else {
    current.add(messageId);
  }

  const next = { ...store };
  if (current.size) {
    next[sessionPath] = [...current];
  } else {
    delete next[sessionPath];
  }
  return next;
}
