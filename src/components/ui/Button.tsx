import React from "react";
import { cn } from "../../utils/cn";
import Spinner from "./Spinner";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";
type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
};

const base =
  "inline-flex items-center justify-center gap-2 font-medium transition active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

const variants: Record<Variant, string> = {
  primary:
    "rounded-full bg-[#52B788] text-white font-semibold hover:brightness-105 active:brightness-95 focus-visible:ring-[#52B788] focus-visible:ring-offset-2 shadow-sm",
  secondary:
    "rounded-2xl bg-[#f3f4ef] text-[#1A1C19] border border-[#e7e9e4] hover:bg-[#edeee9] hover:border-[#c1c8c2] focus-visible:ring-[#52B788] ring-offset-white",
  outline:
    "rounded-full bg-white border border-[#c1c8c2] text-[#1A1C19] hover:bg-[#f3f4ef] hover:border-[#717973] focus-visible:ring-[#52B788] ring-offset-white",
  ghost:
    "rounded-2xl bg-transparent text-[#414844] hover:bg-[#f3f4ef] focus-visible:ring-[#52B788] ring-offset-white",
  danger:
    "rounded-full bg-[#ba1a1a] text-white hover:bg-[#93000a] focus-visible:ring-[#ba1a1a] ring-offset-white",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "min-h-[48px] px-4 text-[15px]",
  lg: "min-h-[52px] px-5 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  block,
  loading,
  leftIcon,
  rightIcon,
  className,
  children,
  disabled,
  ...rest
}: Props) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], block && "w-full", className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Spinner size="sm" />}
      {!loading && leftIcon && <span className="shrink-0">{leftIcon}</span>}
      <span>{children}</span>
      {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
}
