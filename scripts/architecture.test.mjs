import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const preload = fs.readFileSync("electron/preload.cjs", "utf8");
const main = fs.readFileSync("electron/main.cjs", "utf8");
const app = fs.readFileSync("src/App.tsx", "utf8");
const rpcDocs = fs.readFileSync(
  "node_modules/@earendil-works/pi-coding-agent/docs/rpc-commands.md",
  "utf8",
);
const extensionDocs = fs.readFileSync(
  "node_modules/@earendil-works/pi-coding-agent/docs/rpc-extension-ui.md",
  "utf8",
);

const unique = (values) => [...new Set(values)];

test("every preload invoke channel has a main-process handler", () => {
  const invokeChannels = unique(
    [...preload.matchAll(/ipcRenderer\.invoke\("([^"]+)"/g)].map(
      (match) => match[1],
    ),
  );
  const handleChannels = new Set(
    [...main.matchAll(/ipcMain\.handle\(\s*"([^"]+)"/g)].map(
      (match) => match[1],
    ),
  );

  assert.deepEqual(
    invokeChannels.filter((channel) => !handleChannels.has(channel)),
    [],
  );
  assert.ok(invokeChannels.length >= 100);
});

test("renderer only sends documented Pi RPC commands or explicit fallbacks", () => {
  const sentTypes = unique(
    [...app.matchAll(/type:\s*"([a-z][a-z0-9_]+)"/g)].map(
      (match) => match[1],
    ),
  );
  const documented = new Set([
    ...[...rpcDocs.matchAll(/^### ([a-z][a-z0-9_]+)/gm)].map(
      (match) => match[1],
    ),
    ...[...extensionDocs.matchAll(/^### ([a-z][a-z0-9_]+)/gm)].map(
      (match) => match[1],
    ),
  ]);
  const nonRpcPayloadTypes = new Set([
    "extension_ui_response",
    "image",
    "navigate_tree",
  ]);

  assert.deepEqual(
    sentTypes.filter(
      (type) => !documented.has(type) && !nonRpcPayloadTypes.has(type),
    ),
    [],
  );
  assert.match(app, /fork-fallback-/);
  assert.match(app, /type:\s*"fork"/);
});

test("quality gates are wired into npm and CI", () => {
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  assert.match(pkg.scripts.test, /architecture\.test\.mjs/);
  assert.ok(fs.existsSync(".github/workflows/quality.yml"));
});

test("all local CommonJS requires resolve", () => {
  const files = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".cjs")) {
        files.push(fullPath);
      }
    }
  };
  visit("electron");

  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(/require\("(\.[^"]+)"\)/g)) {
      const resolved = path.resolve(path.dirname(file), match[1]);
      const candidates = [
        resolved,
        `${resolved}.cjs`,
        `${resolved}.js`,
        path.join(resolved, "index.cjs"),
        path.join(resolved, "index.js"),
      ];
      assert.ok(
        candidates.some((candidate) => fs.existsSync(candidate)),
        `${file} requires missing module ${match[1]}`,
      );
    }
  }
});
