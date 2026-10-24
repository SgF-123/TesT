export type SessionStats = {
  sessionFile?: string;
  sessionId?: string;
  userMessages: number;
  assistantMessages: number;
  toolCalls: number;
  toolResults: number;
  totalMessages: number;
  tokens: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    total: number;
  };
  cost?: number;
  contextUsage?: {
    tokens: number | null;
    contextWindow: number;
    percent: number | null;
  };
};

export type UsageStats = TesTUsageStats;

export function formatTokenCount(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0";
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${Math.round(value / 1_000)}k`;
  }
  return String(Math.round(value));
}

export function formatCost(value?: number) {
  if (!Number.isFinite(value)) {
    return "—";
  }
  if ((value ?? 0) <= 0) {
    return "$0.00";
  }
  return value! >= 0.01 ? `$${value!.toFixed(2)}` : `$${value!.toFixed(4)}`;
}

export function messageCount(stats?: SessionStats | null) {
  return stats
    ? stats.userMessages + stats.assistantMessages + stats.toolResults
    : 0;
}
