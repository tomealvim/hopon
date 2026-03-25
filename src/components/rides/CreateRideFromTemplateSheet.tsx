import { useState } from "react";
import { useNotifications } from "../../contexts/NotificationContext";
import { apiRequest } from "../../services/api";
import Sheet from "../ui/Sheet";
import { Button } from "../ui/Button";
import type { ApiSchedule } from "../../pages/types/schedule-api";
import type { ApiRide } from "../../pages/types/ride-api";

type CreateRideFromTemplateSheetProps = {
  open: boolean;
  schedule: ApiSchedule | null;
  onClose: () => void;
  onSuccess: () => void;
};

export default function CreateRideFromTemplateSheet({
  open,
  schedule,
  onClose,
  onSuccess,
}: CreateRideFromTemplateSheetProps) {
  const { showSuccess, showError } = useNotifications();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedule) return;
    const [hours, minutes] = schedule.time.split(":").map(Number);
    const dep = new Date(date);
    dep.setHours(hours, minutes, 0, 0);
    const departureTime = dep.toISOString();
    setSubmitting(true);
    try {
      await apiRequest<ApiRide>(`/schedules/${schedule.id}/create-ride`, {
        method: "POST",
        body: JSON.stringify({
          departureTime,
          availableSeats: schedule.availableSeats,
          price: schedule.price ?? undefined,
        }),
      });
      showSuccess("Boleia criada", `${schedule.origin} → ${schedule.destination} no dia ${dep.toLocaleDateString("pt-PT")}.`);
      onSuccess();
      onClose();
    } catch (err) {
      showError("Erro ao criar boleia", err instanceof Error ? err.message : "Não foi possível criar a boleia. Tenta novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!schedule) return null;

  const dayNames: Record<number, string> = {
    0: "domingo",
    1: "segunda",
    2: "terca",
    3: "quarta",
    4: "quinta",
    5: "sexta",
    6: "sabado",
  };
  const selectedDate = new Date(date + "T12:00:00");
  const selectedDay = dayNames[selectedDate.getDay()];
  const isValidDay = schedule.daysOfWeek.includes(selectedDay);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Criar boleia a partir do template"
      height="md"
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            className="flex-1"
            onClick={handleSubmit}
            disabled={submitting || !isValidDay}
          >
            {submitting ? "A criar…" : "Criar boleia"}
          </Button>
        </div>
      }
    >
      <div className="p-1 space-y-4">
        <div className="rounded-xl border border-[#e7e9e4] bg-[#f3f4ef] p-3">
          <p className="text-sm font-semibold text-[#1A1C19]">
            {schedule.origin} → {schedule.destination}
          </p>
          <p className="text-xs text-[#414844] mt-1">
            {schedule.time} · {schedule.daysOfWeek.join(", ")} · {schedule.availableSeats} lugares
            {schedule.price != null && schedule.price > 0 && ` · €${schedule.price.toFixed(0)}`}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="grid gap-3">
          <label htmlFor="create-ride-date" className="block text-xs font-semibold text-[#414844]">Data da boleia</label>
          <input
            id="create-ride-date"
            type="date"
            aria-label="Data da boleia"
            className="w-full px-3 py-2.5 border border-[#e7e9e4] rounded-xl text-[#1A1C19] focus:border-primary focus:ring-2 focus:ring-primary/20"
            value={date}
            min={today}
            onChange={(e) => setDate(e.target.value)}
          />
          {!isValidDay && date && (
            <p className="text-xs text-amber-600">
              Este template não tem boleia ao {selectedDay}. Escolhe {schedule.daysOfWeek.join(", ")}.
            </p>
          )}
        </form>
      </div>
    </Sheet>
  );
}
