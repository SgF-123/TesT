import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTurnNavigation,
  findBookmarkedTurn,
  normalizeTurnPreview,
} from "../src/turn-navigation.ts";

test("buildTurnNavigation indexes user turns with stable global numbers", () => {
  const turns = buildTurnNavigation([
    { id: "u1", role: "user", text: "  第一条   消息  " },
    { id: "a1", role: "assistant", text: "忽略" },
    { id: "u2", role: "user", text: "第二条" },
    { id: "u3", role: "user", text: "" },
  ]);

  assert.deepEqual(
    turns.map((turn) => ({
      id: turn.id,
      number: turn.number,
      preview: turn.preview,
    })),
    [
      { id: "u1", number: 1, preview: "第一条 消息" },
      { id: "u2", number: 2, preview: "第二条" },
      { id: "u3", number: 3, preview: "空消息" },
    ],
  );
});

test("normalizeTurnPreview keeps long previews compact", () => {
  assert.equal(normalizeTurnPreview("a".repeat(8), 5), "aaaaa…");
  assert.equal(normalizeTurnPreview("  a \n b  "), "a b");
});

test("findBookmarkedTurn moves without wrapping past the rail limits", () => {
  const turns = buildTurnNavigation([
    { id: "u1", role: "user", text: "one" },
    { id: "u2", role: "user", text: "two" },
    { id: "u3", role: "user", text: "three" },
    { id: "u4", role: "user", text: "four" },
  ]);
  const bookmarks = new Set(["u1", "u3"]);

  assert.equal(findBookmarkedTurn(turns, bookmarks, "u2", "next")?.id, "u3");
  assert.equal(findBookmarkedTurn(turns, bookmarks, "u2", "previous")?.id, "u1");
  assert.equal(findBookmarkedTurn(turns, bookmarks, "u3", "next"), null);
  assert.equal(findBookmarkedTurn(turns, bookmarks, "u1", "previous"), null);
  assert.equal(findBookmarkedTurn(turns, bookmarks, null, "next")?.id, "u1");
  assert.equal(findBookmarkedTurn(turns, bookmarks, null, "previous")?.id, "u3");
});
