import { cn } from "../../utils/cn";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: "w-4 h-4 border-2",
  md: "w-8 h-8 border-3",
  lg: "w-12 h-12 border-4",
};

export default function Spinner({ size = "md", className }: SpinnerProps) {
  return (
    <div
      className={cn(
        "border-current border-t-transparent rounded-full animate-spin",
        sizes[size],
        className
      )}
      role="status"
      aria-label="A carregar"
    >
      <span className="sr-only">A carregar...</span>
    </div>
  );
}

