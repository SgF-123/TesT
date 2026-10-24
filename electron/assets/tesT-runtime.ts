/**
 * TesT runtime inventory.
 *
 * Models frequently assume Pi stores everything under ~/.pi. TesT uses its own
 * data directory, so expose the real package and tool inventory instead of
 * making the model rediscover paths with shell commands.
 */

import fs from "node:fs";
import path from "node:path";
import { Type } from "@earendil-works/pi-ai";
import { defineTool, type ExtensionAPI } from "@earendil-works/pi-coding-agent";

type PackageEntry =
  | string
  | {
      source?: string;
      autoload?: boolean;
    };

const KNOWN_PLUGINS: Record<string, string[]> = {
  "pi-subagents": [
    "subagent",
    "subagents_enable",
    "bg_wait",
  ],
};

function manifestCount(value: unknown) {
  if (Array.isArray(value)) {
    return value.length;
  }
  return typeof value === "string" && value.trim() ? 1 : 0;
}

function readJson(file: string) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function packageSource(entry: PackageEntry) {
  if (typeof entry === "string") {
    return entry.trim();
  }
  return typeof entry?.source === "string" ? entry.source.trim() : "";
}

function npmPackageName(source: string) {
  const value = source.slice("npm:".length).trim();
  const versionAt = value.lastIndexOf("@");
  return versionAt > 0 ? value.slice(0, versionAt) : value;
}

function gitPackagePath(source: string) {
  let value = source.replace(/^git:/i, "").trim();
  if (value.startsWith("git@")) {
    const match = value.match(/^git@([^:]+):(.+)$/);
    if (!match) {
      return null;
    }
    value = match[2];
    const refAt = value.lastIndexOf("@");
    if (refAt > 0) {
      value = value.slice(0, refAt);
    }
    return {
      host: match[1],
      repo: value.replace(/\.git$/i, ""),
    };
  }
  try {
    const url = new URL(value);
    let repo = url.pathname
      .replace(/^\/+|\/+$/g, "")
      .replace(/\.git$/i, "");
    const refAt = repo.lastIndexOf("@");
    if (refAt > 0) {
      repo = repo.slice(0, refAt);
    }
    return {
      host: url.hostname,
      repo,
    };
  } catch {
    return null;
  }
}

function packageInstallPath(dataDir: string, source: string) {
  if (source.startsWith("npm:")) {
    const name = npmPackageName(source);
    return name ? path.join(dataDir, "npm", "node_modules", name) : "";
  }
  const git = gitPackagePath(source);
  if (git?.host && git.repo) {
    return path.join(dataDir, "git", git.host, git.repo);
  }
  return source ? path.resolve(dataDir, source) : "";
}

function packageInfo(
  dataDir: string,
  entry: PackageEntry,
  scope: "global" | "project",
  activeTools: Set<string>,
) {
  const source = packageSource(entry);
  if (!source) {
    return null;
  }
  const installedPath = packageInstallPath(dataDir, source);
  const manifest = installedPath
    ? readJson(path.join(installedPath, "package.json"))
    : null;
  const enabled = typeof entry === "string" || entry?.autoload !== false;
  const installed = Boolean(installedPath && fs.existsSync(installedPath));
  const name = manifest?.name || npmPackageName(source) || null;
  const knownTools = name ? KNOWN_PLUGINS[name] || [] : [];
  const activePluginTools = knownTools.filter((tool) => activeTools.has(tool));
  const status = !installed
    ? "missing"
    : !enabled
      ? "disabled"
      : knownTools.length > 0
        ? activePluginTools.length > 0
          ? "ready"
          : "tools-not-loaded"
        : "installed";
  return {
    source,
    scope,
    enabled,
    installed,
    manifestReadable: Boolean(manifest),
    path: installedPath,
    name,
    version: manifest?.version || null,
    status,
    resources: {
      extensions: manifestCount(manifest?.pi?.extensions),
      skills: manifestCount(manifest?.pi?.skills),
      prompts: manifestCount(manifest?.pi?.prompts),
    },
    expectedTools: knownTools,
    activeTools: activePluginTools,
  };
}

type PackageInfo = NonNullable<ReturnType<typeof packageInfo>>;

