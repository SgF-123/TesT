const fs = require("node:fs");
const path = require("node:path");

function textFromContent(content) {
  if (typeof content === "string") {
    return content;
  }
  if (!Array.isArray(content)) {
    return "";
  }
  return content
    .filter((item) => item && item.type === "text")
    .map((item) => item.text || "")
    .join("");
}

function truncate(value, max = 2400) {
  const text =
    typeof value === "string" ? value : JSON.stringify(value, null, 2);
  if (!text) {
    return "";
  }
  return text.length > max ? `${text.slice(0, max)}\n…（已截断）` : text;
}

function parseSession(file) {
  const text = fs.readFileSync(file, "utf8");
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  const messages = [];
  let header = null;
  let name = "";

  for (const line of lines) {
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if (!header && entry.type === "session") {
      header = entry;
      continue;
    }
    if (entry.type === "session_info" && entry.name) {
      name = String(entry.name).trim();
      continue;
    }
    if (entry.type !== "message" || !entry.message) {
      continue;
    }
    const message = entry.message;
    if (message.role === "toolResult") {
      messages.push({
        role: "tool",
        name: String(message.toolName || "tool"),
        text: truncate(message.content),
        error: Boolean(message.isError),
      });
      continue;
    }
    const content = Array.isArray(message.content)
      ? message.content
      : [];
    const toolCalls = content
      .filter((block) => block?.type === "toolCall")
      .map((block) => ({
        name: String(block.name || "tool"),
        args: truncate(block.arguments),
      }));
    const body = textFromContent(message.content);
    if (body || toolCalls.length) {
      messages.push({
        role: message.role,
        text: body,
        toolCalls,
        timestamp: message.timestamp || entry.timestamp || null,
      });
    }
  }

  return { header, name, messages };
}

function buildMarkdown(file, fallbackTitle) {
  const parsed = parseSession(file);
  const title =
    parsed.name ||
    fallbackTitle ||
    path.basename(file, ".jsonl");
  const cwd = parsed.header?.cwd || "";
  const lines = [`# ${title}`, "", `> 会话文件：${file}`];
  if (cwd) {
    lines.push(`> 工作区：${cwd}`);
  }
  lines.push(
    `> 导出时间：${new Date().toLocaleString("zh-CN")}`,
    "",
    "---",
    "",
  );

  for (const message of parsed.messages) {
    if (message.role === "tool") {
      lines.push(
        `> 工具结果${message.error ? "（失败）" : ""}：${message.name}`,
        "",
        "```",
        message.text,
        "```",
        "",
      );
      continue;
    }
    const role =
      message.role === "user"
        ? "你"
        : message.role === "assistant"
          ? "Pi"
          : message.role;
    lines.push(`## ${role}`, "");
    if (message.text) {
      lines.push(message.text, "");
    }
    for (const tool of message.toolCalls || []) {
      lines.push(
        `> 工具调用：${tool.name}`,
        "",
        "```json",
        tool.args,
        "```",
        "",
      );
    }
  }

  return lines.join("\n");
}

function exportMarkdown({ sessionPath, targetPath, title }) {
  if (!sessionPath || !fs.existsSync(sessionPath)) {
    return { error: "会话文件不存在" };
  }
  if (!targetPath) {
    return { error: "没有选择导出路径" };
  }
  try {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(
      targetPath,
      `\ufeff${buildMarkdown(sessionPath, title)}`,
      "utf8",
    );
    return { ok: true, path: targetPath };
  } catch (error) {
    return { error: String(error?.message || error) };
  }
}

function archive({ sessionPath, sessionsDir, archiveDir }) {
  const source = path.resolve(String(sessionPath || ""));
  const root = path.resolve(String(sessionsDir || ""));
  if (!source.startsWith(`${root}${path.sep}`)) {
    return { error: "拒绝归档会话目录之外的文件" };
  }
  if (!fs.existsSync(source)) {
    return { error: "会话文件不存在" };
  }
  try {
    fs.mkdirSync(archiveDir, { recursive: true });
    let target = path.join(archiveDir, path.basename(source));
    let index = 2;
    while (fs.existsSync(target)) {
      target = path.join(
        archiveDir,
        `${path.basename(source, ".jsonl")}-${index}.jsonl`,
      );
      index += 1;
    }
    fs.renameSync(source, target);
    return { ok: true, path: target };
  } catch (error) {
    return { error: String(error?.message || error) };
  }
}

function listArchived({ archiveDir }) {
  try {
    if (!fs.existsSync(archiveDir)) {
      return { sessions: [] };
    }
    const sessions = [];
    for (const name of fs.readdirSync(archiveDir)) {
      if (!name.endsWith(".jsonl")) {
        continue;
      }
      const file = path.join(archiveDir, name);
      let stat;
      try {
        stat = fs.statSync(file);
      } catch {
        continue;
      }
      let parsed = { name: "", messages: [], header: null };
      try {
        parsed = parseSession(file);
      } catch {
        // Keep the file visible even if it cannot be parsed.
      }
      const firstUser = parsed.messages.find(
        (message) => message.role === "user",
      );
      sessions.push({
        path: file,
        name:
          parsed.name ||
          firstUser?.text?.slice(0, 80) ||
          path.basename(name, ".jsonl"),
        cwd: parsed.header?.cwd || "",
        messageCount: parsed.messages.length,
        modified: stat.mtime.toISOString(),
        size: stat.size,
      });
    }
    sessions.sort(
      (a, b) =>
        new Date(b.modified).getTime() - new Date(a.modified).getTime(),
    );
    return { sessions };
  } catch (error) {
    return { sessions: [], error: String(error?.message || error) };
  }
}

function restoreArchived({ archivePath, archiveDir, sessionsDir }) {
  const source = path.resolve(String(archivePath || ""));
  const root = path.resolve(String(archiveDir || ""));
  if (
    !source.startsWith(`${root}${path.sep}`) ||
    !source.endsWith(".jsonl")
  ) {
    return { error: "拒绝恢复归档目录之外的文件" };
  }
  if (!fs.existsSync(source)) {
    return { error: "归档文件不存在" };
  }
  try {
    fs.mkdirSync(sessionsDir, { recursive: true });
    let target = path.join(sessionsDir, path.basename(source));
    let index = 2;
    while (fs.existsSync(target)) {
      target = path.join(
        sessionsDir,
        `${path.basename(source, ".jsonl")}-${index}.jsonl`,
      );
      index += 1;
    }
    fs.renameSync(source, target);
    return { ok: true, path: target };
  } catch (error) {
    return { error: String(error?.message || error) };
  }
}

module.exports = {
  archive,
  buildMarkdown,
  exportMarkdown,
  listArchived,
  restoreArchived,
};
