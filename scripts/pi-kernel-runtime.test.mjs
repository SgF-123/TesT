import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { piNodePath } = require("../electron/pi-bridge.cjs");
const { stageRuntimeDependencies } = require("../electron/kernel-deps.cjs");
const { extractTarball, tarExecutable } = require("../electron/tarball.cjs");

const tempDirs = [];
const tempDir = (prefix) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `tesT-${prefix}-`));
  tempDirs.push(dir);
  return dir;
};

test.after(() => {
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// The test runner may itself be started by a TesT build, so ignore any ambient
// NODE_PATH unless a test sets one on purpose.
function withoutAmbientNodePath(fn) {
  const previous = process.env.NODE_PATH;
  delete process.env.NODE_PATH;
  try {
    return fn();
  } finally {
    if (previous !== undefined) {
      process.env.NODE_PATH = previous;
    }
  }
}

// Mirrors the layout the Pi updater produces under the data directory.
function installedKernelCli() {
  return path.join(
    tempDir("kernel"),
    "package",
    "dist",
    "bundle",
    "cli.js",
  );
}

test("downloaded kernels get the app vendor on NODE_PATH", () => {
  const vendor = tempDir("vendor");
  const cli = installedKernelCli();

  const entries = withoutAmbientNodePath(() =>
    piNodePath(cli, vendor).split(path.delimiter),
  );

  assert.equal(entries[0], vendor);
  assert.ok(
    !entries.some((entry) => entry.endsWith(path.join("dist", "vendor"))),
    "vendor must not be derived from the CLI location",
  );
});

test("the bundled kernel keeps its adjacent vendor as a fallback", () => {
  const resources = tempDir("resources");
  const cli = path.join(resources, "pi", "cli.js");
  const adjacent = path.join(resources, "vendor");
  fs.mkdirSync(adjacent, { recursive: true });

  const entries = withoutAmbientNodePath(() =>
    piNodePath(cli, "").split(path.delimiter),
  );

  assert.deepEqual(entries, [adjacent]);
});

test("an existing NODE_PATH is preserved", () => {
  const previous = process.env.NODE_PATH;
  const inherited = tempDir("inherited");
  process.env.NODE_PATH = inherited;
  try {
    const vendor = tempDir("vendor");
    const entries = piNodePath(installedKernelCli(), vendor).split(
      path.delimiter,
    );
    assert.deepEqual(entries, [vendor, inherited]);
  } finally {
    if (previous === undefined) {
      delete process.env.NODE_PATH;
    } else {
      process.env.NODE_PATH = previous;
    }
  }
});

test("kernel installs stage lazily loaded dependencies", () => {
  const vendor = tempDir("vendor");
  const jitiSource = path.join(vendor, "jiti");
  fs.mkdirSync(jitiSource, { recursive: true });
  fs.writeFileSync(
    path.join(jitiSource, "package.json"),
    JSON.stringify({ name: "jiti", version: "2.7.0", main: "index.js" }),
  );
  fs.writeFileSync(path.join(jitiSource, "index.js"), "module.exports = {};");

  const cli = installedKernelCli();
  const packageTarget = path.resolve(cli, "..", "..", "..");
  const staged = stageRuntimeDependencies(packageTarget, vendor);

  assert.deepEqual(staged, ["jiti"]);
  const requireFromKernel = createRequire(cli);
  assert.equal(
    requireFromKernel.resolve("jiti"),
    path.join(packageTarget, "node_modules", "jiti", "index.js"),
  );
});

test("staging is a no-op without a vendor folder", () => {
  const cli = installedKernelCli();
  const packageTarget = path.resolve(cli, "..", "..", "..");

  assert.deepEqual(stageRuntimeDependencies(packageTarget, ""), []);
  assert.equal(fs.existsSync(path.join(packageTarget, "node_modules")), false);
});

test("the npm tarball extracts regardless of the tar on PATH", () => {
  const dir = tempDir("tarball");
  fs.writeFileSync(path.join(dir, "payload.txt"), "kernel");
  execFileSync(tarExecutable(), ["-czf", "payload.tgz", "payload.txt"], {
    cwd: dir,
    windowsHide: true,
    stdio: "ignore",
  });

  const target = path.join(dir, "out");
  extractTarball(path.join(dir, "payload.tgz"), target);

  assert.equal(
    fs.readFileSync(path.join(target, "payload.txt"), "utf8"),
    "kernel",
  );
});

test("Windows prefers the tar that ships with the OS", () => {
  if (process.platform !== "win32") {
    assert.equal(tarExecutable(), "tar");
    return;
  }
  const systemRoot = process.env.SystemRoot || "C:\\Windows";
  const systemTar = path.join(systemRoot, "System32", "tar.exe");
  assert.equal(
    tarExecutable(),
    fs.existsSync(systemTar) ? systemTar : "tar",
  );
});
