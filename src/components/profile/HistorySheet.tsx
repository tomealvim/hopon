import { useEffect, useState } from "react";
import { apiRequest } from "../../services/api";
import Sheet from "../ui/Sheet";
import DisputeSheet from "./DisputeSheet";

interface HistoryRide {
  id: string;
  origin: string;
  destination: string;
  departureTime: string;
  status: string;
  price: number | null;
  role: "driver" | "passenger";
  myBookingId: string | null;
  scheduleTemplateId?: string | null;
  vehicle: { brand: string; model: string } | null;
  bookings: { id: string; userId: string; status: string; seats: number; user?: { id: string; profile?: { name: string; avatarUrl?: string } | null } | null }[];
}

const STATUS_LABEL: Record<string, string> = {
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
};

const STATUS_COLOR: Record<string, string> = {
  COMPLETED: "text-green-700 bg-green-100",
  CANCELLED: "text-gray-600 bg-gray-100",
};

const DISPUTE_WINDOW_DAYS = 7;

function canDispute(ride: HistoryRide): boolean {
  if (ride.status !== "COMPLETED") return false;
  const dep = new Date(ride.departureTime);
  const cutoff = new Date(dep);
  cutoff.setDate(cutoff.getDate() + DISPUTE_WINDOW_DAYS);
  return new Date() <= cutoff;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function HistorySheet({ open, onClose }: Props) {
  const [history, setHistory] = useState<HistoryRide[]>([]);
  const [loading, setLoading] = useState(false);
  const [disputeRide, setDisputeRide] = useState<HistoryRide | null>(null);
  const [disputeBookingId, setDisputeBookingId] = useState<string>("");
  // Proposta de arranjo recorrente
  const [proposeRide, setProposeRide] = useState<HistoryRide | null>(null);
  const [selectedPassengerId, setSelectedPassengerId] = useState<string>("");
  const [proposeNote, setProposeNote] = useState("");
  const [proposing, setProposing] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    apiRequest<HistoryRide[]>("/rides/history")
      .then((data) => setHistory(Array.isArray(data) ? data : []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [open]);

  function openDispute(ride: HistoryRide) {
    if (!ride.myBookingId) return;
    setDisputeRide(ride);
    setDisputeBookingId(ride.myBookingId);
  }

  async function submitProposal() {
    if (!proposeRide || !selectedPassengerId) return;
    setProposing(true);
    try {
      await apiRequest("/recurring-arrangements", {
        method: "POST",
        body: JSON.stringify({ rideId: proposeRide.id, passengerId: selectedPassengerId, note: proposeNote || undefined }),
      });
      setProposeRide(null);
      setSelectedPassengerId("");
      setProposeNote("");
    } catch { /* ignore */ } finally {
      setProposing(false);
    }
  }

  return (
    <>
      <Sheet open={open} onClose={onClose} title="Histórico de boleias" height="lg" footer={null}>
        {loading && (
          <div className="flex items-center justify-center py-16 text-sm text-gray-400">
            A carregar…
          </div>
        )}

        {!loading && history.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 text-center px-6 py-16">
            <span className="text-4xl">🚗</span>
            <p className="text-sm font-medium text-gray-700">Sem histórico ainda</p>
            <p className="text-xs text-gray-400">As tuas boleias concluídas ou canceladas aparecerão aqui.</p>
          </div>
        )}

        {!loading && history.length > 0 && (
          <div className="divide-y divide-gray-100">
            {history.map((ride) => {
              const dep = new Date(ride.departureTime);
              const dateStr = dep.toLocaleDateString("pt-PT", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });
              const timeStr = dep.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
              const disputeable = canDispute(ride) && ride.role === "passenger" && !!ride.myBookingId;
              const canPropose = ride.role === "driver" && ride.status === "COMPLETED" && !!ride.scheduleTemplateId && ride.bookings.some((b) => b.status === "COMPLETED");

              return (
                <div key={ride.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {ride.origin} → {ride.destination}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {dateStr}, {timeStr}
                      </p>
                      {ride.vehicle && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {ride.vehicle.brand} {ride.vehicle.model}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[ride.status] ?? "text-gray-500 bg-gray-100"}`}>
                        {STATUS_LABEL[ride.status] ?? ride.status}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {ride.role === "driver" ? "Condutor" : "Passageiro"}
                      </span>
                      {ride.price != null && ride.price > 0 && (
                        <span className="text-xs font-medium text-gray-700">
                          €{ride.price.toFixed(2)}/lugar
                        </span>
                      )}
                      {disputeable && (
                        <button
                          type="button"
                          onClick={() => openDispute(ride)}
                          className="mt-1 text-[10px] font-semibold text-red-600 hover:underline"
                        >
                          Contestar
                        </button>
                      )}
                      {canPropose && (
                        <button
                          type="button"
                          onClick={() => { setProposeRide(ride); setSelectedPassengerId(ride.bookings.find((b) => b.status === "COMPLETED")?.userId ?? ""); }}
                          className="mt-1 text-[10px] font-semibold text-gray-900 hover:underline"
                        >
                          Propor arranjo recorrente
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Sheet>

      {disputeRide && (
        <DisputeSheet
          open={!!disputeRide}
          onClose={() => setDisputeRide(null)}
          bookingId={disputeBookingId}
          rideLabel={`${disputeRide.origin} → ${disputeRide.destination}`}
        />
      )}

      {proposeRide && (
        <Sheet
          open={!!proposeRide}
          onClose={() => { setProposeRide(null); setSelectedPassengerId(""); setProposeNote(""); }}
          title="Propor arranjo recorrente"
          height="md"
          footer={
            <button
              type="button"
              disabled={!selectedPassengerId || proposing}
              onClick={submitProposal}
              className="w-full rounded-2xl bg-gray-900 text-white font-semibold py-3 text-sm disabled:opacity-50"
            >
              {proposing ? "A enviar…" : "Enviar proposta"}
            </button>
          }
        >
          <div className="flex flex-col gap-4 px-4 pt-2">
            <p className="text-sm text-gray-600">
              Propõe repetir regularmente a boleia <strong>{proposeRide.origin} - {proposeRide.destination}</strong> com um passageiro. O passageiro receberá uma notificação para aceitar.
            </p>
            {proposeRide.bookings.filter((b) => b.status === "COMPLETED").length > 1 && (
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Passageiro</label>
                <select
                  value={selectedPassengerId}
                  onChange={(e) => setSelectedPassengerId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white"
                >
                  {proposeRide.bookings.filter((b) => b.status === "COMPLETED").map((b) => (
                    <option key={b.userId} value={b.userId}>
                      {b.user?.profile?.name ?? b.userId}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1 block">Nota (opcional)</label>
              <input
                type="text"
                value={proposeNote}
                onChange={(e) => setProposeNote(e.target.value)}
                placeholder="Ex: Passo todos os dias às 8h!"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm placeholder-gray-400"
                maxLength={200}
              />
            </div>
          </div>
        </Sheet>
      )}
    </>
  );
}
