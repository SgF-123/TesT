const fs = require("node:fs");
const path = require("node:path");

const SKIP_DIRS = new Set([
  ".git",
  ".hg",
  ".svn",
  "node_modules",
  "dist",
  "release",
  "build",
  "out",
  ".next",
  ".nuxt",
  ".cache",
  ".turbo",
  "coverage",
  "data",
  "logs",
  "work",
  "tmp",
  "target",
  "vendor",
  "__pycache__",
]);

const MAX_FILES = 4000;
const MAX_DEPTH = 12;
const MAX_READ = 2 * 1024 * 1024;
const SKIP_EXT = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".bmp",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".eot",
  ".mp3",
  ".wav",
  ".mp4",
  ".mov",
  ".pdf",
  ".zip",
  ".7z",
  ".rar",
  ".gz",
  ".exe",
  ".dll",
  ".node",
  ".wasm",
  ".map",
]);

function within(root, target) {
  const relative = path.relative(root, target);
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

function listFiles(cwd) {
  if (!cwd) {
    return { files: [], error: "缺少工作区路径" };
  }
  const root = path.resolve(cwd);
  const files = [];
  let truncated = false;

  function walk(directory, depth) {
    if (files.length >= MAX_FILES) {
      truncated = true;
      return;
    }
    if (depth > MAX_DEPTH) {
      return;
    }
    let entries;
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true });
    } catch {
      return;
    }
    entries.sort((a, b) => {
      if (a.isDirectory() !== b.isDirectory()) {
        return a.isDirectory() ? -1 : 1;
      }
      return a.name.localeCompare(b.name, "zh-CN");
    });
    for (const entry of entries) {
      if (files.length >= MAX_FILES) {
        truncated = true;
        return;
      }
      if (entry.name.startsWith(".") && entry.name !== ".env") {
        continue;
      }
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) {
          continue;
        }
        walk(path.join(directory, entry.name), depth + 1);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      if (SKIP_EXT.has(path.extname(entry.name).toLowerCase())) {
        continue;
      }
      const absolute = path.join(directory, entry.name);
      let size = 0;
      try {
        size = fs.statSync(absolute).size;
      } catch {
        continue;
      }
      files.push({
        path: path.relative(root, absolute).replace(/\\/g, "/"),
        name: entry.name,
        size,
      });
    }
  }

  walk(root, 0);
  return { files, truncated, root };
}

function readFile(cwd, relativePath) {
  if (!cwd || !relativePath) {
    return { error: "缺少文件路径" };
  }
  const root = path.resolve(cwd);
  const absolute = path.resolve(root, relativePath);
  if (!within(root, absolute) || absolute === root) {
    return { error: "文件不在当前工作区内" };
  }
  let stat;
  try {
    stat = fs.statSync(absolute);
  } catch {
    return { error: "文件不存在或不可读取" };
  }
  if (!stat.isFile()) {
    return { error: "只能预览文件" };
  }
  if (stat.size > MAX_READ) {
    return {
      error: `文件超过 ${Math.round(MAX_READ / 1024 / 1024)} MB，未载入`,
      size: stat.size,
    };
  }
  let buffer;
  try {
    buffer = fs.readFileSync(absolute);
  } catch (error) {
    return { error: String(error?.message || error) };
  }
  const binary = buffer.subarray(0, 8000).includes(0);
  return {
    path: relativePath.replace(/\\/g, "/"),
    size: stat.size,
    mtime: stat.mtimeMs,
    binary,
    text: binary ? "" : buffer.toString("utf8"),
  };
}

module.exports = { listFiles, readFile };
