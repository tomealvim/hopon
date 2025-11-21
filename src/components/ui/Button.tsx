import React from "react";
import { cn } from "../../utils/cn";
import Spinner from "./Spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger";
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
  "inline-flex items-center justify-center gap-2 rounded-2xl font-medium transition active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-[#FFE29F] via-[#FFA99F] to-[#FF719A] text-black font-semibold shadow-[0_20px_45px_rgba(255,113,154,0.35)] hover:opacity-90 focus-visible:ring-[#FF719A] ring-offset-black",
  secondary:
    "bg-white/10 text-white border border-white/20 hover:bg-white/20 focus-visible:ring-white/50 ring-offset-black",
  ghost:
    "bg-transparent text-white hover:bg-white/10 focus-visible:ring-white/50 ring-offset-black",
  danger:
    "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 ring-offset-black",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-[15px]",
  lg: "h-12 px-5 text-base",
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
