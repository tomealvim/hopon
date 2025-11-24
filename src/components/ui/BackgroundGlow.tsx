import { cn } from "../../utils/cn";

type BackgroundGlowProps = {
  className?: string;
};

export default function BackgroundGlow({ className }: BackgroundGlowProps) {
  return (
    <div className={cn("absolute inset-0 pointer-events-none overflow-hidden", className)}>
      {/* Rosa vibrante - topo esquerdo */}
      <div className="absolute top-32 -left-10 h-[28rem] w-[28rem] bg-pink-500/20 blur-[180px]" />
      
      {/* Roxo - topo direito */}
      <div className="absolute top-48 -right-10 h-[24rem] w-[24rem] bg-purple-500/20 blur-[160px]" />
      
      {/* Âmbar suave - fundo centro */}
      <div className="absolute bottom-0 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 bg-amber-200/15 blur-[200px]" />
      
      {/* Rosa-coral extra - meio direito (sutil) */}
      <div className="absolute top-1/2 -right-20 h-[20rem] w-[20rem] -translate-y-1/2 bg-rose-400/12 blur-[160px]" />
    </div>
  );
}


