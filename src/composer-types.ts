import type { ReactNode } from "react";

export type ContextAttachment = {
  id: string;
  path: string;
  name: string;
  size: number;
  kind: "text" | "image";
  mimeType?: string;
  text?: string;
  data?: string;
};

export type SlashCommand = {
  name: string;
  label: string;
  desc: string;
  icon: ReactNode;
  run: () => void;
  tag?: string;
};
