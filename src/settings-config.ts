export type Density = "comfortable" | "compact";

export type Model = {
  id: string;
  label: string;
  short: string;
  provider: string;
  ctx: string;
  contextWindow?: number;
  badge?: string;
};

export type UpdateStatus = {
  state: string;
  message?: string;
  version?: string;
  feedUrl?: string | null;
  availableVersion?: string | null;
  percent?: number;
};

export type PiUpdateStatus = {
  state: string;
  message?: string;
  currentVersion?: string;
  latestVersion?: string;
  percent?: number;
  source?: string;
  packageName?: string;
};

export const accents = {
  mint: {
    label: "薄荷",
    light: "#1f9d74",
    lightHover: "#188561",
    dark: "#3ddc97",
    darkHover: "#63e8ad",
    softLight: "#e9f6f0",
    softDark: "#13251d",
  },
  graphite: {
    label: "石墨",
    light: "#4b4b47",
    lightHover: "#35352f",
    dark: "#cfd6d0",
    darkHover: "#e3e9e4",
    softLight: "#f0f0ed",
    softDark: "#1c2420",
  },
  ocean: {
    label: "海蓝",
    light: "#2f6fbf",
    lightHover: "#255a9c",
    dark: "#7db6ef",
    darkHover: "#9ac8f5",
    softLight: "#eaf2fc",
    softDark: "#152333",
  },
} as const;

export type AccentKey = keyof typeof accents;

export type ShortcutEntry = {
  id?: string;
  label: string;
  keys: string[];
};

export const shortcuts: ShortcutEntry[] = [
  { id: "commandPalette", label: "命令面板", keys: ["Ctrl", "K"] },
  { label: "斜杠命令", keys: ["/"] },
  { label: "文件引用", keys: ["@"] },
  { id: "newSession", label: "新建会话", keys: ["Ctrl", "N"] },
  { id: "closeTab", label: "关闭当前标签", keys: ["Ctrl", "W"] },
  { id: "cycleTab", label: "切换标签", keys: ["Ctrl", "Tab"] },
  { label: "直达标签", keys: ["Alt", "1~9"] },
  { id: "find", label: "会话内查找", keys: ["Ctrl", "F"] },
  { id: "sessionSearch", label: "搜索会话", keys: ["Ctrl", "Shift", "F"] },
  { id: "settings", label: "打开设置", keys: ["Ctrl", ","] },
  { label: "发送消息", keys: ["Enter"] },
  { label: "换行", keys: ["Shift", "Enter"] },
  { label: "关闭弹层", keys: ["Esc"] },
];

export function shortcutText(id: string, fallback: string[]) {
  try {
    const overrides = JSON.parse(
      localStorage.getItem("tesT.shortcuts") || "{}",
    );
    return typeof overrides?.[id] === "string"
      ? overrides[id]
      : fallback.join("+");
  } catch {
    return fallback.join("+");
  }
}
