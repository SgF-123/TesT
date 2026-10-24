import type { ReactNode } from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { Density } from "./settings-config";

type AppFrameProps = {
  dark: boolean;
  density: Density;
  isShell: boolean;
  children: ReactNode;
};

type AppWindowProps = {
  maxed: boolean;
  children: ReactNode;
};

export function AppFrame({
  dark,
  density,
  isShell,
  children,
}: AppFrameProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={320}>
      <div
        className={`app ${dark ? "dark" : ""} ${
          density === "compact" ? "compact" : ""
        } ${isShell ? "shell" : ""}`}
      >
        {children}
      </div>
    </TooltipPrimitive.Provider>
  );
}

export function AppWindow({ maxed, children }: AppWindowProps) {
  return (
    <div className={`desktop ${maxed ? "maxed" : ""}`}>
      <div className="window">{children}</div>
    </div>
  );
}
