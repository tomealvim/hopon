import { cn } from "../../utils/cn";

type Size = "sm" | "md" | "lg";
type Props = { src?: string; initials?: string; size?: Size; className?: string };

const sizes: Record<Size, string> = {
  sm: "w-8 h-8 text-xs",
  md: "w-11 h-11 text-sm",
  lg: "w-14 h-14 text-base",
};

export function Avatar({ src, initials, size = "md", className }: Props) {
  return (
    <div
      className={cn(
        "rounded-full bg-[#f3f4ef] border border-black/5 overflow-hidden flex items-center justify-center",
        sizes[size],
        className
      )}
    >
      {src ? (
        <img src={src} alt="" className="w-full h-full object-cover" role="presentation" aria-hidden="true" />
      ) : (
        <span className="font-semibold text-[#414844]">
          {(initials || "?").slice(0, 2).toUpperCase()}
        </span>
      )}
    </div>
  );
}
