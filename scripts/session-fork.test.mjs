import assert from "node:assert/strict";
import test from "node:test";
import { resolveForkTarget } from "../src/session-fork.ts";

test("fork target prefers stable message identity over duplicate text", () => {
  const messages = [
    { entryId: "entry-1", text: "same" },
    { entryId: "entry-2", text: "same" },
    { entryId: "entry-3", text: "latest" },
  ];

  assert.equal(
    resolveForkTarget(messages, ["user-1", "user-2", "user-3"], {
      messageId: "user-1",
      text: "same",
    })?.entryId,
    "entry-1",
  );
});

test("fork target falls back to text and then latest entry", () => {
  const messages = [
    { entryId: "entry-1", text: "first" },
    { entryId: "entry-2", text: "second" },
  ];

  assert.equal(
    resolveForkTarget(messages, ["other"], {
      messageId: "missing",
      text: "first",
    })?.entryId,
    "entry-1",
  );
  assert.equal(
    resolveForkTarget(messages, ["other"], {
      messageId: "missing",
      text: "missing",
    })?.entryId,
    "entry-2",
  );
  assert.equal(resolveForkTarget([], [], { text: "x" }), null);
});
