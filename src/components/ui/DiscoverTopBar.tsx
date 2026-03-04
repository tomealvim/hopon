import { cn } from "../../utils/cn";
import type { KeyboardEvent } from "react";

export type DiscoverTab = "explore" | "for-you";

type Props = {
  active: DiscoverTab;
  onChange: (tab: DiscoverTab) => void;
  onFilter?: () => void;
  filterCount?: number;
};

export default function DiscoverTopBar({ active, onChange, onFilter, filterCount = 0 }: Props) {
  const order: DiscoverTab[] = ["explore", "for-you"];
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = order.indexOf(active);
    if (e.key === "ArrowRight") { e.preventDefault(); onChange(order[Math.min(i + 1, order.length - 1)]); }
    if (e.key === "ArrowLeft")  { e.preventDefault(); onChange(order[Math.max(i - 1, 0)]); }
  };

  const iconButton = cn(
    "inline-flex items-center justify-center w-10 h-10 rounded-xl bg-transparent border-0 cursor-pointer text-gray-700 transition",
    "hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-gray-900 focus-visible:outline-offset-2"
  );

  return (
    <div className="sticky top-0 z-40 border-b border-gray-200 bg-white" role="region" aria-label="Navegação Explorar">
      <div className="mx-auto grid h-14 max-w-mobile grid-cols-[1fr_44px] items-center gap-2 px-4 md:max-w-tablet lg:max-w-desktop" onKeyDown={onKeyDown}>
        <div className="inline-flex gap-6 items-center w-full overflow-x-auto overflow-y-hidden scrollbar-none" role="radiogroup" aria-label="Feeds">
          {(["explore", "for-you"] as DiscoverTab[]).map((tab) => (
            <button
              key={tab}
              type="button" role="radio"
              aria-checked={active === tab}
              tabIndex={active === tab ? 0 : -1}
              className={cn(
                "relative h-14 text-sm font-semibold tracking-wide border-0 bg-transparent cursor-pointer transition-colors shrink-0",
                "focus-visible:outline-2 focus-visible:outline-gray-900 focus-visible:outline-offset-2",
                active === tab ? "text-gray-900" : "text-gray-400 hover:text-gray-700"
              )}
              onClick={() => onChange(tab)}
            >
              {tab === "explore" ? "Ofertas" : "Para ti"}
              {active === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 rounded-full" />
              )}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={cn(iconButton, "relative")}
          aria-label="Filtros rápidos"
          onClick={onFilter}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M4 21v-7M4 10V3M12 21V12M12 9V3M20 21v-9M20 8V3" />
            <circle cx="4" cy="12" r="2" />
            <circle cx="12" cy="9" r="2" />
            <circle cx="20" cy="8" r="2" />
          </svg>
          {filterCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-gray-900 text-white text-[10px] font-bold flex items-center justify-center leading-none">
              {filterCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
