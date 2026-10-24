import assert from "node:assert/strict";
import test from "node:test";
import {
  addSessionTag,
  assignSessionTag,
  clearSessionTags,
  sessionHasTag,
  sessionTagUsage,
  toggleSessionTag,
} from "../src/session-tags.ts";
import {
  buildAnnotationContext,
  makeDraftAnnotation,
} from "../src/annotations.ts";
import {
  readScrollMemory,
  writeScrollMemory,
} from "../src/scroll-memory.ts";
import {
  appendQueueTextToDraft,
  buildQueueEntries,
  queueSignature,
  removeQueueEntry,
} from "../src/queue.ts";

test("session tags auto-assign stable colors and toggle assignments", () => {
  const created = addSessionTag(
    { tags: [], assignments: {} },
    "  紧急  修复 ",
  );
  assert.equal(created.tag?.name, "紧急 修复");
  assert.equal(created.tag?.color, "mint");

  const tagId = created.tag.id;
  const assigned = toggleSessionTag(
    created.store,
    "F:/project/session.jsonl",
    tagId,
  );
  assert.equal(
    sessionHasTag(assigned, "F:/project/session.jsonl", tagId),
    true,
  );
  assert.equal(sessionTagUsage(assigned)[tagId], 1);
  assert.equal(
    sessionTagUsage(
      assignSessionTag(assigned, "F:/project/session.jsonl", tagId),
    )[tagId],
    1,
  );

  const cleared = clearSessionTags(assigned, "F:/project/session.jsonl");
  assert.equal(sessionTagUsage(cleared)[tagId], undefined);
});

test("annotation context preserves quotes and notes as structured input", () => {
  const annotations = [
    makeDraftAnnotation("第一行\n第二行", "这里需要解释", "message-3"),
  ];
  const context = buildAnnotationContext(annotations);
  assert.match(context, /<quoted_context>/);
  assert.match(context, /> 第一行/);
  assert.match(context, /> 第二行/);
  assert.match(context, /批注：这里需要解释/);
});

test("scroll memory round-trips and rejects malformed entries", () => {
  const data = new Map();
  const storage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  };
  writeScrollMemory(
    {
      "session-a": {
        messageId: "message-3",
        offset: -80,
        top: 420,
        atBottom: false,
        updatedAt: 2,
      },
    },
    storage,
  );
  assert.deepEqual(readScrollMemory(storage)["session-a"], {
    messageId: "message-3",
    offset: -80,
    top: 420,
    atBottom: false,
    updatedAt: 2,
  });
});

test("queue helpers preserve order and remove one matching entry", () => {
  const entries = buildQueueEntries(
    ["steer now"],
    ["same", "same", "later"],
  );
  assert.deepEqual(
    entries.map((entry) => [entry.kind, entry.text]),
    [
      ["steering", "steer now"],
      ["followUp", "same"],
      ["followUp", "same"],
      ["followUp", "later"],
    ],
  );

  const remaining = removeQueueEntry(entries, entries[1]);
  assert.equal(remaining.length, 3);
  assert.equal(
    remaining.filter((entry) => entry.text === "same").length,
    1,
  );
  assert.equal(queueSignature(entries), queueSignature(entries));
  assert.notEqual(queueSignature(entries), queueSignature(remaining));
  assert.equal(appendQueueTextToDraft("current", "queued"), "queued\n\ncurrent");
});
