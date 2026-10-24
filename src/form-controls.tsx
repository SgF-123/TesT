import type { ReactNode } from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { Check as CheckNode, Minus as MinusNode } from "lucide";
import { Check } from "lucide-react";
import { MorphIcon } from "morphicons/react";

export function Switch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <SwitchPrimitive.Root
      className={`switch ${checked ? "on" : ""}`}
      checked={checked}
      onCheckedChange={onChange}
    >
      <SwitchPrimitive.Thumb className="switch-thumb">
        <MorphIcon
          icon={checked ? CheckNode : MinusNode}
          size={9}
          strokeWidth={3}
          spring="smooth"
          reducedMotion="user"
          aria-hidden="true"
        />
      </SwitchPrimitive.Thumb>
    </SwitchPrimitive.Root>
  );
}

export function Checkbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <CheckboxPrimitive.Root
      className={`checkbox ${checked ? "on" : ""}`}
      checked={checked}
      onCheckedChange={onChange}
    >
      <CheckboxPrimitive.Indicator>
        <Check size={11} strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export function Segmented({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string; icon?: ReactNode }[];
  onChange: (value: string) => void;
}) {
  return (
    <RadioGroupPrimitive.Root
      className="segmented"
      value={value}
      onValueChange={onChange}
    >
      {options.map((option) => (
        <RadioGroupPrimitive.Item
          key={option.value}
          value={option.value}
          className="segmented-item"
        >
          {option.icon ? (
            <span className="segmented-icon">{option.icon}</span>
          ) : null}
          {option.label}
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  );
}
