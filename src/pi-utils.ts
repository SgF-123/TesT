import type { Model } from "./settings-config";
import type { LiveTool } from "./process-types";

export function toolTarget(tool: LiveTool) {
  const args = tool.args;
  if (args && typeof args === "object") {
    const record = args as Record<string, unknown>;
    for (const key of ["path", "file", "file_path", "command", "query", "url"]) {
      if (typeof record[key] === "string" && record[key]) {
        return String(record[key]);
      }
    }
  }
  return tool.name;
}

export function previewValue(value: unknown) {
  if (value === undefined || value === null) {
    return "";
  }

  try {
    const text =
      typeof value === "string" ? value : JSON.stringify(value, null, 2);
    return text.length > 1200 ? `${text.slice(0, 1200)}…` : text;
  } catch {
    return String(value);
  }
}

export function fullValue(value: unknown) {
  if (value === undefined || value === null) {
    return "";
  }
  try {
    return typeof value === "string"
      ? value
      : JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function compactLine(value: string, limit = 150) {
  const line = value.replace(/\s+/g, " ").trim();
  return line.length > limit ? `${line.slice(0, limit)}…` : line;
}

export function extractPiThinking(message: any): string[] {
  if (!Array.isArray(message?.content)) {
    return [];
  }
  return message.content
    .filter((block: any) => block?.type === "thinking")
    .map((block: any) => String(block.thinking || "").trim())
    .filter(Boolean);
}

export function fromPiModel(item: any): Model {
  const context = Number(item?.contextWindow ?? 0);
  const contextLabel =
    context >= 1_000_000
      ? `${Math.round(context / 1_000_000)}M`
      : context >= 1_000
        ? `${Math.round(context / 1_000)}k`
        : context > 0
          ? String(context)
          : "—";
  const name = item?.name || item?.id || "未命名模型";
  return {
    id: item?.id || "",
    label: name,
    short: name,
    provider: item?.provider || "pi",
    ctx: contextLabel,
    contextWindow: context,
    badge: item?.reasoning ? "R" : undefined,
  };
}

export function extractPiText(message: any): string {
  if (!message) return "";
  if (typeof message.content === "string") return message.content;
  if (Array.isArray(message.content)) {
    return message.content
      .filter((block: any) => block?.type === "text")
      .map((block: any) => block.text ?? "")
      .join("");
  }
  return typeof message.text === "string" ? message.text : "";
}
