import { useState } from "react";
import { useNotifications } from "../../contexts/NotificationContext";
import type { UserSchedule } from "../../pages/types/user";
import ScheduleEditor from "./ScheduleEditor";

interface ScheduleConfirmationProps {
  initialSchedule: UserSchedule;
  rawText: string;
  onConfirm: (schedule: UserSchedule) => void;
  onCancel: () => void;
}

export default function ScheduleConfirmation({
  initialSchedule,
  rawText,
  onConfirm,
  onCancel,
}: ScheduleConfirmationProps) {
  const { showError } = useNotifications();
  const [schedule, setSchedule] = useState<UserSchedule>(initialSchedule);
  const [showRawText, setShowRawText] = useState(false);

  const handleConfirm = () => {
    if (schedule.days.length === 0) {
      showError("Horário necessário", "Por favor, adiciona pelo menos um horário antes de confirmar.");
      return;
    }
    onConfirm(schedule);
  };

  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-xl font-bold text-[#1A1C19] mb-2">Confirma o teu horário</h2>
        <p className="text-sm text-[#414844]">
          {schedule.days.length > 0
            ? "Verifica se está tudo correto. Podes editar se necessário."
            : "Não conseguimos extrair horários. Por favor, adiciona manualmente."}
        </p>
      </div>

      <ScheduleEditor schedule={schedule} onChange={setSchedule} />

      <button
        type="button"
        onClick={() => setShowRawText(!showRawText)}
        className="text-sm text-primary font-medium hover:underline"
      >
        {showRawText ? "Esconder" : "Ver"} texto extraído
      </button>

      {showRawText && (
        <div className="bg-[#f3f4ef] border border-[#e7e9e4] rounded-xl p-4">
          <h3 className="text-xs font-semibold text-[#414844] mb-2">Texto extraído da imagem:</h3>
          <pre className="text-xs text-[#414844] whitespace-pre-wrap">{rawText}</pre>
        </div>
      )}

      <div className="flex gap-3">
        <button type="button" onClick={onCancel} className="flex-1 px-4 py-3 border border-[#c1c8c2] text-[#414844] rounded-xl hover:bg-[#f3f4ef] transition">
          Voltar
        </button>
        <button type="button" onClick={handleConfirm} className="flex-1 px-4 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition">
          Confirmar Horário
        </button>
      </div>
    </div>
  );
}
