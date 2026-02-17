import { useState, useMemo } from "react";
import type { DaySchedule, TimeBlock, UserSchedule } from "../../pages/types/user";
import AddRideScheduleSheet from "./AddRideScheduleSheet";

interface ScheduleEditorProps {
  schedule: UserSchedule;
  onChange: (schedule: UserSchedule) => void;
}

const DAY_LABELS: Record<DaySchedule["day"], string> = {
  segunda: "Segunda",
  terca: "Terça",
  quarta: "Quarta",
  quinta: "Quinta",
  sexta: "Sexta",
  sabado: "Sábado",
};

const DAY_ORDER: Record<DaySchedule["day"], number> = {
  segunda: 1,
  terca: 2,
  quarta: 3,
  quinta: 4,
  sexta: 5,
  sabado: 6,
};

export default function ScheduleEditor({ schedule, onChange }: ScheduleEditorProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editData, setEditData] = useState<{ day: DaySchedule["day"]; block: TimeBlock } | undefined>();

  const flat = useMemo(() => {
    const items: Array<{ day: DaySchedule["day"]; block: TimeBlock }> = [];
    schedule.days.forEach((d) => d.blocks.forEach((b) => items.push({ day: d.day, block: b })));
    return items.sort((a, b) => {
      // Primeiro ordena por dia da semana
      const dayDiff = DAY_ORDER[a.day] - DAY_ORDER[b.day];
      if (dayDiff !== 0) return dayDiff;
      // Depois ordena por hora de início
      return a.block.start.localeCompare(b.block.start);
    });
  }, [schedule]);

  const handleAdd = (day: DaySchedule["day"], block: TimeBlock) => {
    const newDays: DaySchedule[] = schedule.days.map(d => ({ ...d, blocks: [...d.blocks] }));
    
    // Se estava a editar, remover o antigo
    if (editData) {
      const oldDay = newDays.find(d => d.day === editData.day);
      if (oldDay) {
        oldDay.blocks = oldDay.blocks.filter(b => b.id !== editData.block.id);
      }
    }

    // Adicionar/atualizar no dia correto
    let targetDay = newDays.find(d => d.day === day);
    if (!targetDay) {
      targetDay = { day, blocks: [] };
      newDays.push(targetDay);
    }
    targetDay.blocks.push(block);
    targetDay.blocks.sort((a, b) => a.start.localeCompare(b.start));

    onChange({ days: newDays });
    setEditData(undefined);
  };

  const handleRemove = (day: DaySchedule["day"], blockId: string) => {
    const newDays = schedule.days.map((d) => {
      if (d.day === day) {
        return { ...d, blocks: d.blocks.filter((b) => b.id !== blockId) };
      }
      return d;
    });
    onChange({ days: newDays });
  };

  const handleEdit = (day: DaySchedule["day"], block: TimeBlock) => {
    setEditData({ day, block });
    setSheetOpen(true);
  };

  const handleNewSchedule = () => {
    setEditData(undefined);
    setSheetOpen(true);
  };

  return (
    <div className="grid gap-4">
      <button 
        type="button" 
        className="w-full px-4 py-3 bg-gray-800 text-white font-semibold rounded-xl hover:bg-gray-700 transition" 
        onClick={handleNewSchedule}
      >
        + Adicionar horário
      </button>

      <div className="grid gap-2">
        {flat.length === 0 && <div className="text-center text-gray-500 py-8 text-sm">Sem horários. Clica acima para adicionar.</div>}
        {flat.map((item) => (
          <div key={item.block.id} className="border border-gray-200 bg-gray-50 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-medium rounded">{DAY_LABELS[item.day]}</span>
              <span className="text-sm font-semibold text-gray-900">{item.block.start} - {item.block.end}</span>
            </div>
            {(item.block.title || item.block.room) && (
              <div className="mb-3 text-sm">
                {item.block.title && <div className="font-medium text-gray-800">{item.block.title}</div>}
                {item.block.room && <div className="text-gray-600">{item.block.room}</div>}
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 px-3 py-2 border border-gray-200 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition text-sm"
                onClick={() => handleEdit(item.day, item.block)}
              >
                Editar
              </button>
              <button
                type="button"
                className="flex-1 px-3 py-2 min-w-0 border border-gray-200 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
                onClick={() => handleRemove(item.day, item.block.id)}
              >
                Remover
              </button>
            </div>
          </div>
        ))}
      </div>

      <AddRideScheduleSheet
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setEditData(undefined); }}
        onAdd={handleAdd}
        editBlock={editData}
      />
    </div>
  );
}
