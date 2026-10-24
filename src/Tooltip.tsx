import type { ReactNode } from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

export function Tooltip({
  tip,
  children,
}: {
  tip: string;
  children: ReactNode;
}) {
  return (
    <TooltipPrimitive.Root delayDuration={320}>
      <TooltipPrimitive.Trigger asChild>
        <span className="tip-trigger">{children}</span>
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content className="tip-content" sideOffset={7}>
          {tip}
          <TooltipPrimitive.Arrow className="tip-arrow" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
