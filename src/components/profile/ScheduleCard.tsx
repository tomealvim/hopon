import { useId, useState } from "react";
import TimePicker from "../ui/TimePicker";
import type { UserSchedule, ClassSlot, Weekday } from "../../pages/types/schedule";

const DAYS: { k: Weekday; label: string }[] = [
  { k: "mon", label: "Seg" }, { k: "tue", label: "Ter" }, { k: "wed", label: "Qua" },
  { k: "thu", label: "Qui" }, { k: "fri", label: "Sex" }, { k: "sat", label: "Sáb" }, { k: "sun", label: "Dom" },
];

export default function ScheduleCard({
  value, onChange,
}: { value: UserSchedule; onChange: (next: UserSchedule) => void }) {
  const uid = useId();
  const [textBulk, setTextBulk] = useState("");

  function setDefaultOrigin(v: string) {
    onChange({ ...value, defaultOrigin: v });
  }
  function updateSlot(i: number, patch: Partial<ClassSlot>) {
    const slots = value.slots.slice();
    slots[i] = { ...slots[i], ...patch };
    onChange({ ...value, slots });
  }
  function addSlot(day: Weekday) {
    onChange({ ...value, slots: [...value.slots, { day, start: "08:00", campus: "ULisboa Ciências" }] });
  }
  function removeSlot(i: number) {
    const slots = value.slots.slice(); slots.splice(i, 1);
    onChange({ ...value, slots });
  }

  function parseBulk() {
    // Formatos aceites por linha:
    // Seg 08:30 -> ULisboa Ciências (origem Cascais)
    // Ter,09:10,ULisboa Ciências,Cascais
    const lines = textBulk.split("\n").map(l => l.trim()).filter(Boolean);
    const slots: ClassSlot[] = [];
    for (const line of lines) {
      const csv = line.includes(",") ? line.split(",").map(s => s.trim()) : null;
      if (csv && (csv.length === 3 || csv.length === 4)) {
        const day = mapDay(csv[0]); const start = csv[1]; const campus = csv[2]; const originHint = csv[3];
        if (day && start && campus) slots.push({ day, start, campus, originHint });
        continue;
      }
      const arrow = line.match(/^(\w+)\s+(\d{2}:\d{2})\s*->\s*(.+?)(?:\s*\(origem\s+(.+)\))?$/i);
      if (arrow) {
        const day = mapDay(arrow[1]); const start = arrow[2]; const campus = arrow[3]; const originHint = arrow[4];
        if (day && start && campus) slots.push({ day, start, campus, originHint });
      }
    }
    if (slots.length) onChange({ ...value, slots });
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="mb-6">
        <div className="text-lg font-bold text-gray-900 mb-1">Horário semanal</div>
        <div className="text-sm text-gray-500">Usamos isto para sugerir boleias automaticamente.</div>
      </div>

      <div className="mb-6">
        <label className="block text-xs font-semibold text-gray-700 mb-1" htmlFor={`${uid}-origin`}>Origem padrão</label>
        <input id={`${uid}-origin`} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          placeholder="Ex.: Cascais" title="Local de partida típico"
          value={value.defaultOrigin ?? ""} onChange={e => setDefaultOrigin(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {DAYS.map(d => (
          <div key={d.k} className="border border-gray-200 rounded-xl p-3">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
              <span>{d.label}</span>
              <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => addSlot(d.k)}>+ Horário</button>
            </div>
            {value.slots.map((s: ClassSlot, i: number) => s.day === d.k && (
              <div key={`${d.k}-${i}`} className="bg-gray-50 rounded-lg p-3 mb-2">
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <TimePicker
                      label="Hora"
                      value={s.start}
                      onChange={(v) => updateSlot(i, { start: v })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Campus</label>
                    <input
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      placeholder="Ex.: ULisboa Ciências"
                      title="Campus"
                      value={s.campus}
                      onChange={e => updateSlot(i, { campus: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Origem (opcional)</label>
                    <input
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      placeholder="Ex.: Estoril"
                      title="Origem específica"
                      value={s.originHint ?? ""}
                      onChange={e => updateSlot(i, { originHint: e.target.value })}
                    />
                  </div>
                  <div className="flex items-end">
                    <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => removeSlot(i)}>Remover</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="border-t border-gray-200 pt-6">
        <label className="block text-xs font-semibold text-gray-700 mb-1">Colar horário (texto/CSV)</label>
        <textarea className="w-full px-3 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none" rows={4}
          placeholder={`Exemplos:\nSeg 08:30 -> ULisboa Ciências (origem Cascais)\nTer,09:10,ULisboa Ciências,Cascais`}
          value={textBulk} onChange={e => setTextBulk(e.target.value)} />
        <div className="mt-2">
          <button type="button" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition" onClick={parseBulk}>Importar</button>
        </div>
      </div>
    </div>
  );
}

function mapDay(s: string): Weekday | null {
  const m = s.toLowerCase().slice(0,3);
  if (m.startsWith("seg")) return "mon";
  if (m.startsWith("ter")) return "tue";
  if (m.startsWith("qua")) return "wed";
  if (m.startsWith("qui")) return "thu";
  if (m.startsWith("sex")) return "fri";
  if (m.startsWith("sáb") || m.startsWith("sab")) return "sat";
  if (m.startsWith("dom")) return "sun";
  return null;
}
