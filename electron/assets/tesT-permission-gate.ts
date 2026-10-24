/**
 * TesT permission gate for destructive shell commands.
 *
 * Pi has no built-in approval step for tool calls. This extension asks the
 * desktop UI before running commands that can delete data, rewrite history,
 * change permissions, or touch system configuration.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const DANGEROUS = [
  /\brm\s+(-[a-z]*r[a-z]*f|-[a-z]*f[a-z]*r)\b/i,
  /\brmdir\s+\/s\b/i,
  /\brd\s+\/s\s+\/q\b/i,
  /\bdel\s+\/[a-z]*f\b/i,
  /\bremove-item\b[^\n]*-recurse[^\n]*-force/i,
  /\bformat\s+[a-z]:/i,
  /\bdiskpart\b/i,
  /\bbcdedit\b/i,
  /\breg\s+delete\b/i,
  /\btakeown\b/i,
  /\bicacls\b[^\n]*\/(grant|deny|reset)/i,
  /\bsudo\b/i,
  /\bchmod\b[^\n]*777/i,
  /\bchown\b/i,
  /\bgit\s+reset\s+--hard\b/i,
  /\bgit\s+clean\s+-[a-z]*f/i,
  /\bshutdown\b/i,
  /\bstop-computer\b/i,
  /\bstop-process\b[^\n]*-force/i,
  /\b(curl|wget)\b[^\n]*\|\s*(sh|bash|powershell)/i,
  /\bpowershell\b[^\n]*(-enc|-encodedcommand)\b/i,
  />\s*\/dev\/sd/i,
];

const sessionAllowed = new Set<string>();

function rulesFile() {
  return path.join(os.homedir(), ".pi", "agent", "tesT-permissions.json");
}

type PermissionRule =
  | string
  | { command: string; scope: "global" | "project"; project?: string };

function loadRules(): PermissionRule[] {
  try {
    const value = JSON.parse(fs.readFileSync(rulesFile(), "utf8"));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function saveRules(rules: PermissionRule[]) {
  const file = rulesFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify([...new Set(rules)], null, 2)}\n`);
}

function ruleMatches(rule: PermissionRule, command: string, cwd: string) {
  if (typeof rule === "string") {
    return rule === command;
  }
  return (
    rule?.command === command &&
    (rule.scope !== "project" ||
      !rule.project ||
      path.resolve(rule.project).toLowerCase() ===
        path.resolve(cwd || "").toLowerCase())
  );
}

export default function (pi: ExtensionAPI) {
  pi.registerCommand("tesT-permissions", {
    description: "查看或清空危险命令的永久授权",
    handler: async (_args, ctx) => {
      const rules = loadRules();
      if (rules.length === 0) {
        ctx.ui.notify("还没有永久允许的危险命令。", "info");
        return;
      }
      const preview = rules
        .slice(0, 8)
        .map((rule, index) =>
          typeof rule === "string"
            ? `${index + 1}. ${rule}`
            : `${index + 1}. ${rule.command} [${rule.scope}]`,
        )
        .join("\n");
      const choice = await ctx.ui.select(
        `永久允许的命令\n\n${preview}${rules.length > 8 ? "\n…" : ""}`,
        ["关闭", "清空全部"],
      );
      if (choice === "清空全部") {
        saveRules([]);
        ctx.ui.notify("已清空危险命令永久授权。", "info");
      }
    },
  });

  pi.on("tool_call", async (event, ctx) => {
    if (
      event.toolName !== "bash" &&
      event.toolName !== "powershell" &&
      event.toolName !== "exec" &&
      event.toolName !== "shell"
    ) {
      return undefined;
    }
    const command = String(event.input?.command || event.input?.cmd || "");
    if (!command) {
      return undefined;
    }
    const hit = DANGEROUS.some((pattern) => pattern.test(command));
    if (!hit) {
      return undefined;
    }
    if (
      sessionAllowed.has(command) ||
      loadRules().some((rule) =>
        ruleMatches(rule, command, String(ctx.cwd || "")),
      )
    ) {
      return undefined;
    }
    if (!ctx.hasUI) {
      return {
        block: true,
        reason:
          "TesT 危险命令防护：当前没有可用的确认界面，已默认阻止。",
      };
    }
    const preview =
      command.length > 420 ? `${command.slice(0, 420)}…` : command;
    const choice = await ctx.ui.select(
      `⚠️ 危险命令\n\n${preview}\n\n只在你确认这是预期操作时允许。`,
      ["允许一次", "本会话允许", "本项目永久允许", "全局永久允许", "阻止"],
    );
    if (choice === "本会话允许") {
      sessionAllowed.add(command);
      return undefined;
    }
    if (choice === "本项目永久允许") {
      try {
        saveRules([
          ...loadRules(),
          {
            command,
            scope: "project",
            project: String(ctx.cwd || ""),
          },
        ]);
      } catch (error) {
        sessionAllowed.add(command);
        ctx.ui.notify(
          `项目授权保存失败，已改为本会话允许：${String(error)}`,
          "warning",
        );
      }
      return undefined;
    }
    if (choice === "全局永久允许") {
      try {
        saveRules([...loadRules(), { command, scope: "global" }]);
      } catch (error) {
        sessionAllowed.add(command);
        ctx.ui.notify(
          `永久授权保存失败，已改为本会话允许：${String(error)}`,
          "warning",
        );
      }
      return undefined;
    }
    if (choice !== "允许一次") {
      return {
        block: true,
        reason: "用户阻止了这条危险命令。",
      };
    }
    return undefined;
  });
}
