import React from "react";
import { cn } from "../../utils/cn";

type Props = {
  children: React.ReactNode;
  tone?: "neutral" | "brand" | "success" | "warning" | "danger";
  className?: string;
};
const map = {
  neutral: "bg-white/10 text-white/90 ring-1 ring-white/20 shadow-sm",
  brand: "bg-gradient-to-r from-gradient-start via-gradient-mid to-gradient-end text-gray-900 font-semibold shadow-sm",
  success: "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40 shadow-sm shadow-emerald-500/10",
  warning: "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40 shadow-sm shadow-amber-500/10",
  danger: "bg-red-500/20 text-red-300 ring-1 ring-red-500/40 shadow-sm shadow-red-500/10",
};
export function Badge({ children, tone = "neutral", className }: Props) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", map[tone], className)}>
      {children}
    </span>
  );
}