function directoryEntries(directory: string, kind: "extension" | "skill") {
  try {
    return fs
      .readdirSync(directory, { withFileTypes: true })
      .filter((entry) => !entry.name.startsWith("."))
      .map((entry) => {
        const target = path.join(directory, entry.name);
        const valid =
          kind === "skill"
            ? entry.isDirectory()
              ? fs.existsSync(path.join(target, "SKILL.md"))
              : /\.md$/i.test(entry.name)
            : entry.isDirectory()
              ? ["index.ts", "index.js", "index.mjs"].some((name) =>
                  fs.existsSync(path.join(target, name)),
                )
              : /\.(ts|js|mjs|cjs)$/i.test(entry.name);
        return valid ? { name: entry.name, path: target } : null;
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function runtimeInfo(pi: ExtensionAPI) {
  const dataDir = process.env.PI_CODING_AGENT_DIR || "";
  const projectDir = process.cwd();
  const projectPiDir = path.join(projectDir, ".pi");
  const settingsPath = dataDir ? path.join(dataDir, "settings.json") : "";
  const projectSettingsPath = path.join(projectPiDir, "settings.json");
  const settings = settingsPath ? readJson(settingsPath) : null;
  const projectSettings = readJson(projectSettingsPath);
  const activeToolNames = pi
    .getAllTools()
    .map((tool) => tool.name)
    .sort();
  const activeTools = new Set(activeToolNames);
  const issues: Array<{
    severity: "error" | "warning";
    message: string;
  }> = [];

  const packages: PackageInfo[] = [];
  if (Array.isArray(settings?.packages)) {
    for (const entry of settings.packages as PackageEntry[]) {
      const info = packageInfo(dataDir, entry, "global", activeTools);
      if (info) {
        packages.push(info);
      }
    }
  }
  if (Array.isArray(projectSettings?.packages)) {
    for (const entry of projectSettings.packages as PackageEntry[]) {
      const info = packageInfo(
        projectPiDir,
        entry,
        "project",
        activeTools,
      );
      if (info) {
        packages.push(info);
      }
    }
  }

  if (!dataDir) {
    issues.push({
      severity: "error",
      message: "缺少 PI_CODING_AGENT_DIR，无法定位 Pi 数据目录。",
    });
  } else if (
    fs.existsSync(settingsPath) &&
    settings === null
  ) {
    issues.push({
      severity: "error",
      message: `settings.json 无法解析：${settingsPath}`,
    });
  }
  if (
    fs.existsSync(projectSettingsPath) &&
    projectSettings === null
  ) {
    issues.push({
      severity: "error",
      message: `项目 settings.json 无法解析：${projectSettingsPath}`,
    });
  }
  for (const pkg of packages) {
    const label = pkg.name || pkg.source;
    if (!pkg.installed) {
      issues.push({
        severity: "error",
        message: `插件 ${label} 已登记但安装目录不存在：${pkg.path}`,
      });
    } else if (!pkg.manifestReadable) {
      issues.push({
        severity: "error",
        message: `插件 ${label} 的 package.json 无法读取：${pkg.path}`,
      });
    } else if (!pkg.enabled) {
      issues.push({
        severity: "warning",
        message: `插件 ${label} 已安装但处于禁用状态。`,
      });
    } else if (pkg.status === "tools-not-loaded") {
      issues.push({
        severity: "error",
        message: `插件 ${label} 已安装，但预期工具未加载：${pkg.expectedTools.join(", ")}`,
      });
    }
  }

  return {
    healthy: !issues.some((issue) => issue.severity === "error"),
    dataDir,
    projectDir,
    settingsPath,
    projectSettingsPath,
    issues,
    packages,
    extensions: dataDir
      ? directoryEntries(path.join(dataDir, "extensions"), "extension")
      : [],
    disabledExtensions: dataDir
      ? directoryEntries(
          path.join(dataDir, "extensions-disabled"),
          "extension",
        )
      : [],
    skills: dataDir
      ? directoryEntries(path.join(dataDir, "skills"), "skill")
      : [],
    projectExtensions: directoryEntries(
      path.join(projectPiDir, "extensions"),
      "extension",
    ),
    projectSkills: directoryEntries(
      path.join(projectPiDir, "skills"),
      "skill",
    ),
    activeTools: activeToolNames,
  };
}

export default function (pi: ExtensionAPI) {
  pi.registerCommand("tesT-runtime", {
    description: "显示 TesT 实际数据目录、已安装插件和当前可用工具",
    handler: async (_args, ctx) => {
      const result = runtimeInfo(pi);
      const errors = result.issues.filter(
        (issue) => issue.severity === "error",
      );
      ctx.ui.notify(
        [
          result.healthy ? "✅ 插件运行正常" : "⚠️ 插件状态异常",
          `数据目录：${result.dataDir || "未设置"}`,
          `已安装插件：${result.packages.length}`,
          ...result.packages.map(
            (pkg) =>
              `- ${pkg.name || pkg.source} ${pkg.version || ""} [${pkg.status}]` +
              (pkg.activeTools.length
                ? ` · ${pkg.activeTools.join(", ")}`
                : ""),
          ),
          ...(errors.length
            ? ["", "异常：", ...errors.map((issue) => `- ${issue.message}`)]
            : []),
          `当前工具：${result.activeTools.join(", ")}`,
        ].join("\n"),
        result.healthy ? "info" : "warning",
      );
    },
  });

  pi.registerTool(
    defineTool({
      name: "tesT_runtime_info",
      label: "TesT Runtime Info",
      description:
        "Read TesT's active Pi data directory, installed packages/extensions/skills, package health, issues, and active tool names. Use this before checking whether a plugin is installed or callable. Do not search ~/.pi instead.",
      promptGuidelines: [
        "Use tesT_runtime_info whenever the user asks about installed plugins, extensions, skills, or whether a plugin tool is callable in TesT.",
        "If tesT_runtime_info reports an unhealthy package, explain the concrete issue and path instead of running directory guesses.",
        "TesT uses PI_CODING_AGENT_DIR; never assume the global Pi data directory is ~/.pi.",
      ],
      parameters: Type.Object({}),
      async execute() {
        const result = runtimeInfo(pi);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
          details: result,
        };
      },
    }),
  );
}
