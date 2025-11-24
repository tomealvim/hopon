import { cn } from "../../utils/cn";

export type TabKey = "discover" | "rides" | "inbox" | "profile";

export type BottomNavProps = {
  current: TabKey;
  onChange: (k: TabKey) => void;
  onPlus?: () => void; // abre o composer (sheet) com ações rápidas
};

export default function BottomNav({ current, onChange, onPlus }: BottomNavProps) {
  const isActive = (tab: TabKey) => current === tab;

  return (
    <nav 
      className="fixed left-0 right-0 bottom-0 z-50 bg-[#0a0611]/80 backdrop-blur-xl border-t border-white/10 pb-[env(safe-area-inset-bottom)] shadow-2xl shadow-black/50" 
      role="navigation" 
      aria-label="Navegação inferior"
    >
      {/* Gradiente fade no topo */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="mx-auto max-w-mobile grid grid-cols-[1fr_1fr_auto_1fr_1fr] items-center h-16 px-3 md:max-w-tablet lg:max-w-desktop">
        {/* esquerda */}
        <button
          className={cn(
            "h-10 w-full inline-flex items-center justify-center text-white/70 text-sm font-medium rounded-xl transition-all duration-200",
            isActive("discover") && "text-white bg-white/15 shadow-md shadow-white/10 ring-1 ring-white/20"
          )}
          onClick={() => onChange("discover")}
          aria-label="Explorar"
        >
          Explorar
        </button>
        <button
          className={cn(
            "h-10 w-full inline-flex items-center justify-center text-white/70 text-sm font-medium rounded-xl transition-all duration-200",
            isActive("rides") && "text-white bg-white/15 shadow-md shadow-white/10 ring-1 ring-white/20"
          )}
          onClick={() => onChange("rides")}
          aria-label="Boleias"
        >
          Boleias
        </button>

        {/* PLUS central */}
        <button
          className="relative -top-3 h-14 w-14 rounded-full bg-gradient-to-r from-[#FFE29F] via-[#FFA99F] to-[#FF719A] text-black text-[28px] leading-none inline-flex items-center justify-center shadow-[0_20px_45px_rgba(255,113,154,0.35)] hover:shadow-[0_25px_50px_rgba(255,113,154,0.5)] hover:scale-110 active:scale-95 transition-all duration-300 focus-visible:outline-2 focus-visible:outline-[#FF719A] focus-visible:outline-offset-2"
          aria-label="Adicionar"
          onClick={() => onPlus?.()}
        >
          +
        </button>

        {/* direita */}
        <button
          className={cn(
            "h-10 w-full inline-flex items-center justify-center text-white/70 text-sm font-medium rounded-xl transition-all duration-200",
            isActive("inbox") && "text-white bg-white/15 shadow-md shadow-white/10 ring-1 ring-white/20"
          )}
          onClick={() => onChange("inbox")}
          aria-label="Mensagens"
        >
          Mensagens
        </button>
        <button
          className={cn(
            "h-10 w-full inline-flex items-center justify-center text-white/70 text-sm font-medium rounded-xl transition-all duration-200",
            isActive("profile") && "text-white bg-white/15 shadow-md shadow-white/10 ring-1 ring-white/20"
          )}
          onClick={() => onChange("profile")}
          aria-label="Perfil"
        >
          Perfil
        </button>
      </div>
    </nav>
  );
}
