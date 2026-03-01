import { useState, useMemo, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { apiRequest } from "../services/api";
import { useNotifications } from "../contexts/NotificationContext";
import { useSSE } from "../contexts/SSEContext";
import EntityCard from "../components/ui/EntityCard";
import RidesCalendar, { type DayRides } from "../components/ui/RidesCalendar";
import Sheet from "../components/ui/Sheet";
import { Button } from "../components/ui/Button";
import BackgroundGlow from "../components/ui/BackgroundGlow";
import { EntityCardSkeleton, RideCardSkeleton } from "../components/ui/Skeleton";
import CreateScheduleSheet from "../components/rides/CreateScheduleSheet";
import CreateRideFromTemplateSheet from "../components/rides/CreateRideFromTemplateSheet";
import RatingsSheet from "../components/profile/RatingsSheet";
import type { ApiRide, ApiRideBooking } from "./types/ride-api";
import type { ApiBooking } from "./types/booking-api";
import type { ApiSchedule } from "./types/schedule-api";

interface PendingRating {
  bookingId: string;
  role: "driver" | "passenger";
  revieweeId: string;
  revieweeName: string;
  origin: string;
  destination: string;
  departureTime: string;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-PT", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmada",
  DECLINED: "Recusada",
  CANCELLED: "Cancelada",
  COMPLETED: "Concluída",
  SCHEDULED: "Agendada",
};

const STATUS_TONE: Record<string, "success" | "warning" | "brand" | undefined> = {
  PENDING: "warning",
  CONFIRMED: "success",
  DECLINED: undefined,
  CANCELLED: undefined,
  COMPLETED: "brand",
};

export default function RidesPage() {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotifications();
  const { subscribe } = useSSE();

  // --- Driver rides ---
  const [myRides, setMyRides] = useState<ApiRide[]>([]);
  const [ridesLoading, setRidesLoading] = useState(false);

  // --- Passenger bookings ---
  const [myBookings, setMyBookings] = useState<ApiBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  // --- Pending ratings ---
  const [pendingRatings, setPendingRatings] = useState<PendingRating[]>([]);
  const [ratingTarget, setRatingTarget] = useState<PendingRating | null>(null);
  const [openRating, setOpenRating] = useState(false);

  // --- Schedules ---
  const [schedules, setSchedules] = useState<ApiSchedule[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [openScheduleSheet, setOpenScheduleSheet] = useState(false);
  const [openCreateRideSheet, setOpenCreateRideSheet] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ApiSchedule | null>(null);

  // --- Detail sheet ---
  const [selectedRide, setSelectedRide] = useState<ApiRide | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<ApiBooking | null>(null);
  const [openSheet, setOpenSheet] = useState(false);
  const [sheetView, setSheetView] = useState<"ride" | "booking" | "passengers">("ride");

  const [hydrating, setHydrating] = useState(true);

  const fetchMyRides = useCallback(async () => {
    setRidesLoading(true);
    try {
      const data = await apiRequest<ApiRide[]>("/rides/my");
      setMyRides(Array.isArray(data) ? data : []);
    } catch {
      setMyRides([]);
    } finally {
      setRidesLoading(false);
    }
  }, []);

  const fetchMyBookings = useCallback(async () => {
    setBookingsLoading(true);
    try {
      const data = await apiRequest<ApiBooking[]>("/bookings/my");
      setMyBookings(Array.isArray(data) ? data : []);
    } catch {
      setMyBookings([]);
    } finally {
      setBookingsLoading(false);
    }
  }, []);

  const fetchPendingRatings = useCallback(async () => {
    try {
      const data = await apiRequest<PendingRating[]>("/ratings/pending");
      setPendingRatings(Array.isArray(data) ? data : []);
    } catch {
      setPendingRatings([]);
    }
  }, []);

  const fetchSchedules = useCallback(async () => {
    setSchedulesLoading(true);
    try {
      const data = await apiRequest<ApiSchedule[]>("/schedules/my");
      setSchedules(Array.isArray(data) ? data : []);
    } catch {
      setSchedules([]);
    } finally {
      setSchedulesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchMyRides();
      fetchMyBookings();
      fetchSchedules();
      fetchPendingRatings();
    }
  }, [user, fetchMyRides, fetchMyBookings, fetchSchedules, fetchPendingRatings]);

  // Quando chega SSE de boleia concluída, refrescar ratings pendentes
  useEffect(() => {
    return subscribe("ride.completed", () => {
      fetchPendingRatings();
    });
  }, [subscribe, fetchPendingRatings]);

  useEffect(() => {
    const t = setTimeout(() => setHydrating(false), 300);
    return () => clearTimeout(t);
  }, []);

  // --- Calendar data ---
  const ridesData: DayRides[] = useMemo(() => {
    const map: Record<string, DayRides["rides"]> = {};

    // Rides where I'm the driver
    myRides.forEach((ride) => {
      if (ride.status === "CANCELLED") return;
      const date = formatDate(ride.departureTime);
      if (!map[date]) map[date] = [];
      const hasConfirmed = (ride.bookings ?? []).some((b) => b.status === "CONFIRMED");
      map[date].push({
        id: ride.id,
        type: hasConfirmed ? "confirmed" : "offer",
        time: formatTime(ride.departureTime),
        origin: ride.origin,
        destination: ride.destination,
        seats: ride.remainingSeats,
      });
    });

    // Bookings where I'm the passenger
    myBookings.forEach((booking) => {
      if (!booking.ride || booking.status === "CANCELLED" || booking.status === "DECLINED") return;
      const date = formatDate(booking.ride.departureTime);
      if (!map[date]) map[date] = [];
      map[date].push({
        id: booking.id,
        type: booking.status === "CONFIRMED" ? "confirmed" : "request",
        time: formatTime(booking.ride.departureTime),
        origin: booking.ride.origin,
        destination: booking.ride.destination,
      });
    });

    return Object.entries(map)
      .map(([date, rides]) => ({ date, rides }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [myRides, myBookings]);

  // --- Calendar click ---
  function handleCalendarClick(calRide: { id: string }) {
    const ride = myRides.find((r) => r.id === calRide.id);
    if (ride) {
      setSelectedRide(ride);
      setSelectedBooking(null);
      setSheetView("ride");
      setOpenSheet(true);
      return;
    }
    const booking = myBookings.find((b) => b.id === calRide.id);
    if (booking) {
      setSelectedBooking(booking);
      setSelectedRide(null);
      setSheetView("booking");
      setOpenSheet(true);
    }
  }

  // --- Booking actions (driver) ---
  async function handleBookingStatus(bookingId: string, status: "CONFIRMED" | "DECLINED") {
    try {
      await apiRequest(`/bookings/${bookingId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      showSuccess(
        status === "CONFIRMED" ? "Reserva confirmada!" : "Reserva recusada",
        status === "CONFIRMED" ? "O passageiro foi notificado." : "O passageiro foi notificado."
      );
      await fetchMyRides();
      setOpenSheet(false);
    } catch (err) {
      showError("Erro", err instanceof Error ? err.message : "Tenta novamente.");
    }
  }

  // --- Cancel booking (passenger) ---
  async function handleCancelBooking(bookingId: string) {
    try {
      await apiRequest(`/bookings/${bookingId}/cancel`, { method: "POST" });
      showSuccess("Reserva cancelada", "");
      await fetchMyBookings();
      setOpenSheet(false);
    } catch (err) {
      showError("Erro ao cancelar", err instanceof Error ? err.message : "Tenta novamente.");
    }
  }

  // --- Cancel ride (driver) ---
  async function handleCancelRide(rideId: string) {
    try {
      await apiRequest(`/rides/${rideId}`, { method: "DELETE" });
      showSuccess("Boleia cancelada", "");
      await fetchMyRides();
      setOpenSheet(false);
    } catch (err) {
      showError("Erro ao cancelar boleia", err instanceof Error ? err.message : "Tenta novamente.");
    }
  }

  // --- Complete ride (driver) ---
  async function handleCompleteRide(rideId: string) {
    try {
      await apiRequest(`/rides/${rideId}/complete`, { method: "POST" });
      showSuccess("Boleia concluída!", "O pagamento foi processado.");
      await fetchMyRides();
      fetchPendingRatings();
      setOpenSheet(false);
    } catch (err) {
      showError("Erro ao concluir boleia", err instanceof Error ? err.message : "Tenta novamente.");
    }
  }

  const isLoading = hydrating || ridesLoading || bookingsLoading;
  const pendingBookingsForRide = (ride: ApiRide) =>
    (ride.bookings ?? []).filter((b) => b.status === "PENDING");

  return (
    <>
      <div className="relative min-h-screen pb-32 bg-white text-gray-900">
        <BackgroundGlow />
        <div className="relative z-10 px-4">
          <div className="mx-auto max-w-mobile md:max-w-tablet lg:max-w-desktop">

            {/* Calendário */}
            <section className="pt-4 pb-6">
              <h2 className="text-sm font-bold text-gray-900 mb-3">Próximas boleias</h2>
              {isLoading ? (
                <div className="grid gap-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <RideCardSkeleton key={i} />
                  ))}
                </div>
              ) : ridesData.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-gray-600 mb-1">Ainda não tens boleias</p>
                  <p className="text-xs text-gray-500">Usa o botão + para criar uma boleia ou um template</p>
                </div>
              ) : (
                <RidesCalendar rides={ridesData} onRideClick={handleCalendarClick} />
              )}
            </section>

            {/* Templates */}
            <section className="pb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-gray-900">Templates de viagem</h2>
                <Button variant="secondary" className="text-xs" onClick={() => setOpenScheduleSheet(true)}>
                  Novo template
                </Button>
              </div>
              {schedulesLoading ? (
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                  {Array.from({ length: 2 }).map((_, i) => <EntityCardSkeleton key={i} />)}
                </div>
              ) : schedules.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
                  <p className="text-sm text-gray-600">Ainda não tens templates.</p>
                  <p className="text-xs text-gray-500 mt-1">Cria um para publicar boleias recorrentes (ex.: Seg–Sex às 08:00).</p>
                  <Button variant="secondary" className="mt-3" onClick={() => setOpenScheduleSheet(true)}>
                    Criar template
                  </Button>
                </div>
              ) : (
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                  {schedules.map((s) => (
                    <EntityCard
                      key={s.id}
                      title={`${s.origin} → ${s.destination}`}
                      subtitle={`${s.time} · ${s.daysOfWeek.join(", ")}`}
                      meta={`${s.availableSeats} lugares${s.price != null && s.price > 0 ? ` · €${s.price.toFixed(0)}` : ""}`}
                      badges={s.active ? [{ label: "Ativo", tone: "success" }] : [{ label: "Inativo" }]}
                      avatar={{ initials: s.vehicle ? `${s.vehicle.brand[0]}${s.vehicle.model[0]}` : "?" }}
                      primaryLabel="Criar boleia"
                      secondaryLabel="Detalhes"
                      onPrimary={() => { setSelectedSchedule(s); setOpenCreateRideSheet(true); }}
                      onSecondary={() => { setSelectedSchedule(s); setOpenCreateRideSheet(true); }}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* As minhas boleias (condutor) */}
            {!isLoading && myRides.filter((r) => r.status !== "CANCELLED").length > 0 && (
              <section className="pb-6">
                <h2 className="text-sm font-bold text-gray-900 mb-3">As minhas boleias</h2>
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                  {myRides.filter((r) => r.status !== "CANCELLED").map((ride) => {
                    const pending = pendingBookingsForRide(ride);
                    const initials = ride.vehicle
                      ? `${ride.vehicle.brand[0]}${ride.vehicle.model[0]}`
                      : "?";
                    return (
                      <EntityCard
                        key={ride.id}
                        title={`${ride.origin} → ${ride.destination}`}
                        subtitle={formatDateTime(ride.departureTime)}
                        meta={`${ride.remainingSeats} lugares livres${ride.price ? ` · €${ride.price.toFixed(0)}` : ""}`}
                        badges={[
                          { label: "Condutor", tone: "brand" },
                          ...(pending.length > 0 ? [{ label: `${pending.length} pendente${pending.length > 1 ? "s" : ""}`, tone: "warning" as const }] : []),
                        ]}
                        avatar={{ initials }}
                        primaryLabel={pending.length > 0 ? `Ver reservas (${pending.length})` : "Detalhes"}
                        onPrimary={() => {
                          setSelectedRide(ride);
                          setSelectedBooking(null);
                          setSheetView(pending.length > 0 ? "passengers" : "ride");
                          setOpenSheet(true);
                        }}
                      />
                    );
                  })}
                </div>
              </section>
            )}

            {/* As minhas reservas (passageiro) */}
            {!isLoading && myBookings.filter((b) => b.status !== "CANCELLED" && b.status !== "DECLINED").length > 0 && (
              <section className="pb-6">
                <h2 className="text-sm font-bold text-gray-900 mb-3">As minhas reservas</h2>
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                  {myBookings
                    .filter((b) => b.status !== "CANCELLED" && b.status !== "DECLINED")
                    .map((booking) => {
                      const pendingForBooking = pendingRatings.find((r) => r.bookingId === booking.id);
                      return (
                        <EntityCard
                          key={booking.id}
                          title={booking.ride ? `${booking.ride.origin} → ${booking.ride.destination}` : "Boleia"}
                          subtitle={booking.ride ? formatDateTime(booking.ride.departureTime) : ""}
                          meta={`${booking.seats} lugar${booking.seats > 1 ? "es" : ""}${booking.ride?.price ? ` · €${(booking.ride.price * booking.seats).toFixed(0)}` : ""}`}
                          badges={[{ label: STATUS_LABEL[booking.status] ?? booking.status, tone: STATUS_TONE[booking.status] }]}
                          avatar={{
                            src: booking.ride?.driver?.profile?.avatarUrl ?? undefined,
                            initials: (booking.ride?.driver?.profile?.name ?? booking.ride?.driver?.email ?? "?").slice(0, 2).toUpperCase(),
                          }}
                          primaryLabel="Detalhes"
                          onPrimary={() => {
                            setSelectedBooking(booking);
                            setSelectedRide(null);
                            setSheetView("booking");
                            setOpenSheet(true);
                          }}
                          secondaryLabel={pendingForBooking ? "Avaliar condutor" : undefined}
                          onSecondary={pendingForBooking ? () => { setRatingTarget(pendingForBooking); setOpenRating(true); } : undefined}
                        />
                      );
                    })}
                </div>
              </section>
            )}

          </div>
        </div>
      </div>

      {/* Sheet de detalhes */}
      <Sheet
        open={openSheet}
        onClose={() => { setOpenSheet(false); setSelectedRide(null); setSelectedBooking(null); setSheetView("ride"); }}
        title={
          sheetView === "passengers" ? "Reservas pendentes"
          : selectedRide ? "Boleia"
          : "A minha reserva"
        }
        height="lg"
        footer={
          sheetView === "passengers" ? (
            <Button variant="secondary" className="w-full" onClick={() => setSheetView("ride")}>Voltar</Button>
          ) : selectedRide ? (
            <div className="flex gap-2 flex-wrap">
              <Button variant="secondary" className="flex-1" onClick={() => setOpenSheet(false)}>Fechar</Button>
              {(selectedRide.bookings ?? []).filter((b) => b.status === "PENDING").length > 0 && (
                <Button className="flex-1" onClick={() => setSheetView("passengers")}>
                  Ver reservas ({(selectedRide.bookings ?? []).filter((b) => b.status === "PENDING").length})
                </Button>
              )}
              {selectedRide.status === "SCHEDULED" && (
                <Button variant="secondary" className="flex-1" onClick={() => handleCompleteRide(selectedRide.id)}>
                  Concluir
                </Button>
              )}
              <Button variant="danger" className="flex-1" onClick={() => handleCancelRide(selectedRide.id)}>
                Cancelar
              </Button>
            </div>
          ) : selectedBooking ? (
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setOpenSheet(false)}>Fechar</Button>
              {selectedBooking.status === "PENDING" && (
                <Button variant="danger" className="flex-1" onClick={() => handleCancelBooking(selectedBooking.id)}>
                  Cancelar reserva
                </Button>
              )}
              {(() => {
                const pending = pendingRatings.find((r) => r.bookingId === selectedBooking.id);
                return pending ? (
                  <Button className="flex-1" onClick={() => { setRatingTarget(pending); setOpenSheet(false); setOpenRating(true); }}>
                    Avaliar condutor
                  </Button>
                ) : null;
              })()}
            </div>
          ) : null
        }
      >
        {/* Vista: Passageiros com reservas pendentes */}
        {sheetView === "passengers" && selectedRide && (
          <div className="grid gap-3 p-1">
            {(selectedRide.bookings ?? []).filter((b) => b.status === "PENDING").length === 0 ? (
              <p className="text-sm text-gray-600 text-center py-12">Sem reservas pendentes</p>
            ) : (
              (selectedRide.bookings ?? [])
                .filter((b: ApiRideBooking) => b.status === "PENDING")
                .map((b: ApiRideBooking) => {
                  const name = b.user?.profile?.name ?? b.user?.email ?? "Passageiro";
                  return (
                    <div key={b.id} className="p-4 border border-gray-200 bg-gray-50 rounded-xl">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="font-semibold text-sm text-gray-900">{name}</div>
                          <div className="text-xs text-gray-500">{b.seats} lugar{b.seats > 1 ? "es" : ""}</div>
                        </div>
                        <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5">
                          Pendente
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="secondary" className="flex-1" onClick={() => handleBookingStatus(b.id, "DECLINED")}>
                          Recusar
                        </Button>
                        <Button className="flex-1" onClick={() => handleBookingStatus(b.id, "CONFIRMED")}>
                          Confirmar
                        </Button>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        )}

        {/* Vista: Detalhes da minha boleia (condutor) */}
        {sheetView === "ride" && selectedRide && (
          <div className="grid gap-4 p-1">
            <div className="grid gap-2 p-4 bg-gray-50 border border-gray-200 rounded-xl">
              <Row label="Origem" value={selectedRide.origin} />
              <div className="h-px bg-gray-100" />
              <Row label="Destino" value={selectedRide.destination} />
            </div>
            <div className="grid gap-2 p-4 bg-gray-50 border border-gray-200 rounded-xl">
              <Row label="Partida" value={formatDateTime(selectedRide.departureTime)} />
              <Row label="Lugares disponíveis" value={`${selectedRide.remainingSeats} / ${selectedRide.availableSeats}`} />
              {selectedRide.price != null && <Row label="Preço/lugar" value={`€${selectedRide.price.toFixed(2)}`} />}
            </div>
            {selectedRide.vehicle && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <div className="text-xs text-gray-500 mb-1">Veículo</div>
                <div className="font-semibold text-sm text-gray-900">
                  {selectedRide.vehicle.brand} {selectedRide.vehicle.model}
                  {selectedRide.vehicle.color ? ` · ${selectedRide.vehicle.color}` : ""}
                </div>
              </div>
            )}
            {(selectedRide.bookings ?? []).filter((b) => b.status === "CONFIRMED").length > 0 && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <div className="text-xs text-gray-500 mb-2">Passageiros confirmados</div>
                <div className="grid gap-1">
                  {(selectedRide.bookings ?? [])
                    .filter((b: ApiRideBooking) => b.status === "CONFIRMED")
                    .map((b: ApiRideBooking) => {
                      const pendingForPassenger = pendingRatings.find((r) => r.bookingId === b.id && r.role === "driver");
                      return (
                        <div key={b.id} className="flex items-center justify-between text-sm text-gray-900">
                          <span>{b.user?.profile?.name ?? b.user?.email ?? "Passageiro"} · {b.seats} lugar{b.seats > 1 ? "es" : ""}</span>
                          {pendingForPassenger && (
                            <button
                              className="text-xs font-semibold text-blue-600 ml-2 shrink-0"
                              onClick={() => { setRatingTarget(pendingForPassenger); setOpenSheet(false); setOpenRating(true); }}
                            >
                              Avaliar
                            </button>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Vista: Detalhes da minha reserva (passageiro) */}
        {sheetView === "booking" && selectedBooking && selectedBooking.ride && (
          <div className="grid gap-4 p-1">
            <div className="grid gap-2 p-4 bg-gray-50 border border-gray-200 rounded-xl">
              <Row label="Origem" value={selectedBooking.ride.origin} />
              <div className="h-px bg-gray-100" />
              <Row label="Destino" value={selectedBooking.ride.destination} />
            </div>
            <div className="grid gap-2 p-4 bg-gray-50 border border-gray-200 rounded-xl">
              <Row label="Partida" value={formatDateTime(selectedBooking.ride.departureTime)} />
              <Row label="Lugares reservados" value={String(selectedBooking.seats)} />
              {selectedBooking.ride.price != null && (
                <Row label="Custo total" value={`€${(selectedBooking.ride.price * selectedBooking.seats).toFixed(2)}`} />
              )}
              <Row label="Estado" value={STATUS_LABEL[selectedBooking.status] ?? selectedBooking.status} />
            </div>
            {selectedBooking.ride.driver && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <div className="text-xs text-gray-500 mb-1">Condutor</div>
                <div className="flex items-center gap-2">
                  <div className="font-semibold text-sm text-gray-900">
                    {selectedBooking.ride.driver.profile?.name ?? selectedBooking.ride.driver.email}
                  </div>
                  {selectedBooking.ride.driver.isIdentityVerified && (
                    <span className="text-xs bg-green-100 text-green-700 border border-green-200 rounded-full px-2 py-0.5">
                      Verificado
                    </span>
                  )}
                </div>
              </div>
            )}
            {selectedBooking.ride.vehicle && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <div className="text-xs text-gray-500 mb-1">Veículo</div>
                <div className="font-semibold text-sm text-gray-900">
                  {selectedBooking.ride.vehicle.brand} {selectedBooking.ride.vehicle.model}
                  {selectedBooking.ride.vehicle.color ? ` · ${selectedBooking.ride.vehicle.color}` : ""}
                </div>
              </div>
            )}
          </div>
        )}
      </Sheet>

      <CreateScheduleSheet
        open={openScheduleSheet}
        onClose={() => setOpenScheduleSheet(false)}
        onSuccess={fetchSchedules}
      />
      <CreateRideFromTemplateSheet
        open={openCreateRideSheet}
        schedule={selectedSchedule}
        onClose={() => { setOpenCreateRideSheet(false); setSelectedSchedule(null); }}
        onSuccess={fetchSchedules}
      />
      <RatingsSheet
        open={openRating}
        onClose={() => { setOpenRating(false); setRatingTarget(null); fetchPendingRatings(); }}
        bookingId={ratingTarget?.bookingId}
        revieweeId={ratingTarget?.revieweeId}
        revieweeName={ratingTarget?.revieweeName}
      />
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold text-gray-900">{value}</span>
    </div>
  );
}
