export type LiveTool = {
  id: string;
  name: string;
  turnId?: string;
  args?: unknown;
  partial?: unknown;
  result?: unknown;
  state: "running" | "done" | "error";
  startedAt: number;
  durationMs?: number;
};

export type LiveThinking = {
  id: string;
  text: string;
  turnId?: string;
  state: "running" | "done";
  startedAt: number;
};
