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
    "bg-black text-white hover:bg-black/90 focus-visible:ring-black ring-offset-white",
  secondary:
    "bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-300 ring-offset-white",
  ghost:
    "bg-transparent text-gray-900 hover:bg-gray-100 focus-visible:ring-gray-300 ring-offset-white",
  danger:
    "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 ring-offset-white",
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
