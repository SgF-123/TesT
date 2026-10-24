import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

export type ButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "className"
> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "icon";
  size?: "sm" | "md";
  className?: string;
  icon?: ReactNode;
  iconAfter?: ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      children,
      variant = "secondary",
      size = "md",
      className,
      icon,
      iconAfter,
      ...rest
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={rest.type ?? "button"}
        className={`btn btn-${variant} btn-${size} ${className ?? ""}`}
        {...rest}
      >
        {icon ? <span className="btn-glyph">{icon}</span> : null}
        {children}
        {iconAfter ? <span className="btn-glyph">{iconAfter}</span> : null}
      </button>
    );
  },
);
