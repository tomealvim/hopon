import { useEffect, useState } from "react";
import { apiRequest } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/Button";

interface RidePreview {
  id: string;
  private: boolean;
  origin: string;
  destination: string;
  departureTime: string;
  remainingSeats?: number;
  availableSeats?: number;
  price?: number | null;
  status?: string;
  meetingPoint?: string | null;
  instantBooking?: boolean;
  community?: { id: string; name: string } | null;
  driver?: { id: string; name: string; avatarUrl: string | null; isIdentityVerified: boolean } | null;
  vehicle?: { brand: string; model: string; color?: string | null } | null;
}

type Props = {
  rideId: string;
  onBook: (rideId: string) => void;
  onClose: () => void;
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-PT", {
    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

export default function RideSharePreview({ rideId, onBook, onClose }: Props) {
  const { user } = useAuth();
  const [ride, setRide] = useState<RidePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<RidePreview>(`/rides/${rideId}/preview`)
      .then(setRide)
      .catch(() => setError("Boleia não encontrada ou indisponível."))
      .finally(() => setLoading(false));
  }, [rideId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#1B4332] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !ride) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center px-6 gap-4">
        <p className="text-sm text-[#414844] text-center">{error ?? "Boleia indisponível."}</p>
        <Button variant="secondary" onClick={onClose}>Voltar</Button>
      </div>
    );
  }

  if (ride.private) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center px-6 gap-4">
        <div className="text-center">
          <div className="text-3xl mb-3">🔒</div>
          <p className="text-sm font-semibold text-[#1A1C19] mb-1">Boleia privada</p>
          <p className="text-xs text-[#717973]">
            Esta boleia e apenas para membros
            {ride.community ? ` de "${ride.community.name}"` : ""}.
          </p>
          <p className="text-xs text-[#717973] mt-1">{ride.origin} - {ride.destination}</p>
        </div>
        <Button variant="secondary" onClick={onClose}>Voltar</Button>
      </div>
    );
  }

  const isAvailable = ride.status === "SCHEDULED" && (ride.remainingSeats ?? 0) > 0;

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col overflow-y-auto">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-[#e7e9e4] sticky top-0 bg-white z-10">
        <button className="text-2xl font-bold text-[#1A1C19]" onClick={onClose} aria-label="Fechar">←</button>
        <span className="text-sm font-semibold text-[#1A1C19]">Boleia partilhada</span>
      </header>

      <div className="flex-1 px-4 py-6 max-w-mobile mx-auto w-full">
        {/* Route */}
        <div className="mb-6">
          <div className="text-xl font-bold text-[#1A1C19] mb-1">{ride.origin} - {ride.destination}</div>
          <div className="text-sm text-[#717973]">{formatDateTime(ride.departureTime)}</div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-6">
          {isAvailable ? (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
              {ride.remainingSeats} lugar{(ride.remainingSeats ?? 0) !== 1 ? "es" : ""} {(ride.remainingSeats ?? 0) !== 1 ? "disponíveis" : "disponível"}
            </span>
          ) : (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#f3f4ef] text-[#717973]">
              {ride.status === "COMPLETED" ? "Concluída" : ride.status === "CANCELLED" ? "Cancelada" : "Sem lugares"}
            </span>
          )}
          {ride.price != null && ride.price > 0 && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#f3f4ef] text-[#414844]">
              €{ride.price.toFixed(2)}/lugar
            </span>
          )}
          {ride.instantBooking && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Reserva instantânea
            </span>
          )}
          {ride.community && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
              {ride.community.name}
            </span>
          )}
        </div>

        {/* Driver */}
        {ride.driver && (
          <div className="flex items-center gap-3 p-4 bg-[#f3f4ef] border border-[#e7e9e4] rounded-xl mb-4">
            <div className="w-12 h-12 rounded-full bg-[#edeee9] flex items-center justify-center text-base font-bold text-[#414844] shrink-0 overflow-hidden">
              {ride.driver.avatarUrl ? (
                <img src={ride.driver.avatarUrl} alt={ride.driver.name} className="w-full h-full object-cover" />
              ) : (
                ride.driver.name.slice(0, 2).toUpperCase()
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[#1A1C19]">{ride.driver.name}</span>
                {ride.driver.isIdentityVerified && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">Verificado</span>
                )}
              </div>
              <span className="text-xs text-[#717973]">Condutor</span>
            </div>
          </div>
        )}

        {/* Vehicle */}
        {ride.vehicle && (
          <div className="p-4 bg-[#f3f4ef] border border-[#e7e9e4] rounded-xl mb-4">
            <div className="text-xs text-[#717973] mb-0.5">Veículo</div>
            <div className="text-sm font-semibold text-[#1A1C19]">
              {ride.vehicle.brand} {ride.vehicle.model}
              {ride.vehicle.color ? ` - ${ride.vehicle.color}` : ""}
            </div>
          </div>
        )}

        {/* Meeting point */}
        {ride.meetingPoint && (
          <div className="p-4 bg-[#f3f4ef] border border-[#e7e9e4] rounded-xl mb-4">
            <div className="text-xs text-[#717973] mb-0.5">Ponto de encontro</div>
            <div className="text-sm text-[#1A1C19]">{ride.meetingPoint}</div>
          </div>
        )}

        {/* CTA */}
        <div className="mt-6">
          {!user ? (
            <div className="text-center">
              <p className="text-xs text-[#717973] mb-3">Inicia sessão para reservar um lugar nesta boleia.</p>
              <Button className="w-full" onClick={onClose}>Entrar no HopOn</Button>
            </div>
          ) : isAvailable ? (
            <Button className="w-full" onClick={() => onBook(ride.id)}>
              Reservar lugar
            </Button>
          ) : (
            <Button variant="secondary" className="w-full" disabled>Sem lugares disponíveis</Button>
          )}
        </div>
      </div>
    </div>
  );
}
