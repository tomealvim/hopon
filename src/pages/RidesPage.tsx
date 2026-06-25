import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useInbox } from "../contexts/InboxContext";
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

type RideRequestItem = {
  id: string;
  origin: string;
  destination: string;
  departTime: string;
  daysOfWeek: string[];
  note?: string;
  originDistKm?: number | null;
  destDistKm?: number | null;
  dayMatch?: boolean;
  passenger?: { profile?: { name?: string; avatarUrl?: string } | null; email?: string } | null;
};

const DAY_LABELS: Record<string, string> = {
  MON: "Seg", TUE: "Ter", WED: "Qua", THU: "Qui", FRI: "Sex", SAT: "Sab", SUN: "Dom",
};

function RideRequestsForDriver() {
  const [requests, setRequests] = useState<RideRequestItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);

    function load(lat?: number, lng?: number) {
      const params = new URLSearchParams();
      if (lat != null) params.set("lat", String(lat));
      if (lng != null) params.set("lng", String(lng));
      apiRequest<RideRequestItem[]>(`/ride-requests/for-driver?${params}`)
        .then((data) => setRequests(Array.isArray(data) ? data : []))
        .catch(() => setRequests([]))
        .finally(() => setLoading(false));
    }

    navigator.geolocation?.getCurrentPosition(
      (pos) => load(pos.coords.latitude, pos.coords.longitude),
      () => load(),
    );
  }, []);

  if (loading) return null;
  if (requests.length === 0) return null;

  return (
    <section className="pb-6">
      <h2 className="text-sm font-bold text-[#1A1C19] mb-1">Pedidos de boleia perto de ti</h2>
      <p className="text-xs text-[#717973] mb-3">Ordenados por proximidade - passageiros que precisam de boleia na tua zona</p>
      <div className="flex flex-col gap-2">
        {requests.map((r) => {
          const name = r.passenger?.profile?.name ?? r.passenger?.email ?? "Passageiro";
          const days = (r.daysOfWeek as string[]).map((d) => DAY_LABELS[d] ?? d).join(", ");
          return (
            <div key={r.id} className="flex items-start gap-3 bg-[#f3f4ef] border border-[#e7e9e4] rounded-xl px-4 py-3">
              <div className="mt-0.5 w-8 h-8 rounded-full bg-[#edeee9] flex items-center justify-center text-xs font-semibold text-[#414844] shrink-0">
                {name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-[#1A1C19]">{name}</p>
                  <div className="flex items-center gap-1.5">
                    {r.originDistKm != null && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700">
                        {r.originDistKm < 1 ? `${Math.round(r.originDistKm * 1000)}m` : `${r.originDistKm}km`}
                      </span>
                    )}
                    {r.dayMatch === false && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700">
                        Dias diferentes
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-[#414844] truncate mt-0.5">{r.origin} - {r.destination}</p>
                <p className="text-xs text-[#717973]">{r.departTime} · {days}</p>
                {r.note && <p className="text-xs text-[#717973] mt-0.5 italic">{r.note}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

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
  IN_PROGRESS: "Em curso",
  NO_SHOW: "Não apareceu",
};

const STATUS_TONE: Record<string, "success" | "warning" | "brand" | undefined> = {
  PENDING: "warning",
  CONFIRMED: "success",
  DECLINED: undefined,
  CANCELLED: undefined,
  COMPLETED: "brand",
};

function PresenceConfirmBanner({
  bookingId, origin, destination, onConfirmed
}: {
  bookingId: string;
  origin: string;
  destination: string;
  onConfirmed: (present: boolean) => void;
}) {
  const [loading, setLoading] = useState<"yes" | "no" | null>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="text-xs text-[#717973] text-center py-2">
        Obrigado pela confirmacao
      </div>
    );
  }

  async function confirm(present: boolean) {
    setLoading(present ? "yes" : "no");
    try {
      await apiRequest(`/bookings/${bookingId}/confirm-presence`, {
        method: "POST",
        body: JSON.stringify({ present }),
      });
      setDone(true);
      onConfirmed(present);
    } catch {
      setLoading(null);
    }
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-2">
      <p className="text-xs font-semibold text-amber-800 mb-2">
        Embarcaste nesta boleia? ({origin} - {destination})
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => confirm(true)}
          disabled={loading !== null}
          className="flex-1 text-xs font-semibold py-2 rounded-lg border border-green-300 bg-green-50 text-green-700 disabled:opacity-50"
        >
          {loading === "yes" ? "..." : "Estive la"}
        </button>
        <button
          onClick={() => confirm(false)}
          disabled={loading !== null}
          className="flex-1 text-xs font-semibold py-2 rounded-lg border border-red-200 bg-red-50 text-red-700 disabled:opacity-50"
        >
          {loading === "no" ? "..." : "Nao embarquei"}
        </button>
      </div>
    </div>
  );
}

type RidesPageProps = {
  onOpenGroupChat?: (threadId: string) => void;
  initialRateBookingId?: string;
};

export default function RidesPage({ onOpenGroupChat, initialRateBookingId }: RidesPageProps = {}) {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotifications();
  const { subscribe } = useSSE();
  const { getGroupThreadByRideId, refresh: refreshInbox } = useInbox();

  const [ridesTab, setRidesTab] = useState<"driver" | "passenger">("driver");

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

  // Auto-open rating sheet se vem de notificacao push
  const initialRateHandled = useRef(false);
  useEffect(() => {
    if (!initialRateBookingId || initialRateHandled.current) return;
    if (pendingRatings.length === 0) return;
    const target = pendingRatings.find((r) => r.bookingId === initialRateBookingId);
    if (target) {
      initialRateHandled.current = true;
      setRatingTarget(target);
      setOpenRating(true);
    }
  }, [initialRateBookingId, pendingRatings]);

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
  const [now, setNow] = useState(() => Date.now());

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

  // Ticker for live countdown (updates every second when a ride is IN_PROGRESS)
  useEffect(() => {
    if (!selectedRide || selectedRide.status !== "IN_PROGRESS") return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [selectedRide?.status, selectedRide?.id]);

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
      showError("Erro ao alterar reserva", err instanceof Error ? err.message : "Tenta novamente.");
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

  // --- On the way (driver) ---
  async function handleOnTheWay(rideId: string) {
    try {
      await apiRequest(`/rides/${rideId}/on-the-way`, { method: "POST" });
      showSuccess("Passageiros notificados!", "Os passageiros confirmados foram avisados que estás a caminho.");
      const updated = await apiRequest<ApiRide>(`/rides/${rideId}`);
      setMyRides((prev) => prev.map((r) => (r.id === rideId ? updated : r)));
      setSelectedRide(updated);
    } catch (err) {
      showError("Erro", err instanceof Error ? err.message : "Tenta novamente.");
    }
  }

  // --- Arrive at meeting point (driver) ---
  async function handleArriveAtMeetingPoint(rideId: string) {
    try {
      await apiRequest(`/rides/${rideId}/arrive`, { method: "POST" });
      showSuccess("Chegada marcada!", "Os passageiros foram notificados.");
      const updated = await apiRequest<ApiRide>(`/rides/${rideId}`);
      setMyRides((prev) => prev.map((r) => (r.id === rideId ? updated : r)));
      setSelectedRide(updated);
    } catch (err) {
      showError("Erro ao marcar chegada", err instanceof Error ? err.message : "Tenta novamente.");
    }
  }

  // --- Mark no-show (driver) ---
  async function handleMarkNoShow(bookingId: string) {
    try {
      await apiRequest(`/bookings/${bookingId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "NO_SHOW" }),
      });
      showSuccess("Passageiro marcado como não apareceu", "");
      if (selectedRide) {
        const updated = await apiRequest<ApiRide>(`/rides/${selectedRide.id}`);
        setMyRides((prev) => prev.map((r) => (r.id === selectedRide.id ? updated : r)));
        setSelectedRide(updated);
      }
    } catch (err) {
      showError("Erro ao marcar falta", err instanceof Error ? err.message : "Tenta novamente.");
    }
  }

  // --- Open group chat ---
  async function handleOpenGroupChat(rideId: string) {
    // Try to find the thread already loaded in context
    const existing = getGroupThreadByRideId(rideId);
    if (existing && onOpenGroupChat) {
      onOpenGroupChat(existing.id);
      return;
    }
    // Fetch from API (will create if not exists)
    try {
      const conv = await apiRequest<{ id: string }>(`/inbox/group/${rideId}`);
      await refreshInbox();
      if (onOpenGroupChat) onOpenGroupChat(conv.id);
    } catch (err) {
      showError("Erro ao abrir chat do grupo", err instanceof Error ? err.message : "Tenta novamente.");
    }
  }

  const isLoading = hydrating || ridesLoading || bookingsLoading;
  const pendingBookingsForRide = (ride: ApiRide) =>
    (ride.bookings ?? []).filter((b) => b.status === "PENDING");

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 pb-32 bg-white text-[#1A1C19]">
        <div className="text-4xl mb-4">🚗</div>
        <p className="text-sm font-semibold text-[#1A1C19] mb-1">As tuas viagens aparecem aqui</p>
        <p className="text-xs text-[#717973] text-center">Inicia sessão para ver e gerir as tuas boleias e reservas</p>
      </div>
    );
  }

  return (
    <>
      <div className="relative min-h-screen pb-32 bg-[#F9FAF5] text-[#1A1C19]">
        <BackgroundGlow />
        <div className="relative z-10 px-4">
          <div className="mx-auto max-w-mobile md:max-w-tablet lg:max-w-desktop">

            {/* Header editorial */}
            <header className="pt-6 pb-2">
              <h2 className="font-noto-serif italic text-[2rem] leading-tight text-[#1B4332]">As tuas viagens</h2>
              <p className="text-[#1B4332]/60 font-medium text-sm mt-1">Gere as tuas boleias e conexoes.</p>
            </header>

            {/* Tab selector: Condutor / Passageiro */}
            <div className="sticky top-0 z-30 flex gap-2 pt-4 pb-4 mb-2 -mx-4 px-4 bg-[#F9FAF5] border-b border-[#D0E8DC]/40">
              {(["driver", "passenger"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setRidesTab(t)}
                  className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all ${
                    ridesTab === t
                      ? "bg-[#1B4332] text-white shadow-sm"
                      : "bg-[#edeee9] text-[#1B4332]/70 hover:bg-[#e7e9e4]"
                  }`}
                >
                  {t === "driver" ? "Como Condutor" : "Como Passageiro"}
                </button>
              ))}
            </div>

            {ridesTab === "driver" && (
            <>

            {/* Calendário */}
            <section className="pt-4 pb-6">
              <h2 className="text-sm font-bold text-[#1A1C19] mb-3">Próximas boleias</h2>
              {isLoading ? (
                <div className="grid gap-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <RideCardSkeleton key={i} />
                  ))}
                </div>
              ) : ridesData.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-[#414844] mb-1">Ainda não tens boleias</p>
                  <p className="text-xs text-[#717973]">Usa o botão + para criar uma boleia ou um template</p>
                </div>
              ) : (
                <RidesCalendar rides={ridesData} onRideClick={handleCalendarClick} />
              )}
            </section>

            {/* Templates */}
            <section className="pb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-[#1A1C19]">Templates de viagem</h2>
                <Button variant="secondary" className="text-xs" onClick={() => setOpenScheduleSheet(true)}>
                  Novo template
                </Button>
              </div>
              {schedulesLoading ? (
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                  {Array.from({ length: 2 }).map((_, i) => <EntityCardSkeleton key={i} />)}
                </div>
              ) : schedules.length === 0 ? (
                <div className="rounded-xl border border-[#e7e9e4] bg-[#f3f4ef] p-4 text-center">
                  <p className="text-sm text-[#414844]">Ainda não tens templates.</p>
                  <p className="text-xs text-[#717973] mt-1">Cria um para publicar boleias recorrentes (ex.: Seg–Sex às 08:00).</p>
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
                <h2 className="text-sm font-bold text-[#1A1C19] mb-3">As minhas boleias</h2>
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                  {myRides.filter((r) => r.status !== "CANCELLED").map((ride) => {
                    const pending = pendingBookingsForRide(ride);
                    const initials = ride.vehicle
                      ? `${ride.vehicle.brand[0]}${ride.vehicle.model[0]}`
                      : "?";
                    const groupThread = getGroupThreadByRideId(ride.id);
                    const groupUnread = groupThread?.unreadCount ?? 0;
                    return (
                      <EntityCard
                        key={ride.id}
                        title={`${ride.origin} → ${ride.destination}`}
                        subtitle={formatDateTime(ride.departureTime)}
                        meta={`${ride.remainingSeats} lugares livres${ride.price ? ` · €${ride.price.toFixed(0)}` : ""}`}
                        badges={[
                          { label: "Condutor", tone: "brand" },
                          ...(pending.length > 0 ? [{ label: `${pending.length} pendente${pending.length > 1 ? "s" : ""}`, tone: "warning" as const }] : []),
                          ...(groupUnread > 0 ? [{ label: `${groupUnread} msg grupo`, tone: "brand" as const }] : []),
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

            {/* Pedidos de boleia na minha rota (condutor) */}
            {!isLoading && schedules.length > 0 && (
              <RideRequestsForDriver />
            )}

            </>
            )}

            {ridesTab === "passenger" && (
            <>

            {/* As minhas reservas (passageiro) */}
            {!isLoading && myBookings.filter((b) => b.status !== "CANCELLED" && b.status !== "DECLINED").length === 0 ? (
              <div className="text-center py-12 px-4">
                <p className="text-sm font-semibold text-[#1A1C19] mb-1">Ainda não tens reservas</p>
                <p className="text-xs text-[#717973]">Vai ao Explorar para encontrar uma boleia.</p>
              </div>
            ) : (
              !isLoading && (
                <section className="pb-6">
                  <h2 className="text-sm font-bold text-[#1A1C19] mb-3">As minhas reservas</h2>
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
              )
            )}

            </>
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
              {onOpenGroupChat && (() => {
                const groupThread = getGroupThreadByRideId(selectedRide.id);
                return (
                  <Button
                    variant="secondary"
                    className="flex-1 relative"
                    onClick={() => { setOpenSheet(false); handleOpenGroupChat(selectedRide.id); }}
                  >
                    Chat do grupo
                    {groupThread && groupThread.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {groupThread.unreadCount}
                      </span>
                    )}
                  </Button>
                );
              })()}
              {(selectedRide.bookings ?? []).filter((b) => b.status === "PENDING").length > 0 && (
                <Button className="flex-1" onClick={() => setSheetView("passengers")}>
                  Ver reservas ({(selectedRide.bookings ?? []).filter((b) => b.status === "PENDING").length})
                </Button>
              )}
              {selectedRide.status === "SCHEDULED" && !selectedRide.onTheWayAt && (selectedRide.bookings ?? []).some((b) => b.status === "CONFIRMED") && (() => {
                const minsUntil = (new Date(selectedRide.departureTime).getTime() - now) / 60_000;
                return minsUntil <= 120 ? (
                  <Button className="flex-1" onClick={() => handleOnTheWay(selectedRide.id)}>
                    Estou a caminho
                  </Button>
                ) : null;
              })()}
              {selectedRide.status === "SCHEDULED" && (selectedRide.bookings ?? []).some((b) => b.status === "CONFIRMED") && (
                <Button className="flex-1" onClick={() => handleArriveAtMeetingPoint(selectedRide.id)}>
                  Estou no ponto
                </Button>
              )}
              {(selectedRide.status === "SCHEDULED" || selectedRide.status === "IN_PROGRESS") && (() => {
                if (selectedRide.status === "IN_PROGRESS") {
                  const arrivedMs = selectedRide.arrivedAt ? new Date(selectedRide.arrivedAt).getTime() : null;
                  const elapsedS = arrivedMs ? Math.floor((now - arrivedMs) / 1000) : 600;
                  const remainingConfirmed = (selectedRide.bookings ?? []).filter((b) => b.status === "CONFIRMED").length;
                  const canComplete = elapsedS >= 600 || remainingConfirmed === 0;
                  return canComplete ? (
                    <Button variant="secondary" className="flex-1" onClick={() => handleCompleteRide(selectedRide.id)}>
                      Concluir
                    </Button>
                  ) : null;
                }
                return (
                  <Button variant="secondary" className="flex-1" onClick={() => handleCompleteRide(selectedRide.id)}>
                    Concluir
                  </Button>
                );
              })()}
              {selectedRide.status === "SCHEDULED" && (
                <Button variant="danger" className="flex-1" onClick={() => handleCancelRide(selectedRide.id)}>
                  Cancelar
                </Button>
              )}
            </div>
          ) : selectedBooking ? (
            <div className="flex gap-2 flex-wrap">
              <Button variant="secondary" className="flex-1" onClick={() => setOpenSheet(false)}>Fechar</Button>
              {selectedBooking.status === "CONFIRMED" && selectedBooking.ride && onOpenGroupChat && (() => {
                const groupThread = getGroupThreadByRideId(selectedBooking.ride.id);
                return (
                  <Button
                    variant="secondary"
                    className="flex-1 relative"
                    onClick={() => { setOpenSheet(false); handleOpenGroupChat(selectedBooking.ride!.id); }}
                  >
                    Chat do grupo
                    {groupThread && groupThread.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {groupThread.unreadCount}
                      </span>
                    )}
                  </Button>
                );
              })()}
              {(selectedBooking.status === "PENDING" || selectedBooking.status === "CONFIRMED") && (
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
              <p className="text-sm text-[#414844] text-center py-12">Sem reservas pendentes</p>
            ) : (
              (selectedRide.bookings ?? [])
                .filter((b: ApiRideBooking) => b.status === "PENDING")
                .map((b: ApiRideBooking) => {
                  const name = b.user?.profile?.name ?? b.user?.email ?? "Passageiro";
                  return (
                    <div key={b.id} className="p-4 border border-[#e7e9e4] bg-[#f3f4ef] rounded-xl">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="font-semibold text-sm text-[#1A1C19]">{name}</div>
                          <div className="text-xs text-[#717973]">{b.seats} lugar{b.seats > 1 ? "es" : ""}</div>
                        </div>
                        <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5">
                          Pendente
                        </span>
                      </div>
                      {b.detourMeters != null && (
                        <div className={`mb-3 rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-1.5 ${
                          b.detourMeters <= 500
                            ? "bg-green-50 border border-green-200 text-green-700"
                            : b.detourMeters <= 2000
                            ? "bg-amber-50 border border-amber-200 text-amber-700"
                            : "bg-red-50 border border-red-200 text-red-700"
                        }`}>
                          {b.detourMeters <= 500 ? (
                            <>✓ Ponto de embarque na tua rota</>
                          ) : b.detourMeters <= 2000 ? (
                            <>⚠ Desvio de ~{b.detourMeters}m da tua rota</>
                          ) : (
                            <>{(b.detourMeters / 1000).toFixed(1)}km fora da tua rota</>
                          )}
                        </div>
                      )}
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
            <div className="grid gap-2 p-4 bg-[#f3f4ef] border border-[#e7e9e4] rounded-xl">
              <Row label="Origem" value={selectedRide.origin} />
              <div className="h-px bg-[#f3f4ef]" />
              <Row label="Destino" value={selectedRide.destination} />
            </div>
            <div className="grid gap-2 p-4 bg-[#f3f4ef] border border-[#e7e9e4] rounded-xl">
              <Row label="Partida" value={formatDateTime(selectedRide.departureTime)} />
              <Row label="Lugares disponíveis" value={`${selectedRide.remainingSeats} / ${selectedRide.availableSeats}`} />
              {selectedRide.price != null && <Row label="Preço/lugar" value={`€${selectedRide.price.toFixed(2)}`} />}
            </div>
            {selectedRide.vehicle && (
              <div className="p-4 bg-[#f3f4ef] border border-[#e7e9e4] rounded-xl">
                <div className="text-xs text-[#717973] mb-1">Veículo</div>
                <div className="font-semibold text-sm text-[#1A1C19]">
                  {selectedRide.vehicle.brand} {selectedRide.vehicle.model}
                  {selectedRide.vehicle.color ? ` · ${selectedRide.vehicle.color}` : ""}
                </div>
              </div>
            )}
            {selectedRide.status === "IN_PROGRESS" && selectedRide.arrivedAt && (() => {
              const arrivedMs = new Date(selectedRide.arrivedAt).getTime();
              const elapsedS = Math.floor((now - arrivedMs) / 1000);
              const remainingS = Math.max(0, 600 - elapsedS);
              const mm = String(Math.floor(remainingS / 60)).padStart(2, "0");
              const ss = String(remainingS % 60).padStart(2, "0");
              return (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
                  <div className="text-xs text-amber-700 mb-1">Janela de espera</div>
                  {remainingS > 0 ? (
                    <div className="text-2xl font-mono font-bold text-amber-800">{mm}:{ss}</div>
                  ) : (
                    <div className="text-sm font-semibold text-amber-800">Tempo esgotado - podes concluir a viagem</div>
                  )}
                </div>
              );
            })()}
            {(selectedRide.bookings ?? []).filter((b) => b.status === "CONFIRMED" || b.status === "NO_SHOW").length > 0 && (
              <div className="p-4 bg-[#f3f4ef] border border-[#e7e9e4] rounded-xl">
                <div className="text-xs text-[#717973] mb-2">Passageiros confirmados</div>
                <div className="grid gap-2">
                  {(selectedRide.bookings ?? [])
                    .filter((b: ApiRideBooking) => b.status === "CONFIRMED" || b.status === "NO_SHOW")
                    .map((b: ApiRideBooking) => {
                      const pendingForPassenger = pendingRatings.find((r) => r.bookingId === b.id && r.role === "driver");
                      const isNoShow = b.status === "NO_SHOW";
                      return (
                        <div key={b.id} className="flex items-center justify-between text-sm text-[#1A1C19]">
                          <div>
                            <span className={isNoShow ? "line-through text-[#717973]" : ""}>
                              {b.user?.profile?.name ?? b.user?.email ?? "Passageiro"} · {b.seats} lugar{b.seats > 1 ? "es" : ""}
                            </span>
                            {b.user?.phone && !isNoShow && (
                              <a href={`tel:${b.user.phone}`} className="block text-xs text-blue-600 font-medium mt-0.5">
                                {b.user.phone}
                              </a>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-2 shrink-0">
                            {!isNoShow && selectedRide.status === "IN_PROGRESS" && (
                              <button
                                className="text-xs font-semibold text-red-500 border border-red-200 rounded px-2 py-0.5 hover:bg-red-50"
                                onClick={() => handleMarkNoShow(b.id)}
                              >
                                Não apareceu
                              </button>
                            )}
                            {isNoShow && (
                              <span className="text-xs text-red-500 border border-red-200 rounded px-2 py-0.5">Não apareceu</span>
                            )}
                            {pendingForPassenger && (
                              <button
                                className="text-xs font-semibold text-blue-600"
                                onClick={() => { setRatingTarget(pendingForPassenger); setOpenSheet(false); setOpenRating(true); }}
                              >
                                Avaliar
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Partilhar boleia */}
        {sheetView === "ride" && selectedRide && selectedRide.status === "SCHEDULED" && (() => {
          const shareUrl = `${window.location.origin}/ride/${selectedRide.id}`;
          const shareText = `${selectedRide.origin} - ${selectedRide.destination} | ${formatDateTime(selectedRide.departureTime)}${selectedRide.price ? ` | €${selectedRide.price.toFixed(0)}/lugar` : ""} | ${selectedRide.remainingSeats} lugar${selectedRide.remainingSeats !== 1 ? "es" : ""} disponivel${selectedRide.remainingSeats !== 1 ? "s" : ""}`;
          return (
            <div className="px-1 pb-1">
              <button
                className="w-full flex items-center justify-center gap-2 text-sm font-medium text-[#414844] border border-[#e7e9e4] rounded-xl py-3 hover:bg-[#f3f4ef] transition"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: "Boleia HopOn", text: shareText, url: shareUrl }).catch(() => {});
                  } else {
                    navigator.clipboard?.writeText(shareUrl).catch(() => {});
                  }
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Partilhar boleia
              </button>
            </div>
          );
        })()}

        {/* Vista: Detalhes da minha reserva (passageiro) */}
        {sheetView === "booking" && selectedBooking && selectedBooking.ride && (
          <div className="grid gap-4 p-1">
            <div className="grid gap-2 p-4 bg-[#f3f4ef] border border-[#e7e9e4] rounded-xl">
              <Row label="Origem" value={selectedBooking.ride.origin} />
              <div className="h-px bg-[#f3f4ef]" />
              <Row label="Destino" value={selectedBooking.ride.destination} />
            </div>
            <div className="grid gap-2 p-4 bg-[#f3f4ef] border border-[#e7e9e4] rounded-xl">
              <Row label="Partida" value={formatDateTime(selectedBooking.ride.departureTime)} />
              <Row label="Lugares reservados" value={String(selectedBooking.seats)} />
              {selectedBooking.ride.price != null && (
                <Row label="Custo total" value={`€${(selectedBooking.ride.price * selectedBooking.seats).toFixed(2)}`} />
              )}
              <Row label="Estado" value={STATUS_LABEL[selectedBooking.status] ?? selectedBooking.status} />
            </div>
            {selectedBooking.status === "COMPLETED" && selectedBooking.passengerConfirmed === null && (
              <PresenceConfirmBanner
                bookingId={selectedBooking.id}
                origin={selectedBooking.ride.origin}
                destination={selectedBooking.ride.destination}
                onConfirmed={(present) => {
                  setMyBookings((prev) =>
                    prev.map((b) =>
                      b.id === selectedBooking.id
                        ? { ...b, passengerConfirmed: present, passengerConfirmedAt: new Date().toISOString() }
                        : b
                    )
                  );
                  setSelectedBooking((prev) =>
                    prev ? { ...prev, passengerConfirmed: present, passengerConfirmedAt: new Date().toISOString() } : prev
                  );
                }}
              />
            )}
            {(selectedBooking.status === "PENDING" || selectedBooking.status === "CONFIRMED") && selectedBooking.ride.price != null && selectedBooking.ride.price > 0 && (() => {
              const hoursUntil = (new Date(selectedBooking.ride.departureTime).getTime() - Date.now()) / 3_600_000;
              const policyText =
                hoursUntil > 2
                  ? "Reembolso total se cancelares agora"
                  : hoursUntil > 0.5
                    ? "Reembolso de 50% se cancelares agora (entre 30min e 2h antes)"
                    : "Sem reembolso - partida em menos de 30 minutos";
              const tone = hoursUntil > 2 ? "text-green-700 border-green-200 bg-green-50" : hoursUntil > 0.5 ? "text-amber-700 border-amber-200 bg-amber-50" : "text-red-700 border-red-200 bg-red-50";
              return (
                <div className={`p-3 rounded-xl border text-xs ${tone}`}>
                  <span className="font-semibold">Política de cancelamento: </span>{policyText}
                </div>
              );
            })()}
            {selectedBooking.ride.driver && (
              <div className="p-4 bg-[#f3f4ef] border border-[#e7e9e4] rounded-xl">
                <div className="text-xs text-[#717973] mb-1">Condutor</div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="font-semibold text-sm text-[#1A1C19]">
                    {selectedBooking.ride.driver.profile?.name ?? selectedBooking.ride.driver.email}
                  </div>
                  {selectedBooking.ride.driver.isIdentityVerified && (
                    <span className="text-xs bg-green-100 text-green-700 border border-green-200 rounded-full px-2 py-0.5">
                      Verificado
                    </span>
                  )}
                </div>
                {selectedBooking.status === "CONFIRMED" && selectedBooking.ride.driver.phone && (
                  <a href={`tel:${selectedBooking.ride.driver.phone}`} className="text-xs text-blue-600 font-medium">
                    {selectedBooking.ride.driver.phone}
                  </a>
                )}
                {selectedBooking.status === "CONFIRMED" && !selectedBooking.ride.driver.phone && (
                  <p className="text-xs text-[#717973]">Condutor sem telemóvel registado</p>
                )}
              </div>
            )}
            {selectedBooking.ride.vehicle && (
              <div className="p-4 bg-[#f3f4ef] border border-[#e7e9e4] rounded-xl">
                <div className="text-xs text-[#717973] mb-1">Veículo</div>
                <div className="font-semibold text-sm text-[#1A1C19]">
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
      <span className="text-[#717973]">{label}</span>
      <span className="font-semibold text-[#1A1C19]">{value}</span>
    </div>
  );
}
