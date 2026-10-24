import assert from "node:assert/strict";
import test from "node:test";
import {
  isInactiveLspStatus,
  stripAnsi,
} from "../src/text-sanitize.ts";

test("stripAnsi removes terminal color and dim sequences", () => {
  const value = "\u001b[39m\u001b[2mLSP Inactive\u001b[22;39m";
  assert.equal(stripAnsi(value), "LSP Inactive");
});

test("inactive LSP status is recognized without hiding useful statuses", () => {
  assert.equal(
    isInactiveLspStatus(
      "language-server",
      "\u001b[39m\u001b[2mLSP Inactive\u001b[22;39m",
    ),
    true,
  );
  assert.equal(isInactiveLspStatus("lsp", "LSP ready"), false);
  assert.equal(isInactiveLspStatus("build", "Inactive"), false);
});
