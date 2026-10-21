const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const sourceRoot = path.resolve(root, "..");
const target = path.join(root, "build-resources");

fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(path.join(target, "node"), { recursive: true });
fs.mkdirSync(path.join(target, "tools"), { recursive: true });

const nodeSource = process.env.TEST_NODE || process.execPath;
if (!fs.existsSync(nodeSource)) {
  throw new Error(`node.exe not found: ${nodeSource}`);
}
fs.copyFileSync(nodeSource, path.join(target, "node", "node.exe"));

const piSource =
  process.env.TEST_PI_BUNDLE ||
  path.join(
    sourceRoot,
    "pi",
    "packages",
    "coding-agent",
    "dist",
    "bundle",
  );
if (!fs.existsSync(piSource)) {
  throw new Error(`Pi bundle not found: ${piSource}`);
}
fs.cpSync(piSource, path.join(target, "pi"), { recursive: true });
fs.copyFileSync(
  path.join(sourceRoot, "pi", "packages", "coding-agent", "package.json"),
  path.join(target, "pi", "package.json"),
);

fs.copyFileSync(
  path.join(root, "electron", "login-inject.ps1"),
  path.join(target, "tools", "login-inject.ps1"),
);

console.log(`prepared ${target}`);
