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
  "inline-flex items-center justify-center gap-2 rounded-2xl font-medium transition active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

/**
 * Variantes de botão:
 * - primary: ação principal (CTA) — fundo preto, texto branco
 * - secondary: ação secundária em contexto claro — fundo cinzento, texto preto
 * - outline: ação secundária — borda cinzenta, texto preto, fundo branco
 * - ghost: ação terciária — transparente, texto cinzento escuro
 * - danger: ações destrutivas — vermelho
 */
const variants: Record<Variant, string> = {
  primary:
    "bg-gray-900 text-white font-semibold hover:bg-gray-700 active:bg-gray-800 focus-visible:ring-gray-900 focus-visible:ring-offset-2",
  secondary:
    "bg-gray-100 text-gray-900 border border-gray-200 hover:bg-gray-200 hover:border-gray-300 focus-visible:ring-gray-400 ring-offset-white",
  outline:
    "bg-white border border-gray-300 text-gray-900 hover:bg-gray-50 hover:border-gray-400 focus-visible:ring-gray-400 ring-offset-white",
  ghost:
    "bg-transparent text-gray-700 hover:bg-gray-100 focus-visible:ring-gray-400 ring-offset-white",
  danger:
    "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 ring-offset-white",
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
