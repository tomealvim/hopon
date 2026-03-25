import { useState, useEffect } from "react";
import { useNotifications } from "../../contexts/NotificationContext";
import type { DaySchedule, TimeBlock } from "../../pages/types/user";
import Sheet from "./Sheet";
import { Button } from "./Button";
import TimePicker from "./TimePicker";

const DAY_OPTIONS: Array<{ value: DaySchedule["day"]; label: string }> = [
  { value: "segunda", label: "Segunda" },
  { value: "terca", label: "Terça" },
  { value: "quarta", label: "Quarta" },
  { value: "quinta", label: "Quinta" },
  { value: "sexta", label: "Sexta" },
  { value: "sabado", label: "Sábado" },
];

interface AddRideScheduleSheetProps {
  open: boolean;
  onClose: () => void;
  onAdd: (day: DaySchedule["day"], block: TimeBlock) => void;
  editBlock?: { day: DaySchedule["day"]; block: TimeBlock };
}

export default function AddRideScheduleSheet({ open, onClose, onAdd, editBlock }: AddRideScheduleSheetProps) {
  const { showError } = useNotifications();
  const [day, setDay] = useState<DaySchedule["day"]>("segunda");
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("11:00");
  const [room, setRoom] = useState("");
  
  // Sincronizar com editBlock quando o sheet abre
  useEffect(() => {
    if (open && editBlock) {
      setDay(editBlock.day);
      setTitle(editBlock.block.title || "");
      setStart(editBlock.block.start);
      setEnd(editBlock.block.end);
      setRoom(editBlock.block.room || "");
    } else if (open && !editBlock) {
      // Reset quando abre sem editBlock
      setDay("segunda");
      setTitle("");
      setStart("09:00");
      setEnd("11:00");
      setRoom("");
    }
  }, [open, editBlock]);

  const handleStartChange = (newStart: string) => {
    setStart(newStart);
    // Se a hora de fim for antes ou igual à hora de início, ajustar
    if (end <= newStart) {
      const [h, m] = newStart.split(":").map(Number);
      const newH = h + 2; // Adicionar 2 horas por defeito
      if (newH < 24) {
        setEnd(`${newH.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
      } else {
        setEnd("23:59");
      }
    }
  };

  const handleSave = () => {
    if (!start || !end || start >= end) {
      showError("Horários inválidos", "Por favor, define horários válidos (início antes do fim)");
      return;
    }
    const block: TimeBlock = {
      id: editBlock?.block.id || `block_${Date.now()}_${Math.random().toString(36).slice(2,9)}`,
      start,
      end,
      title: title.trim() || undefined,
      room: room.trim() || undefined,
    };
    onAdd(day, block);
    onClose();
    // Reset
    setDay("segunda");
    setTitle("");
    setStart("09:00");
    setEnd("11:00");
    setRoom("");
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editBlock ? "Editar horário" : "Adicionar horário"}
      height="lg"
      footer={
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="outline" className="flex-1" onClick={handleSave}>
            {editBlock ? "Guardar" : "Adicionar"}
          </Button>
        </div>
      }
    >
      <div className="grid gap-4">
        <div>
          <label className="block text-xs font-semibold text-[#414844] mb-1">Dia da semana</label>
          <select
            className="w-full px-3 py-2.5 border border-[#e7e9e4] rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            value={day}
            onChange={(e) => setDay(e.target.value as DaySchedule["day"])}
          >
            {DAY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#414844] mb-1">Destino / Descrição (opcional)</label>
          <input
            className="w-full px-3 py-2.5 border border-[#e7e9e4] rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Trabalho, IST, Faculdade..."
            title="Destino ou descrição da boleia"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <TimePicker
            label="Início"
            value={start}
            onChange={handleStartChange}
          />
          <TimePicker
            label="Fim"
            value={end}
            onChange={setEnd}
            minTime={start}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#414844] mb-1">Local (opcional)</label>
          <input
            className="w-full px-3 py-2.5 border border-[#e7e9e4] rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            placeholder="Ex: Edifício A, Piso 2..."
            title="Local específico"
          />
        </div>
      </div>
    </Sheet>
  );
}
