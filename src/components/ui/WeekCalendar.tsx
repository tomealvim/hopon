import type { UserSchedule, DaySchedule } from "../../pages/types/user";
import { normalizeUserSchedule, WEEK_DAY_META } from "../../utils/userSchedule";

interface WeekCalendarProps {
  schedule: UserSchedule;
  onBlockClick?: (day: DaySchedule["day"], blockId: string) => void;
  compact?: boolean;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 8h às 21h

export default function WeekCalendar({ schedule, onBlockClick, compact = false }: WeekCalendarProps) {
  const safeSchedule = normalizeUserSchedule(schedule);

  // Mapear dias para fácil acesso
  const dayMap = new Map<DaySchedule["day"], DaySchedule>();
  safeSchedule.days.forEach(d => dayMap.set(d.day, d));

  const hasAnyClasses = safeSchedule.days.some(d => d.blocks.length > 0);

  // Dimensões: compacto ou normal
  const hourHeight = compact ? 32 : 48;
  const headerHeight = compact ? 'h-6' : 'h-8';
  const timeColWidth = compact ? 'w-10' : 'w-12';
  const dayColWidth = compact ? 'w-14' : 'w-16';

  if (!hasAnyClasses) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="text-5xl mb-3">📅</div>
        <div className="text-sm font-semibold text-gray-900 mb-1">Sem aulas adicionadas</div>
        <div className="text-xs text-gray-500">Adiciona aulas para veres o teu horário aqui</div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto scrollbar-none">
      <div className="flex min-w-max">
        {/* Header com horas (coluna vazia + dias) */}
        <div className={`flex-shrink-0 ${timeColWidth}`}>
          <div className={`${headerHeight} border-b border-gray-200`}></div>
          {HOURS.map(h => (
            <div key={h} className="flex items-start border-b border-gray-100" style={{ height: `${hourHeight}px` }}>
              <span className={`${compact ? 'text-[8px]' : 'text-[10px]'} text-gray-500 pt-0.5`}>{h.toString().padStart(2, "0")}:00</span>
            </div>
          ))}
        </div>

        {/* Colunas dos dias */}
        {WEEK_DAY_META.map(({ key, short }) => {
          const daySchedule = dayMap.get(key);
          
          return (
            <div key={key} className={`flex-shrink-0 ${dayColWidth} border-l border-gray-200`}>
              <div className={`${headerHeight} flex items-center justify-center border-b border-gray-200`}>
                <span className={`${compact ? 'text-[10px]' : 'text-xs'} font-semibold text-gray-700`}>{short}</span>
              </div>
              
              <div className="relative">
                {HOURS.map(h => (
                  <div key={h} className="border-b border-gray-100" style={{ height: `${hourHeight}px` }} />
                ))}
                
                {/* Blocos de aulas */}
                {daySchedule?.blocks.map(block => {
                  const [startH, startM] = block.start.split(":").map(Number);
                  const [endH, endM] = block.end.split(":").map(Number);
                  
                  // Calcular posição e altura
                  const startMinutes = (startH - 8) * 60 + startM;
                  const endMinutes = (endH - 8) * 60 + endM;
                  const duration = endMinutes - startMinutes;
                  
                  const top = (startMinutes / 60) * hourHeight;
                  const minHeight = compact ? 28 : 43;
                  const height = Math.max((duration / 60) * hourHeight, minHeight);
                  
                  return (
                    <button
                      key={block.id}
                      type="button"
                      className={`absolute left-0.5 right-0.5 bg-primary/90 text-white rounded text-left hover:bg-primary transition overflow-hidden ${compact ? 'px-0.5 py-0.5' : 'px-1 py-0.5'}`}
                      style={{ top: `${top}px`, height: `${height}px` }}
                      onClick={() => onBlockClick?.(key, block.id)}
                    >
                      <div className={`${compact ? 'text-[8px]' : 'text-[10px]'} font-bold`}>{block.start}</div>
                      {block.title && <div className={`${compact ? 'text-[7px]' : 'text-[9px]'} truncate leading-tight`}>{block.title}</div>}
                      {block.room && <div className={`${compact ? 'text-[6px]' : 'text-[8px]'} text-white/80 truncate`}>{block.room}</div>}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
