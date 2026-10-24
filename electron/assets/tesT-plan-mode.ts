/**
 * TesT plan-mode guard.
 *
 * The desktop app writes a `plan-mode` flag next to the Pi agent directory.
 * While the flag exists, mutating tools are blocked before execution so plan
 * mode is a hard read-only boundary rather than a prompt suggestion.
 */

import fs from "node:fs";
import path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const MUTATING_TOOLS = new Set([
  "bash",
  "powershell",
  "write",
  "edit",
  "delete",
  "move",
  "rename",
  "mkdir",
  "patch",
  "apply_patch",
  "create_file",
  "str_replace",
  "multi_edit",
  "run",
  "exec",
  "shell",
]);

export default function (pi: ExtensionAPI) {
  pi.on("tool_call", async (event) => {
    const dir = process.env.PI_CODING_AGENT_DIR;
    if (!dir) {
      return undefined;
    }
    let enabled = false;
    try {
      enabled =
        fs.readFileSync(path.join(dir, "plan-mode"), "utf8").trim() ===
        "1";
    } catch {
      enabled = false;
    }
    if (!enabled) {
      return undefined;
    }
    if (!MUTATING_TOOLS.has(event.toolName)) {
      return undefined;
    }
    return {
      block: true,
      reason:
        "TesT 计划模式已开启：只允许分析和读取，写文件与执行命令被阻止。关闭计划模式后再执行。",
    };
  });
}
