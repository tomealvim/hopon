import { cn } from "../../utils/cn";
import type { DiscoverFilters } from "../../pages/types/discover";

type Props = {
  filters: DiscoverFilters;
  onToggle: (chip: string) => void;
};

const ALL = [
  { id: "today", label: "Hoje" },
  { id: "tomorrow", label: "Amanhã" },
  { id: "morning", label: "Manhã" },
  { id: "afternoon", label: "Tarde" },
  { id: "evening", label: "Noite" },
  { id: "lte20min", label: "≤ 20 min" },
  { id: "seats3plus", label: "3+ lugares" },
  { id: "verified", label: "Verificados" },
];

export default function DiscoverQuickChips({ filters, onToggle }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none" role="group" aria-label="Filtros rápidos">
      {ALL.map(c => {
        const active = filters.chips.includes(c.id);
        return (
          <button
            key={c.id}
            type="button"
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all",
              active 
                ? "bg-[#1B4332] text-white border-[#1B4332]" 
                : "bg-white text-[#414844] border-[#e7e9e4] hover:bg-[#f3f4ef]"
            )}
            aria-pressed={active}
            onClick={() => onToggle(c.id)}
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
}
