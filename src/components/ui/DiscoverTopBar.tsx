import { cn } from "../../utils/cn";
import type { KeyboardEvent } from "react";

export type DiscoverTab = "explore" | "for-you" | "now" | "arrive-by";

type Props = {
  active: DiscoverTab;
  onChange: (tab: DiscoverTab) => void;
  onFilter?: () => void;
  filterCount?: number;
};

const TAB_LABELS: Record<DiscoverTab, string> = {
  "explore":   "Explorar",
  "for-you":   "Para ti",
  "now":       "Agora",
  "arrive-by": "A tempo",
};

export default function DiscoverTopBar({ active, onChange, onFilter, filterCount = 0 }: Props) {
  const order: DiscoverTab[] = ["explore", "for-you", "now", "arrive-by"];

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = order.indexOf(active);
    if (e.key === "ArrowRight") { e.preventDefault(); onChange(order[Math.min(i + 1, order.length - 1)]); }
    if (e.key === "ArrowLeft")  { e.preventDefault(); onChange(order[Math.max(i - 1, 0)]); }
  };

  return (
    <div
      className="sticky top-0 z-40 bg-[#F8F9F4]/80 backdrop-blur-xl border-b border-[#D0E8DC]/40"
      role="region"
      aria-label="Navegacao Explorar"
    >
      <div
        className="mx-auto grid h-14 max-w-mobile grid-cols-[1fr_44px] items-center gap-2 px-4 md:max-w-tablet lg:max-w-desktop"
        onKeyDown={onKeyDown}
      >
        {/* Tabs */}
        <div
          className="inline-flex gap-5 items-center w-full overflow-x-auto overflow-y-hidden scrollbar-none"
          role="radiogroup"
          aria-label="Feeds"
        >
          {order.map((tab) => (
            <button
              key={tab}
              type="button"
              role="radio"
              aria-checked={active === tab}
              tabIndex={active === tab ? 0 : -1}
              className={cn(
                "relative h-14 text-sm font-semibold tracking-wide border-0 bg-transparent cursor-pointer transition-colors shrink-0 font-manrope",
                "focus-visible:outline-none",
                active === tab ? "text-[#1B4332]" : "text-[#1B4332]/40 hover:text-[#1B4332]/70"
              )}
              onClick={() => onChange(tab)}
            >
              {TAB_LABELS[tab]}
              {active === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#52B788] rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Botao de filtro */}
        <button
          type="button"
          className={cn(
            "relative inline-flex items-center justify-center w-10 h-10 rounded-xl cursor-pointer transition-colors",
            "text-[#1B4332]/60 hover:bg-[#edeee9] focus-visible:outline-none",
          )}
          aria-label="Filtros rapidos"
          onClick={onFilter}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M4 21v-7M4 10V3M12 21V12M12 9V3M20 21v-9M20 8V3" />
            <circle cx="4" cy="12" r="2" />
            <circle cx="12" cy="9" r="2" />
            <circle cx="20" cy="8" r="2" />
          </svg>
          {filterCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#52B788] text-white text-[10px] font-bold flex items-center justify-center leading-none">
              {filterCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
