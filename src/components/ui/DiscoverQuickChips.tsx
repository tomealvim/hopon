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
                ? "bg-gray-900 text-white border-gray-900" 
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
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
