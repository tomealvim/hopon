import { cn } from "../../utils/cn";

type BackgroundGlowProps = {
  className?: string;
};

export default function BackgroundGlow({ className }: BackgroundGlowProps) {
  return (
    <div className={cn("absolute inset-0 pointer-events-none overflow-hidden", className)}>
      <div className="absolute top-32 -left-10 h-[28rem] w-[28rem] bg-gray-300/5 blur-[180px]" />
      <div className="absolute top-48 -right-10 h-[24rem] w-[24rem] bg-gray-300/5 blur-[160px]" />
      <div className="absolute bottom-0 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 bg-gray-200/5 blur-[200px]" />
    </div>
  );
}


