import { useMemo, useState } from "react";
import type { DaySchedule, TimeBlock, UserSchedule } from "../../pages/types/user";
import TimePicker from "./TimePicker";

const DAY_OPTIONS: Array<{ value: DaySchedule["day"]; label: string }> = [
  { value: "segunda", label: "Segunda" },
  { value: "terca", label: "Terça" },
  { value: "quarta", label: "Quarta" },
  { value: "quinta", label: "Quinta" },
  { value: "sexta", label: "Sexta" },
  { value: "sabado", label: "Sábado" },
];

const DAY_ORDER: Record<DaySchedule["day"], number> = {
  segunda: 1,
  terca: 2,
  quarta: 3,
  quinta: 4,
  sexta: 5,
  sabado: 6,
};

interface ScheduleReviewCardsProps {
  schedule: UserSchedule;
  onChange: (schedule: UserSchedule) => void;
  onSkip?: () => void;
  onConfirm?: () => void;
}

export default function ScheduleReviewCards({ schedule, onChange, onSkip, onConfirm }: ScheduleReviewCardsProps) {
  const [local, setLocal] = useState<UserSchedule>(schedule);

  const flat = useMemo(() => {
    const items: Array<{ day: DaySchedule["day"]; block: TimeBlock }> = [];
    local.days.forEach(d => d.blocks.forEach(b => items.push({ day: d.day, block: b })));
    return items.sort((a, b) => {
      // Primeiro ordena por dia da semana
      const dayDiff = DAY_ORDER[a.day] - DAY_ORDER[b.day];
      if (dayDiff !== 0) return dayDiff;
      // Depois ordena por hora de início
      return a.block.start.localeCompare(b.block.start);
    });
  }, [local]);

  const updateItem = (idx: number, partial: Partial<TimeBlock> & { day?: DaySchedule["day"] }) => {
    const item = flat[idx];
    if (!item) return;
    const newLocal: UserSchedule = { days: local.days.map(d => ({ ...d, blocks: [...d.blocks] })) };
    // remove from old day
    const fromDay = newLocal.days.find(d => d.day === item.day);
    if (!fromDay) return;
    const bi = fromDay.blocks.findIndex(b => b.id === item.block.id);
    if (bi < 0) return;
    const updated: TimeBlock = { ...fromDay.blocks[bi], ...partial };
    fromDay.blocks.splice(bi, 1);
    const toDayKey = partial.day || item.day;
    let toDay = newLocal.days.find(d => d.day === toDayKey);
    if (!toDay) { toDay = { day: toDayKey, blocks: [] }; newLocal.days.push(toDay); }
    toDay.blocks.push(updated);
    toDay.blocks.sort((a,b)=>a.start.localeCompare(b.start));
    setLocal(newLocal);
    onChange(newLocal);
  };

  const removeItem = (idx: number) => {
    const item = flat[idx];
    if (!item) return;
    const newLocal: UserSchedule = { days: local.days.map(d => ({ ...d, blocks: d.blocks.filter(b => b.id !== item.block.id) })) };
    setLocal(newLocal);
    onChange(newLocal);
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-3">
        {flat.length === 0 && <div className="text-center text-gray-500 py-8 text-sm">Sem horários detetados</div>}
        {flat.map((item, idx) => (
          <div key={item.block.id} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="grid gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Dia da semana</label>
                <select
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  value={item.day}
                  onChange={(e)=>updateItem(idx, { day: e.target.value as DaySchedule["day"] })}
                >
                  {DAY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Destino / Descrição</label>
                <input
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  value={item.block.title || ""}
                  onChange={(e)=>updateItem(idx, { title: e.target.value })}
                  placeholder="Ex: Trabalho, IST, Faculdade..."
                  title="Editar destino"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <TimePicker
                  label="Início"
                  value={item.block.start}
                  onChange={(v) => updateItem(idx, { start: v })}
                />
                <TimePicker
                  label="Fim"
                  value={item.block.end}
                  onChange={(v) => updateItem(idx, { end: v })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Local</label>
                <input
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  value={item.block.room || ""}
                  onChange={(e)=>updateItem(idx, { room: e.target.value })}
                  placeholder="Ex: Edifício A..."
                  title="Editar local"
                />
              </div>

              <div>
                <button className="text-xs text-red-600 hover:underline" onClick={()=>removeItem(idx)}>Remover horário</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {onSkip && <button className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition" onClick={onSkip}>Voltar</button>}
        {onConfirm && <button className="flex-1 px-4 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition" onClick={onConfirm}>Confirmar horários</button>}
      </div>
    </div>
  );
}
