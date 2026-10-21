const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");
const paths = require("./paths.cjs");

const MAX_FILES = 150;
const MAX_HEAD_LINES = 800;
const TAIL_BYTES = 48 * 1024;
const HISTORY_CACHE_LIMIT = 24;
const cache = new Map();
const usageCache = new Map();
const historyCache = new Map();

function walkJsonl(dir, result = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return result;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkJsonl(full, result);
    } else if (entry.isFile() && entry.name.endsWith(".jsonl")) {
      result.push(full);
    }
  }
  return result;
}

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

function readTailLines(file, size) {
  if (size <= 0) {
    return [];
  }

  const start = Math.max(0, size - TAIL_BYTES);
  const length = size - start;
  const buffer = Buffer.alloc(length);
  let fd;
  try {
    fd = fs.openSync(file, "r");
    fs.readSync(fd, buffer, 0, length, start);
  } finally {
    if (fd !== undefined) {
      fs.closeSync(fd);
    }
  }

  return buffer
    .toString("utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim());
}

async function readSession(file) {
  const stat = fs.statSync(file);
  const cached = cache.get(file);
  if (
    cached &&
    cached.mtimeMs === stat.mtimeMs &&
    cached.size === stat.size
  ) {
    return cached.info;
  }

  const stream = fs.createReadStream(file, { encoding: "utf8" });
  const lines = readline.createInterface({
    input: stream,
    crlfDelay: Infinity,
  });

  let header = null;
  let name;
  let messageCount = 0;
  let firstMessage = "";
  let lastActivity = 0;
  let lineCount = 0;

  try {
    for await (const line of lines) {
      lineCount += 1;
      if (lineCount > MAX_HEAD_LINES) {
        break;
      }
      if (!line.trim()) {
        continue;
      }

      let entry;
      try {
        entry = JSON.parse(line);
      } catch {
        continue;
      }

      if (!header) {
        if (entry.type !== "session") {
          return null;
        }
        header = entry;
        continue;
      }

      if (entry.type === "session_info") {
        name = typeof entry.name === "string" ? entry.name.trim() : undefined;
        continue;
      }

      if (entry.type !== "message" || !entry.message) {
        continue;
      }

      messageCount += 1;
      const message = entry.message;
      const timestamp =
        typeof message.timestamp === "number"
          ? message.timestamp
          : typeof entry.timestamp === "string"
            ? new Date(entry.timestamp).getTime()
            : 0;
      if (Number.isFinite(timestamp)) {
        lastActivity = Math.max(lastActivity, timestamp);
      }

      const text = textFromContent(message.content).trim();
      if (text && message.role === "user" && !firstMessage) {
        firstMessage = text;
      }
    }
  } finally {
    lines.close();
    stream.destroy();
  }

  if (!header || typeof header.id !== "string") {
    return null;
  }

  // session_info is append-only and normally lives at the tail, so read the
  // last chunk without scanning a potentially huge conversation.
  for (const line of readTailLines(file, stat.size)) {
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if (entry.type === "session_info") {
      name = typeof entry.name === "string" ? entry.name.trim() : undefined;
    }
    if (entry.type === "message" && entry.message) {
      const timestamp =
        typeof entry.message.timestamp === "number"
          ? entry.message.timestamp
          : typeof entry.timestamp === "string"
            ? new Date(entry.timestamp).getTime()
            : 0;
      if (Number.isFinite(timestamp)) {
        lastActivity = Math.max(lastActivity, timestamp);
      }
    }
  }

  const created = header.timestamp ? new Date(header.timestamp) : null;
  const modified =
    lastActivity > 0
      ? new Date(lastActivity)
      : created && Number.isFinite(created.getTime())
        ? created
        : new Date(stat.mtimeMs);
  const createdIso =
    created && Number.isFinite(created.getTime())
      ? created.toISOString()
      : null;

  const info = {
    path: file,
    id: header.id,
    cwd: typeof header.cwd === "string" ? header.cwd : "",
    parentSessionPath: header.parentSession || null,
    name: name || null,
    firstMessage: firstMessage || null,
    messageCount,
    created: createdIso,
    modified: modified.toISOString(),
  };
  cache.set(file, {
    mtimeMs: stat.mtimeMs,
    size: stat.size,
    info,
  });
  return info;
}

async function listSessions() {
  const files = walkJsonl(paths.sessionsDir())
    .sort((a, b) => b.localeCompare(a))
    .slice(0, MAX_FILES);

  const sessions = [];
  for (let index = 0; index < files.length; index += 4) {
    const batch = files.slice(index, index + 4);
    const infos = await Promise.all(
      batch.map(async (file) => {
        try {
          return await readSession(file);
        } catch {
          return null;
        }
      }),
    );
    for (const info of infos) {
      if (info) {
        sessions.push(info);
      }
    }
  }

  const current = new Set(files);
  for (const file of cache.keys()) {
    if (!current.has(file)) {
      cache.delete(file);
    }
  }

  sessions.sort(
    (a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime(),
  );
  return sessions;
}

async function searchSessions(query, limit = 40) {
  const needle = String(query || "").trim().toLowerCase();
  if (needle.length < 2) {
    return [];
  }
  const sessions = await listSessions();
  const results = [];
  const max = Math.max(1, Math.min(Number(limit) || 40, 80));

  for (const info of sessions) {
    let snippet = "";
    let role = "";
    const titleHit = [info.name, info.firstMessage, info.cwd]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(needle));

    if (titleHit) {
      snippet = info.name || info.firstMessage || info.cwd;
      role = "title";
    } else {
      try {
        const stat = fs.statSync(info.path);
        if (stat.size > 8 * 1024 * 1024) {
          continue;
        }
        const lines = fs.readFileSync(info.path, "utf8").split(/\r?\n/);
        for (const line of lines) {
          if (!line.trim()) {
            continue;
          }
          let entry;
          try {
            entry = JSON.parse(line);
          } catch {
            continue;
          }
          if (entry.type !== "message" || !entry.message) {
            continue;
          }
          const text = textFromContent(entry.message.content);
          const index = text.toLowerCase().indexOf(needle);
          if (index < 0) {
            continue;
          }
          const start = Math.max(0, index - 60);
          const end = Math.min(text.length, index + needle.length + 100);
          snippet = `${start > 0 ? "…" : ""}${text.slice(start, end)}${
            end < text.length ? "…" : ""
          }`;
          role = entry.message.role || "message";
          break;
        }
      } catch {
        continue;
      }
    }

    if (snippet) {
      results.push({ ...info, snippet, role });
    }
    if (results.length >= max) {
      break;
    }
  }
  return results;
}

function localDate(timestamp) {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) {
    return "unknown";
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

async function usageStats() {
  const files = walkJsonl(paths.sessionsDir())
    .sort((a, b) => b.localeCompare(a))
    .slice(0, 400);
  const days = new Map();
  const models = new Map();
  const total = { cost: 0, tokens: 0, requests: 0 };

  for (const file of files) {
    let stat;
    try {
      stat = fs.statSync(file);
    } catch {
      continue;
    }
    let entries = usageCache.get(file);
    if (
      !entries ||
      entries.mtimeMs !== stat.mtimeMs ||
      entries.size !== stat.size
    ) {
      const parsed = [];
      try {
        const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
        for (const line of lines) {
          if (!line.trim()) {
            continue;
          }
          let entry;
          try {
            entry = JSON.parse(line);
          } catch {
            continue;
          }
          if (entry.type !== "message" || !entry.message) {
            continue;
          }
          const message = entry.message;
          if (message.role !== "assistant" || !message.usage) {
            continue;
          }
          const cost = Number(message.usage?.cost?.total);
          const tokens = Number(
            message.usage?.totalTokens ??
              (Number(message.usage?.input) || 0) +
                (Number(message.usage?.output) || 0) +
                (Number(message.usage?.cacheRead) || 0) +
                (Number(message.usage?.cacheWrite) || 0),
          );
          if (!Number.isFinite(cost) && !Number.isFinite(tokens)) {
            continue;
          }
          const timestamp =
            typeof message.timestamp === "number"
              ? message.timestamp
              : typeof entry.timestamp === "string"
                ? new Date(entry.timestamp).getTime()
                : 0;
          parsed.push({
            date: timestamp ? localDate(timestamp) : "unknown",
            provider: String(message.provider || "pi"),
            model: String(message.model || "unknown"),
            cost: Number.isFinite(cost) ? cost : 0,
            tokens: Number.isFinite(tokens) ? tokens : 0,
          });
        }
      } catch {
        continue;
      }
      entries = {
        mtimeMs: stat.mtimeMs,
        size: stat.size,
        entries: parsed,
      };
      usageCache.set(file, entries);
    }

    for (const item of entries.entries) {
      total.cost += item.cost;
      total.tokens += item.tokens;
      total.requests += 1;
      const day = days.get(item.date) || {
        date: item.date,
        cost: 0,
        tokens: 0,
        requests: 0,
      };
      day.cost += item.cost;
      day.tokens += item.tokens;
      day.requests += 1;
      days.set(item.date, day);
      const key = `${item.provider}/${item.model}`;
      const model = models.get(key) || {
        provider: item.provider,
        model: item.model,
        cost: 0,
        tokens: 0,
        requests: 0,
      };
      model.cost += item.cost;
      model.tokens += item.tokens;
      model.requests += 1;
      models.set(key, model);
    }
  }

  return {
    total,
    days: [...days.values()].sort((a, b) => a.date.localeCompare(b.date)),
    models: [...models.values()].sort((a, b) => b.cost - a.cost),
  };
}

async function readSessionMessages(file, limit = 800) {
  const stat = await fs.promises.stat(file);
  const cached = historyCache.get(file);
  if (
    cached &&
    cached.mtimeMs === stat.mtimeMs &&
    cached.size === stat.size
  ) {
    historyCache.delete(file);
    historyCache.set(file, cached);
    return cached.messages;
  }

  const messages = [];
  const stream = fs.createReadStream(file, { encoding: "utf8" });
  const lines = readline.createInterface({
    input: stream,
    crlfDelay: Infinity,
  });

  try {
    for await (const line of lines) {
      if (!line.trim()) {
        continue;
      }
      let entry;
      try {
        entry = JSON.parse(line);
      } catch {
        continue;
      }
      if (entry.type !== "message" || !entry.message) {
        continue;
      }
      const message = entry.message;
      if (message.role !== "user" && message.role !== "assistant") {
        continue;
      }
      const text = textFromContent(message.content).trim();
      if (!text) {
        continue;
      }
      messages.push({
        id: typeof entry.id === "string" ? entry.id : `m-${messages.length}`,
        role: message.role,
        text,
      });
      if (messages.length > limit * 2) {
        messages.splice(0, messages.length - limit);
      }
    }
  } finally {
    lines.close();
    stream.destroy();
  }

  const result = messages.slice(-limit);
  historyCache.delete(file);
  historyCache.set(file, {
    mtimeMs: stat.mtimeMs,
    size: stat.size,
    messages: result,
  });
  while (historyCache.size > HISTORY_CACHE_LIMIT) {
    historyCache.delete(historyCache.keys().next().value);
  }
  return result;
}

module.exports = { listSessions, searchSessions, usageStats, readSessionMessages };
