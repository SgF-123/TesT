const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function file() {
  return path.join(os.homedir(), ".pi", "agent", "tesT-permissions.json");
}

function list() {
  try {
    const value = JSON.parse(fs.readFileSync(file(), "utf8"));
    return Array.isArray(value)
      ? value
          .map((item) => {
            if (typeof item === "string") {
              return item;
            }
            if (item && typeof item.command === "string") {
              return item.scope === "project"
                ? `${item.command}  [项目：${item.project || "当前项目"}]`
                : `${item.command}  [全局]`;
            }
            return "";
          })
          .filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

function clear() {
  try {
    fs.rmSync(file(), { force: true });
  } catch {
    // ignore
  }
  return { ok: true, rules: [] };
}

module.exports = { list, clear, file };
