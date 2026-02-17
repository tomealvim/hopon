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
      className="fixed left-0 right-0 bottom-0 z-50 bg-white/95 backdrop-blur-xl border-t border-gray-200 pb-[env(safe-area-inset-bottom)] shadow-lg shadow-black/5" 
      role="navigation" 
      aria-label="Navegação inferior"
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
      <div className="mx-auto max-w-mobile grid grid-cols-[1fr_1fr_auto_1fr_1fr] items-center h-16 px-3 md:max-w-tablet lg:max-w-desktop">
        <button
          className={cn(
            "h-10 w-full inline-flex items-center justify-center text-gray-600 text-sm font-medium rounded-xl transition-all duration-200",
            isActive("discover") && "text-gray-900 bg-gray-100 shadow-sm ring-1 ring-gray-200"
          )}
          onClick={() => onChange("discover")}
          aria-label="Explorar"
        >
          Explorar
        </button>
        <button
          className={cn(
            "h-10 w-full inline-flex items-center justify-center text-gray-600 text-sm font-medium rounded-xl transition-all duration-200",
            isActive("rides") && "text-gray-900 bg-gray-100 shadow-sm ring-1 ring-gray-200"
          )}
          onClick={() => onChange("rides")}
          aria-label="Boleias"
        >
          Boleias
        </button>

        <button
          className="relative -top-3 h-14 w-14 rounded-full bg-gradient-to-r from-gradient-start via-gradient-mid to-gradient-end text-gray-900 text-[28px] leading-none inline-flex items-center justify-center shadow-[0_10px_30px_rgba(180,120,120,0.25)] hover:opacity-95 hover:scale-105 active:scale-95 transition-all duration-300 focus-visible:outline-2 focus-visible:outline-gradient-end focus-visible:outline-offset-2"
          aria-label="Adicionar"
          onClick={() => onPlus?.()}
        >
          +
        </button>

        <button
          className={cn(
            "h-10 w-full inline-flex items-center justify-center text-gray-600 text-sm font-medium rounded-xl transition-all duration-200",
            isActive("inbox") && "text-gray-900 bg-gray-100 shadow-sm ring-1 ring-gray-200"
          )}
          onClick={() => onChange("inbox")}
          aria-label="Mensagens"
        >
          Mensagens
        </button>
        <button
          className={cn(
            "h-10 w-full inline-flex items-center justify-center text-gray-600 text-sm font-medium rounded-xl transition-all duration-200",
            isActive("profile") && "text-gray-900 bg-gray-100 shadow-sm ring-1 ring-gray-200"
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
