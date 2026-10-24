import assert from "node:assert/strict";
import test from "node:test";
import { DraftStore } from "../src/draft-store.ts";

test("draft store updates text and notifies subscribers", () => {
  const store = new DraftStore("first");
  let changes = 0;
  const unsubscribe = store.subscribe(() => {
    changes += 1;
  });

  store.update("second");
  store.update((current) => `${current} line`);

  assert.equal(store.getSnapshot(), "second line");
  assert.equal(changes, 2);

  store.update("second line");
  assert.equal(changes, 2);

  unsubscribe();
  store.update("third");
  assert.equal(changes, 2);
});
