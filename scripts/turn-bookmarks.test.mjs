import assert from "node:assert/strict";
import test from "node:test";
import {
  bookmarksForSession,
  readTurnBookmarkStore,
  toggleTurnBookmark,
  writeTurnBookmarkStore,
} from "../src/turn-bookmarks.ts";

function memoryStorage() {
  const data = new Map();
  return {
    getItem(key) {
      return data.get(key) ?? null;
    },
    setItem(key, value) {
      data.set(key, value);
    },
    removeItem(key) {
      data.delete(key);
    },
  };
}

test("turn bookmarks toggle independently for each session", () => {
  let store = {};
  store = toggleTurnBookmark(store, "session-a", "message-1");
  store = toggleTurnBookmark(store, "session-a", "message-2");
  store = toggleTurnBookmark(store, "session-b", "message-1");

  assert.deepEqual(bookmarksForSession(store, "session-a"), [
    "message-1",
    "message-2",
  ]);
  assert.deepEqual(bookmarksForSession(store, "session-b"), ["message-1"]);

  store = toggleTurnBookmark(store, "session-a", "message-1");
  assert.deepEqual(bookmarksForSession(store, "session-a"), ["message-2"]);
});

test("turn bookmark storage sanitizes malformed data and removes empty sessions", () => {
  const storage = memoryStorage();
  storage.setItem(
    "tesT.turnBookmarks.v1",
    JSON.stringify({
      "session-a": ["message-1", "message-1", 42, ""],
      "session-b": [],
    }),
  );

  assert.deepEqual(readTurnBookmarkStore(storage), {
    "session-a": ["message-1"],
  });

  writeTurnBookmarkStore(
    {
      "session-a": ["message-1"],
      "session-b": [],
    },
    storage,
  );
  assert.deepEqual(JSON.parse(storage.getItem("tesT.turnBookmarks.v1")), {
    "session-a": ["message-1"],
  });

  writeTurnBookmarkStore({}, storage);
  assert.equal(storage.getItem("tesT.turnBookmarks.v1"), null);
});
