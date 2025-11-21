import { cn } from "../../utils/cn";
import type { KeyboardEvent } from "react";

export type DiscoverTab = "explore" | "requests" | "following" | "for-you";

type Props = {
  active: DiscoverTab;
  onChange: (tab: DiscoverTab) => void;
  onFilter?: () => void; // Ajustes
};

export default function DiscoverTopBar({ active, onChange, onFilter }: Props) {
  const order: DiscoverTab[] = ["explore", "requests", "for-you"];
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = order.indexOf(active);
    if (e.key === "ArrowRight") { e.preventDefault(); onChange(order[Math.min(i + 1, order.length - 1)]); }
    if (e.key === "ArrowLeft")  { e.preventDefault(); onChange(order[Math.max(i - 1, 0)]); }
  };

  const pillClass = (tab: DiscoverTab) => cn(
    "h-9 px-2 text-xs font-bold tracking-wide text-gray-500 bg-transparent border-0 cursor-pointer inline-flex items-center rounded-lg transition-all",
    "hover:text-gray-700 hover:bg-gray-50",
    "focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 focus-visible:rounded-lg",
    active === tab && "text-gray-900 bg-gray-100 shadow-sm"
  );

  return (
    <div className="sticky top-0 z-40 bg-white border-b border-gray-200" role="region" aria-label="Navegação Explorar">
      <div className="max-w-mobile md:max-w-tablet lg:max-w-desktop mx-auto grid grid-cols-[44px_1fr_44px] items-center h-14 px-2" onKeyDown={onKeyDown}>
        <div className="w-10 h-10" aria-hidden />

        <div className="inline-flex gap-4 items-center justify-center w-full overflow-hidden scrollbar-none" role="radiogroup" aria-label="Feeds">
          <button
            type="button" role="radio"
            aria-checked={active === "explore"}
            tabIndex={active === "explore" ? 0 : -1}
            className={pillClass("explore")}
            onClick={() => onChange("explore")}
          >OFERTAS</button>

          <button
            type="button" role="radio"
            aria-checked={active === "requests"}
            tabIndex={active === "requests" ? 0 : -1}
            className={pillClass("requests")}
            onClick={() => onChange("requests")}
          >PEDIDOS</button>

          <button
            type="button" role="radio"
            aria-checked={active === "for-you"}
            tabIndex={active === "for-you" ? 0 : -1}
            className={pillClass("for-you")}
            onClick={() => onChange("for-you")}
          >PARA&nbsp;TI</button>
        </div>

        <button 
          type="button" 
          className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-transparent border-0 cursor-pointer hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 focus-visible:rounded-2xl" 
          aria-label="Ajustes" 
          onClick={onFilter}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 21v-7M4 10V3M12 21V12M12 9V3M20 21v-9M20 8V3"/>
            <circle cx="4" cy="12" r="2"/><circle cx="12" cy="9" r="2"/><circle cx="20" cy="8" r="2"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
