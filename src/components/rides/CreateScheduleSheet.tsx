import { useState, useMemo, useEffect, useId } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useNotifications } from "../../contexts/NotificationContext";
import { apiRequest } from "../../services/api";
import Sheet from "../ui/Sheet";
import { Button } from "../ui/Button";
import TimePicker from "../ui/TimePicker";
import { cn } from "../../utils/cn";
import type { ApiSchedule, CreateSchedulePayload } from "../../pages/types/schedule-api";
import type { Vehicle } from "../../pages/types/user";

const DAYS_API = ["segunda", "terca", "quarta", "quinta", "sexta"] as const;
const DAYS_SHORT: Array<{ value: (typeof DAYS_API)[number]; label: string }> = [
  { value: "segunda", label: "Seg" },
  { value: "terca", label: "Ter" },
  { value: "quarta", label: "Qua" },
  { value: "quinta", label: "Qui" },
  { value: "sexta", label: "Sex" },
];

type CreateScheduleSheetProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: (schedule: ApiSchedule) => void;
};

export default function CreateScheduleSheet({ open, onClose, onSuccess }: CreateScheduleSheetProps) {
  const { user, setActiveVehicle } = useAuth();
  const { showSuccess, showError } = useNotifications();
  const vehicles: Vehicle[] = useMemo(() => user?.vehicles ?? [], [user?.vehicles]);
  const id = useId();

  const [vehicleId, setVehicleId] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [time, setTime] = useState("08:00");
  const [daysOfWeek, setDaysOfWeek] = useState<string[]>(["segunda", "terca", "quarta", "quinta", "sexta"]);
  const [availableSeats, setAvailableSeats] = useState(3);
  const [price, setPrice] = useState("");
  const [acceptDetours, setAcceptDetours] = useState(true);
  const [detourMaxMin, setDetourMaxMin] = useState(10);
  const [meetingPoint, setMeetingPoint] = useState("");
  const [notes, setNotes] = useState("");
  const [preferences, setPreferences] = useState({ musica: true, falar: true, bagagem: false, animais: false });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || vehicles.length === 0) return;
    if (vehicles.length === 1) {
      setVehicleId(vehicles[0].id);
      return;
    }
    if (!vehicleId || !vehicles.some((v) => v.id === vehicleId)) setVehicleId(vehicles[0].id);
  }, [open, vehicles, vehicleId]);

  const toggleDay = (day: string) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const setPref = (key: keyof typeof preferences, val: boolean) => {
    setPreferences((prev) => ({ ...prev, [key]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId || !origin.trim() || !destination.trim() || daysOfWeek.length === 0) {
      showError("Campos em falta", "Preenche origem, destino, hora e pelo menos um dia.");
      return;
    }
    setSubmitting(true);
    try {
      const payload: CreateSchedulePayload = {
        vehicleId,
        origin: origin.trim(),
        destination: destination.trim(),
        time,
        daysOfWeek,
        availableSeats,
        acceptDetours,
        detourMaxMin,
        meetingPoint: meetingPoint.trim() || undefined,
        notes: notes.trim() || undefined,
        preferences,
      };
      if (price.trim() !== "" && !Number.isNaN(parseFloat(price))) payload.price = parseFloat(price);
      const schedule = await apiRequest<ApiSchedule>("/schedules", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      showSuccess("Template criado", `${schedule.origin} → ${schedule.destination}`);
      onSuccess(schedule);
      onClose();
      setOrigin("");
      setDestination("");
      setTime("08:00");
      setDaysOfWeek(["segunda", "terca", "quarta", "quinta", "sexta"]);
      setAvailableSeats(3);
      setPrice("");
      setMeetingPoint("");
      setNotes("");
      setPreferences({ musica: true, falar: true, bagagem: false, animais: false });
    } catch (err) {
      showError("Erro", err instanceof Error ? err.message : "Não foi possível criar o template.");
    } finally {
      setSubmitting(false);
    }
  };

  if (vehicles.length === 0) {
    return (
      <Sheet open={open} onClose={onClose} title="Novo template de viagem" height="md">
        <div className="p-4 text-center">
          <p className="text-sm text-gray-700">Precisas de ter um veículo para criar um template.</p>
          <p className="text-xs text-gray-500 mt-1">Adiciona um em Perfil → Veículos.</p>
          <Button variant="secondary" className="mt-4" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Novo template de viagem"
      height="lg"
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "A guardar…" : "Criar template"}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="grid gap-4 p-1">
        {/* Veículo: só mostrar seletor quando há mais de 1 carro; com 1 carro usa-se automaticamente */}
        {vehicles.length > 1 && (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Selecionar veículo</p>
            <div className="grid gap-2">
              {vehicles.map((vehicle) => {
                const isSelected = vehicle.id === vehicleId;
                return (
                  <button
                    key={vehicle.id}
                    type="button"
                    className={cn(
                      "flex items-center justify-between rounded-2xl border px-4 py-2 text-left transition",
                      isSelected
                        ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-50"
                        : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
                    )}
                    aria-pressed={isSelected}
                    onClick={() => {
                      setVehicleId(vehicle.id);
                      setActiveVehicle(vehicle.id);
                    }}
                  >
                    <div>
                      <p className="text-sm font-semibold">{vehicle.brand}</p>
                      <p className="text-xs text-gray-600">{vehicle.model}</p>
                    </div>
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full border text-[11px]",
                        isSelected ? "border-emerald-300 bg-emerald-400 text-emerald-900" : "border-gray-300 text-gray-500"
                      )}
                    >
                      {isSelected ? "✓" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <label htmlFor={`${id}-origem`} className="block text-xs font-semibold text-gray-600 mb-1">De onde?</label>
          <input
            id={`${id}-origem`}
            type="text"
            className="w-full px-3 py-2.5 border border-gray-200 bg-white/5 text-gray-900 rounded-xl outline-none focus:border-[#FF719A] focus:ring-2 focus:ring-[#FF719A]/20 placeholder:text-gray-900/40"
            placeholder="Ex.: Estoril, estação, rua…"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor={`${id}-destino`} className="block text-xs font-semibold text-gray-600 mb-1">Para onde?</label>
          <input
            id={`${id}-destino`}
            type="text"
            className="w-full px-3 py-2.5 border border-gray-200 bg-white/5 text-gray-900 rounded-xl outline-none focus:border-[#FF719A] focus:ring-2 focus:ring-[#FF719A]/20 placeholder:text-gray-900/40"
            placeholder="Ex.: ULisboa Ciências, campus…"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <TimePicker label="Hora de partida" value={time} onChange={setTime} />
          </div>
          <div>
            <label htmlFor={`${id}-lugares`} className="block text-xs font-semibold text-gray-600 mb-1">Lugares</label>
            <input
              id={`${id}-lugares`}
              type="number"
              min={1}
              max={8}
              className="w-full px-3 py-2.5 border border-gray-200 bg-white/5 text-gray-900 rounded-xl outline-none focus:border-[#FF719A] focus:ring-2 focus:ring-[#FF719A]/20"
              value={availableSeats}
              onChange={(e) => setAvailableSeats(parseInt(e.target.value, 10) || 1)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={`${id}-price`} className="block text-xs font-semibold text-gray-600 mb-1">Preço (€) opcional</label>
            <input
              id={`${id}-price`}
              type="text"
              inputMode="decimal"
              placeholder="0"
              className="w-full px-3 py-2.5 border border-gray-200 bg-white/5 text-gray-900 rounded-xl placeholder:text-gray-900/40"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm text-gray-900">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-white/30 bg-white/5"
                checked={acceptDetours}
                onChange={(e) => setAcceptDetours(e.target.checked)}
              />
              Aceita desvios?
            </label>
          </div>
        </div>

        {acceptDetours && (
          <div>
            <label htmlFor={`${id}-desvio`} className="block text-xs font-semibold text-gray-600 mb-1">Desvio máx. (min)</label>
            <input
              id={`${id}-desvio`}
              type="range"
              min={0}
              max={60}
              step={5}
              className="w-full"
              value={detourMaxMin}
              onChange={(e) => setDetourMaxMin(Number(e.target.value))}
            />
            <div className="text-xs text-gray-500 mt-1">{detourMaxMin} min</div>
          </div>
        )}

        <div>
          <label htmlFor={`${id}-ponto`} className="block text-xs font-semibold text-gray-600 mb-1">Ponto de encontro</label>
          <input
            id={`${id}-ponto`}
            type="text"
            className="w-full px-3 py-2.5 border border-gray-200 bg-white/5 text-gray-900 rounded-xl outline-none focus:border-[#FF719A] focus:ring-2 focus:ring-[#FF719A]/20 placeholder:text-gray-900/40"
            placeholder="Ex.: estação de Cascais, portaria"
            value={meetingPoint}
            onChange={(e) => setMeetingPoint(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-2">Dias da semana</label>
          <div className="flex gap-2 flex-wrap" role="group" aria-label="Dias da semana">
            {DAYS_SHORT.map(({ value, label }) => {
              const checked = daysOfWeek.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                    checked
                      ? "bg-gradient-to-r from-gradient-start via-gradient-mid to-gradient-end text-gray-900 border-transparent"
                      : "bg-white/5 text-gray-900 border-gray-200 hover:bg-white/10"
                  )}
                  aria-pressed={checked}
                  onClick={() => toggleDay(value)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label htmlFor={`${id}-obs`} className="block text-xs font-semibold text-gray-600 mb-1">Observações</label>
          <textarea
            id={`${id}-obs`}
            rows={2}
            className="w-full px-3 py-2.5 border border-gray-200 bg-white/5 text-gray-900 rounded-xl outline-none focus:border-[#FF719A] focus:ring-2 focus:ring-[#FF719A]/20 resize-none placeholder:text-gray-900/40"
            placeholder="Ex.: trago mochila grande, prefiro silêncio"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <fieldset aria-label="Preferências">
          <legend className="block text-xs font-semibold text-gray-600 mb-1">Preferências</legend>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-900">
              <input type="checkbox" className="w-4 h-4 rounded border-white/30 bg-white/5" checked={preferences.musica} onChange={(e) => setPref("musica", e.target.checked)} />
              Música
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-900">
              <input type="checkbox" className="w-4 h-4 rounded border-white/30 bg-white/5" checked={preferences.falar} onChange={(e) => setPref("falar", e.target.checked)} />
              Conversa
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-900">
              <input type="checkbox" className="w-4 h-4 rounded border-white/30 bg-white/5" checked={preferences.bagagem} onChange={(e) => setPref("bagagem", e.target.checked)} />
              Bagagem
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-900">
              <input type="checkbox" className="w-4 h-4 rounded border-white/30 bg-white/5" checked={preferences.animais} onChange={(e) => setPref("animais", e.target.checked)} />
              Animais
            </label>
          </div>
        </fieldset>
      </form>
    </Sheet>
  );
}
