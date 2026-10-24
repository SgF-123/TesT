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

function removePath(cwd, relativePath) {
  if (!cwd || !relativePath) {
    return { error: "缺少要删除的路径" };
  }
  const root = path.resolve(cwd);
  const absolute = path.resolve(root, relativePath);
  if (!within(root, absolute) || absolute === root) {
    return { error: "只能删除当前工作区内的文件或文件夹，且不能删除工作区根目录" };
  }

  let stat;
  try {
    stat = fs.lstatSync(absolute);
  } catch {
    return { error: "文件或文件夹不存在" };
  }

  try {
    if (stat.isDirectory()) {
      fs.rmSync(absolute, { recursive: true, force: false });
      return {
        removed: true,
        type: "directory",
        path: path.relative(root, absolute).replace(/\\/g, "/"),
      };
    }
    fs.unlinkSync(absolute);
    return {
      removed: true,
      type: "file",
      path: path.relative(root, absolute).replace(/\\/g, "/"),
    };
  } catch (error) {
    return { error: String(error?.message || error) };
  }
}

function revertEdits(cwd, operations) {
  if (!cwd || !Array.isArray(operations) || operations.length === 0) {
    return { error: "没有可撤销的编辑记录" };
  }
  const root = path.resolve(cwd);
  const working = new Map();
  const backups = new Map();
  const touched = new Set();

  try {
    for (let index = operations.length - 1; index >= 0; index -= 1) {
      const operation = operations[index];
      const relativePath = String(operation?.path || "");
      const edits = Array.isArray(operation?.edits) ? operation.edits : [];
      if (!relativePath || edits.length === 0) {
        throw new Error("编辑记录不完整");
      }

      const absolute = path.resolve(root, relativePath);
      if (!within(root, absolute) || absolute === root) {
        throw new Error("编辑路径不在当前工作区内");
      }
      if (!backups.has(absolute)) {
        const original = fs.readFileSync(absolute, "utf8");
        backups.set(absolute, original);
        working.set(absolute, original);
      }

      let content = working.get(absolute);
      const eol = content.includes("\r\n") ? "\r\n" : "\n";
      let normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

      for (let editIndex = edits.length - 1; editIndex >= 0; editIndex -= 1) {
        const edit = edits[editIndex];
        if (
          !edit ||
          typeof edit.oldText !== "string" ||
          typeof edit.newText !== "string" ||
          !edit.newText
        ) {
          throw new Error("编辑记录缺少可撤销的文本");
        }
        const nextText = edit.newText
          .replace(/\r\n/g, "\n")
          .replace(/\r/g, "\n");
        const oldText = edit.oldText
          .replace(/\r\n/g, "\n")
          .replace(/\r/g, "\n");
        if (!normalized.includes(nextText)) {
          throw new Error(
            `文件内容已变化，无法安全撤销：${relativePath}`,
          );
        }
        normalized = normalized.replace(nextText, oldText);
      }

      content = normalized.replace(/\n/g, eol);
      working.set(absolute, content);
      fs.writeFileSync(absolute, content, "utf8");
      touched.add(path.relative(root, absolute).replace(/\\/g, "/"));
    }
    return { ok: true, files: Array.from(touched) };
  } catch (error) {
    for (const [absolute, original] of backups) {
      try {
        fs.writeFileSync(absolute, original, "utf8");
      } catch {
        // Keep the most useful error; restore the files we can.
      }
    }
    return { error: String(error?.message || error) };
  }
}

module.exports = { listFiles, readFile, removePath, revertEdits };
