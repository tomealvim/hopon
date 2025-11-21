import React from "react";
import { cn } from "../../utils/cn";

type Props = {
  children: React.ReactNode;
  tone?: "neutral" | "brand" | "success" | "warning" | "danger";
  className?: string;
};
const map = {
  neutral: "bg-white/10 text-white border border-white/20",
  brand: "bg-gradient-to-r from-[#FFE29F] via-[#FFA99F] to-[#FF719A] text-black",
  success: "bg-green-500/20 text-green-300 border border-green-500/30",
  warning: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
  danger: "bg-red-500/20 text-red-300 border border-red-500/30",
};
export function Badge({ children, tone = "neutral", className }: Props) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", map[tone], className)}>
      {children}
    </span>
  );
}
