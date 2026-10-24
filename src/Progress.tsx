import * as ProgressPrimitive from "@radix-ui/react-progress";

export function Progress({ value }: { value: number }) {
  return (
    <ProgressPrimitive.Root className="meter" value={value}>
      <ProgressPrimitive.Indicator
        className="meter-indicator"
        style={{ transform: `translateX(-${100 - value}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}
