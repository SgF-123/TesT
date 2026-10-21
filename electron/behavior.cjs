const fs = require("node:fs");
const path = require("node:path");
const paths = require("./paths.cjs");

const DEFAULTS = Object.freeze({
  closeToTray: true,
  notifyOnComplete: true,
});

function filePath() {
  return path.join(paths.dataDir(), "behavior.json");
}

function read() {
  try {
    const data = JSON.parse(fs.readFileSync(filePath(), "utf8"));
    return {
      ...DEFAULTS,
      ...(data && typeof data === "object" ? data : {}),
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function write(patch = {}) {
  const next = { ...read(), ...patch };
  fs.mkdirSync(path.dirname(filePath()), { recursive: true });
  fs.writeFileSync(
    filePath(),
    `${JSON.stringify(next, null, 2)}\n`,
    "utf8",
  );
  return next;
}

module.exports = { read, write };
