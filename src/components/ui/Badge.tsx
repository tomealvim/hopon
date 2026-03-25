import React from "react";
import { cn } from "../../utils/cn";

type Props = {
  children: React.ReactNode;
  tone?: "neutral" | "brand" | "success" | "warning" | "danger";
  className?: string;
};
const map = {
  neutral: "bg-[#f3f4ef] text-[#414844] ring-1 ring-[#e7e9e4]",
  brand:   "bg-[#1B4332] text-white",
  success: "bg-green-50 text-green-700 ring-1 ring-green-200",
  warning: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  danger:  "bg-red-50 text-red-700 ring-1 ring-red-200",
};
export function Badge({ children, tone = "neutral", className }: Props) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", map[tone], className)}>
      {children}
    </span>
  );
}
