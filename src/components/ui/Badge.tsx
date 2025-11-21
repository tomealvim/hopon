import React from "react";
import { cn } from "../../utils/cn";

type Props = {
  children: React.ReactNode;
  tone?: "neutral" | "brand" | "success" | "warning" | "danger";
  className?: string;
};
const map = {
  neutral: "bg-gray-100 text-gray-900",
  brand: "bg-blue-100 text-blue-900",
  success: "bg-green-100 text-green-900",
  warning: "bg-amber-100 text-amber-900",
  danger: "bg-red-100 text-red-900",
};
export function Badge({ children, tone = "neutral", className }: Props) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", map[tone], className)}>
      {children}
    </span>
  );
}
