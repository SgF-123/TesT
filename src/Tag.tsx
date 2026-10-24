import type { ReactNode } from "react";

export type Tone = "gray" | "mint" | "blue" | "red" | "amber";

export function Tag({
  children,
  tone = "gray",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return <span className={`tag tag-${tone}`}>{children}</span>;
}
