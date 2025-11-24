import { useEffect, useMemo, useState, useRef } from "react";
import { cn } from "../../utils/cn";

type RideType = "request" | "offer" | "confirmed";

export interface CalendarRide {
  id: string;
  type: RideType;
  time: string; // "HH:MM"
  origin: string;
  destination: string;
  seats?: number;
  driver?: string;
  passenger?: string;
}

export interface DayRides {
  date: string; // "YYYY-MM-DD"
  rides: CalendarRide[];
}

interface RidesCalendarProps {
  rides: DayRides[];
  onRideClick?: (ride: CalendarRide) => void;
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default function RidesCalendar({ rides, onRideClick }: RidesCalendarProps) {
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Gerar todos os dias (14 dias no total para navegação)
  const allDays = useMemo(() => {
    const today = new Date();
    const days = [];
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];
      const dayRides = rides.find(r => r.date === dateStr);
      
      let dayLabel = "Hoje";
      if (i === 1) dayLabel = "Amanhã";
      else if (i >= 2) dayLabel = WEEKDAYS[date.getDay()];
      
      days.push({
        date: dateStr,
        dayOfWeek: WEEKDAYS[date.getDay()],
        dayLabel,
        dayOfMonth: date.getDate(),
        month: MONTHS[date.getMonth()],
        isToday: i === 0,
        rides: dayRides?.rides || [],
      });
    }
    return days;
  }, [rides]);

  // Nota: renderizamos todas as colunas para permitir scroll-snap estável

  const canGoBack = selectedDayIndex > 0;
  const canGoForward = selectedDayIndex < allDays.length - 3;

  const hasAnyRides = allDays.some(d => d.rides.length > 0);

  // Sincroniza o scroll físico com o índice selecionado
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const visibleCols = 3;
    const colWidth = el.clientWidth / visibleCols;
    el.scrollTo({ left: colWidth * selectedDayIndex, behavior: 'smooth' });
  }, [selectedDayIndex]);

  const handlePrevious = () => {
    if (canGoBack) {
      setSelectedDayIndex(prev => Math.max(0, prev - 1));
    }
  };

  const handleNext = () => {
    if (canGoForward) {
      setSelectedDayIndex(prev => Math.min(allDays.length - 3, prev + 1));
    }
  };

  const handleDayClick = (dayIndex: number) => {
    if (dayIndex >= 0) {
      const clamped = Math.max(0, Math.min(allDays.length - 3, dayIndex));
      setSelectedDayIndex(clamped);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  // Nota: usamos snapping por scroll, por isso não precisamos de lógica de swipe aqui

  if (!hasAnyRides) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center border border-white/10 bg-white/5 backdrop-blur-sm rounded-2xl">
        <div className="text-5xl mb-3">🚗</div>
        <div className="text-sm font-semibold text-white mb-1">Sem boleias agendadas</div>
        <div className="text-xs text-white/60">As tuas próximas boleias aparecerão aqui</div>
      </div>
    );
  }

  return (
    <div className="border border-white/10 bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <button
          type="button"
          className="min-w-[44px] h-9 flex items-center justify-center text-xl text-white/70 hover:bg-white/10 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
          onClick={handlePrevious}
          disabled={!canGoBack}
          aria-label="Dia anterior"
        >
          ‹
        </button>
        
        <div className="text-xs font-semibold text-white whitespace-nowrap">
          {allDays[selectedDayIndex]?.dayOfMonth} {allDays[selectedDayIndex]?.month} - {allDays[selectedDayIndex + 2]?.dayOfMonth} {allDays[selectedDayIndex + 2]?.month}
        </div>

        <button
          type="button"
          className="min-w-[44px] h-9 flex items-center justify-center text-xl text-white/70 hover:bg-white/10 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
          onClick={handleNext}
          disabled={!canGoForward}
          aria-label="Próximo dia"
        >
          ›
        </button>
      </div>

      <div
        ref={containerRef}
        className="grid auto-cols-[33.333%] grid-flow-col overflow-x-auto snap-x snap-mandatory scrollbar-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={(e) => {
          const el = e.currentTarget as HTMLDivElement;
          const visibleCols = 3;
          if (allDays.length === 0) return;
          const colWidth = el.clientWidth / visibleCols; // largura de 1 coluna visível
          const rawIndex = Math.round(el.scrollLeft / colWidth);
          const clamped = Math.max(0, Math.min(allDays.length - visibleCols, rawIndex));
          setSelectedDayIndex(clamped);
          el.scrollTo({ left: colWidth * clamped, behavior: 'smooth' });
        }}
      >
        {allDays.map((day, idx) => {
          return (
            <div key={day.date} className="snap-start border-r border-white/10 last:border-r-0">
              <button
                type="button"
                className={cn(
                  "w-full flex flex-col items-center gap-0.5 py-2 border-b border-white/10 transition",
                  day.isToday && "bg-primary/20",
                  idx === selectedDayIndex && "bg-primary/30"
                )}
                onClick={() => handleDayClick(idx)}
                aria-label={`Ver ${day.dayLabel}`}
                aria-pressed={idx === selectedDayIndex}
              >
                <div className="text-[10px] text-white/60 uppercase font-medium">{day.dayLabel}</div>
                <div className="text-lg font-bold text-white">{day.dayOfMonth}</div>
              </button>

              <div className="p-2 space-y-2 min-h-[120px]">
                {day.rides.length === 0 ? (
                  <div className="text-center text-white/30 text-2xl pt-8">—</div>
                ) : (
                  day.rides.map((ride) => (
                    <button
                      key={ride.id}
                      type="button"
                      className={cn(
                        "w-full text-left p-2 rounded-lg border transition hover:shadow-md",
                        ride.type === "offer" && "bg-emerald-500/20 border-emerald-500/30 hover:bg-emerald-500/30",
                        ride.type === "request" && "bg-blue-500/20 border-blue-500/30 hover:bg-blue-500/30",
                        ride.type === "confirmed" && "bg-purple-500/20 border-purple-500/30 hover:bg-purple-500/30"
                      )}
                      onClick={() => onRideClick?.(ride)}
                    >
                      <div className="text-xs font-bold text-white mb-1">{ride.time}</div>
                      <div className="flex items-center gap-1 text-[10px] text-white/80 mb-1">
                        <div className="truncate max-w-[60px]">{truncate(ride.origin, 15)}</div>
                        <div className="flex-shrink-0">→</div>
                        <div className="truncate max-w-[60px]">{truncate(ride.destination, 15)}</div>
                      </div>
                      {ride.type === "offer" && ride.seats && (
                        <div className="text-[9px] text-emerald-300 font-medium">{ride.seats} lugar{ride.seats > 1 ? "es" : ""}</div>
                      )}
                      {ride.type === "confirmed" && ride.driver && (
                        <div className="text-[9px] text-purple-300 font-medium">c/ {ride.driver}</div>
                      )}
                      {ride.type === "request" && (
                        <div className="text-[9px] text-blue-300 font-medium">Pendente</div>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + "…";
}
