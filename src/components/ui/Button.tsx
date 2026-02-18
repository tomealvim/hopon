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
 * 3 variantes de botão na app:
 * - primary: ação principal destacada (ex.: "Começar" no onboarding) — gradiente suave
 * - outline: todas as ações normais (Cancelar, Guardar, Continuar, Adicionar, Pedir boleia, etc.) — fundo branco, borda cinzenta
 * - danger: ações destrutivas (Terminar sessão, Apagar conta, Remover em confirmações) — vermelho
 * (secondary/ghost: para fundos escuros, usar apenas em contextos específicos.)
 */
const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-gradient-start via-gradient-mid to-gradient-end text-gray-900 font-semibold shadow-[0_8px_24px_rgba(180,120,120,0.2)] hover:shadow-[0_12px_28px_rgba(180,120,120,0.25)] hover:opacity-95 active:opacity-90 focus-visible:ring-gradient-end focus-visible:ring-offset-2",
  secondary:
    "bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:border-white/30 hover:shadow-lg hover:shadow-white/10 focus-visible:ring-white/50 ring-offset-black backdrop-blur-md",
  outline:
    "bg-white border border-gray-300 text-gray-800 hover:bg-gray-50 hover:border-gray-400 focus-visible:ring-gray-400 ring-offset-white",
  ghost:
    "bg-transparent text-white hover:bg-white/10 hover:backdrop-blur-sm focus-visible:ring-white/50 ring-offset-black",
  danger:
    "bg-red-600 text-white hover:bg-red-700 hover:shadow-lg hover:shadow-red-600/30 focus-visible:ring-red-500 ring-offset-black",
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
