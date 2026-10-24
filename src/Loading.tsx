import { memo } from "react";
import { DotWave, Ring2 } from "ldrs/react";
import "ldrs/react/DotWave.css";
import "ldrs/react/Ring2.css";

export const DotSpinner = memo(function DotSpinner({
  size = 24,
  speed = 1.1,
}: {
  size?: number;
  speed?: number;
}) {
  return (
    <span className="dot-spinner" aria-hidden="true">
      <DotWave size={size} speed={speed} color="var(--accent)" />
    </span>
  );
});

export const LoadingRing = memo(function LoadingRing({
  size = 12,
  speed = 0.9,
}: {
  size?: number;
  speed?: number;
}) {
  return (
    <span className="loading-ring" aria-hidden="true">
      <Ring2
        size={size}
        speed={speed}
        stroke={2}
        color="var(--accent)"
        bgOpacity={0.14}
      />
    </span>
  );
});
