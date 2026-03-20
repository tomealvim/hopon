import { useEffect, useState } from "react";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";
import { apiRequest } from "../services/api";
import DiscoverTopBar, { type DiscoverTab } from "../components/ui/DiscoverTopBar";
import DiscoverFiltersSheet from "../components/ui/DiscoverFiltersSheet";
import RequestSeatSheet from "../components/ui/RequestSeatSheet";
import PolicyAcceptanceSheet from "../components/ui/PolicyAcceptanceSheet";
import EntityCard from "../components/ui/EntityCard";
import { EntityCardSkeleton } from "../components/ui/Skeleton";
import Sheet from "../components/ui/Sheet";
import { Button } from "../components/ui/Button";
import BackgroundGlow from "../components/ui/BackgroundGlow";
import ReportSheet from "../components/ui/ReportSheet";

import type { DiscoverFilters } from "./types/discover";
import { defaultFilters } from "./types/discover";
import type { ApiRide } from "./types/ride-api";
import PublicProfileSheet from "../components/ui/PublicProfileSheet";
import SaveRouteSheet from "../components/discover/SaveRouteSheet";
import RideRequestSheet from "../components/discover/RideRequestSheet";

type DiscoverPageProps = {
  onOpenInbox?: (threadId?: string) => void;
};

function activeFilterCount(f: DiscoverFilters): number {
  let n = 0;
  if (f.origin?.trim()) n++;
  if (f.destination?.trim()) n++;
  if (f.date) n++;
  if (f.departFrom && f.date) n++;
  if (f.departTo && f.date) n++;
  if (f.minSeats > 1) n++;
  if (f.maxPrice != null) n++;
  if (f.verified) n++;
  return n;
}

export default function DiscoverPage({ onOpenInbox: _onOpenInbox }: DiscoverPageProps) {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotifications();
  const [tab, setTab] = useState<DiscoverTab>("explore");
  const [openFilters, setOpenFilters] = useState(false);
  const [filters, setFilters] = useState<DiscoverFilters>(defaultFilters);

  // Boleias da API
  const [apiRides, setApiRides] = useState<ApiRide[]>([]);
  const [apiRidesLoading, setApiRidesLoading] = useState(false);

  // Request seat
  const [selectedRideId, setSelectedRideId] = useState<string | null>(null);
  const [openRequestSeat, setOpenRequestSeat] = useState(false);

  // Detail sheet
  const [detailRide, setDetailRide] = useState<ApiRide | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);

  // Report sheet
  const [openReport, setOpenReport] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ id: string; name: string } | null>(null);

  // Public profile sheet
  const [openProfile, setOpenProfile] = useState(false);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  // Política de passageiro
  const [openPassengerPolicy, setOpenPassengerPolicy] = useState(false);
  const [pendingBookingRideId, setPendingBookingRideId] = useState<string | null>(null);

  // "Para Ti" — boleias que batem com os templates/rotas do utilizador
  const [forYouRides, setForYouRides]   = useState<ApiRide[]>([]);
  const [forYouLoading, setForYouLoading] = useState(false);
  const [forYouLoaded, setForYouLoaded]   = useState(false);

  // Rotas habituais do passageiro
  type UserRoute = { id: string; origin: string; destination: string; departTime: string; daysOfWeek: string[] };
  const [userRoutes, setUserRoutes]         = useState<UserRoute[]>([]);
  const [routesLoaded, setRoutesLoaded]     = useState(false);
  const [openSaveRoute, setOpenSaveRoute]   = useState(false);

  // Pedidos de boleia do passageiro
  type RideRequest = { id: string; origin: string; destination: string; departTime: string; daysOfWeek: string[]; note?: string; expiresAt: string; status: string };
  const [rideRequests, setRideRequests]         = useState<RideRequest[]>([]);
  const [requestsLoaded, setRequestsLoaded]     = useState(false);
  const [openRideRequest, setOpenRideRequest]   = useState(false);

  // Comunidades do utilizador (para filtro rápido)
  type CommunityChip = { id: string; name: string };
  const [userCommunities, setUserCommunities] = useState<CommunityChip[]>([]);
  const [communitiesLoaded, setCommunitiesLoaded] = useState(false);

  // Reservas recorrentes ativas (scheduleTemplateIds subscritos)
  const [myRecurringTemplateIds, setMyRecurringTemplateIds] = useState<Set<string>>(new Set());

  // Colapsável "As minhas configurações"
  const [showMyConfig, setShowMyConfig] = useState(false);

  // "Disponível agora" — boleias nas próximas 2h
  const [nowRides, setNowRides] = useState<ApiRide[]>([]);
  const [nowLoading, setNowLoading] = useState(false);

  // Arranjos recorrentes (para propor após boleia concluída)
  type Arrangement = { id: string; status: string; proposedById: string; note?: string; scheduleTemplate: { id: string; origin: string; destination: string; time: string; daysOfWeek: string[] } | null; otherUser: { id: string; name: string; avatarUrl?: string | null } | null };
  const [arrangements, setArrangements] = useState<{ asDriver: Arrangement[]; asPassenger: Arrangement[] }>({ asDriver: [], asPassenger: [] });
  const [arrangementsLoaded, setArrangementsLoaded] = useState(false);

  // Abrir sheet de rota habitual quando o utilizador vai para "Para ti" sem rotas
  useEffect(() => {
    if (tab !== "for-you") return;
    if (!routesLoaded) return; // aguardar carregamento
    if (userRoutes.length === 0) {
      setOpenSaveRoute(true);
    }
  }, [tab, routesLoaded, userRoutes.length]);

  // Carregar rotas habituais + boleias sugeridas + pedidos proativamente ao montar
  useEffect(() => {
    if (!routesLoaded) {
      apiRequest<UserRoute[]>("/user-routes")
        .then((data) => { setUserRoutes(Array.isArray(data) ? data : []); setRoutesLoaded(true); })
        .catch(() => setRoutesLoaded(true));
    }
    if (!forYouLoaded) {
      setForYouLoading(true);
      apiRequest<ApiRide[]>("/rides/for-you")
        .then((data) => { setForYouRides(Array.isArray(data) ? data : []); setForYouLoaded(true); })
        .catch(() => setForYouRides([]))
        .finally(() => setForYouLoading(false));
    }
    if (!requestsLoaded) {
      apiRequest<RideRequest[]>("/ride-requests")
        .then((data) => { setRideRequests(Array.isArray(data) ? data : []); setRequestsLoaded(true); })
        .catch(() => setRequestsLoaded(true));
    }
    if (!communitiesLoaded) {
      apiRequest<CommunityChip[]>("/communities/mine")
        .then((data) => { setUserCommunities(Array.isArray(data) ? data : []); setCommunitiesLoaded(true); })
        .catch(() => setCommunitiesLoaded(true));
    }
    // Carregar reservas recorrentes ativas
    apiRequest<{ id: string; scheduleTemplate: { id: string } | null; status: string }[]>("/recurring-bookings/mine")
      .then((data) => {
        const ids = new Set(
          (Array.isArray(data) ? data : [])
            .filter((rb) => rb.status === "ACTIVE" && rb.scheduleTemplate)
            .map((rb) => rb.scheduleTemplate!.id)
        );
        setMyRecurringTemplateIds(ids);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleRouteDeleted(id: string) {
    setUserRoutes((prev) => prev.filter((r) => r.id !== id));
    setForYouLoaded(false); // forçar reload das sugestões
  }

  function handleRouteSaved() {
    setRoutesLoaded(false);
    setForYouLoaded(false);
    setOpenSaveRoute(false);
  }

  function handleRequestSaved() {
    setRequestsLoaded(false);
    setOpenRideRequest(false);
    // reload
    apiRequest<RideRequest[]>("/ride-requests")
      .then((data) => { setRideRequests(Array.isArray(data) ? data : []); setRequestsLoaded(true); })
      .catch(() => setRequestsLoaded(true));
  }

  async function handleDeleteRequest(id: string) {
    try {
      await apiRequest(`/ride-requests/${id}`, { method: "DELETE" });
      setRideRequests((prev) => prev.filter((r) => r.id !== id));
    } catch { /* ignore */ }
  }

  // Helper — converte os filtros em query params para o backend
  function buildSearchParams(f: typeof filters): URLSearchParams {
    const params = new URLSearchParams();
    if (f.origin?.trim()) params.set("origin", f.origin.trim());
    if (f.destination?.trim()) params.set("destination", f.destination.trim());
    if (f.minSeats > 1) params.set("minSeats", String(f.minSeats));
    if (f.maxPrice != null) params.set("maxPrice", String(f.maxPrice));
    if (f.communityId) params.set("communityId", f.communityId);
    if (f.date) {
      const from = f.departFrom ? `${f.date}T${f.departFrom}:00` : `${f.date}T00:00:00`;
      const to   = f.departTo   ? `${f.date}T${f.departTo}:59`   : `${f.date}T23:59:59`;
      params.set("departureTimeFrom", new Date(from).toISOString());
      params.set("departureTimeTo",   new Date(to).toISOString());
    }
    return params;
  }

  // Carregar boleias disponíveis agora ao mudar para tab "now"
  useEffect(() => {
    if (tab !== "now") return;
    setNowLoading(true);
    apiRequest<ApiRide[]>("/rides/available-now")
      .then((data) => setNowRides(Array.isArray(data) ? data : []))
      .catch(() => setNowRides([]))
      .finally(() => setNowLoading(false));
  }, [tab]);

  // Carregar arranjos recorrentes (uma vez, quando o user está logado)
  useEffect(() => {
    if (!user || arrangementsLoaded) return;
    apiRequest<{ asDriver: Arrangement[]; asPassenger: Arrangement[] }>("/recurring-arrangements/mine")
      .then((data) => { setArrangements(data); setArrangementsLoaded(true); })
      .catch(() => setArrangementsLoaded(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Carregar boleias ao mudar filtros (só no tab explore)
  useEffect(() => {
    if (tab !== "explore") return;
    setApiRidesLoading(true);
    apiRequest<ApiRide[]>(`/rides/search?${buildSearchParams(filters).toString()}`)
      .then((data) => setApiRides(Array.isArray(data) ? data : []))
      .catch(() => setApiRides([]))
      .finally(() => setApiRidesLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, filters.origin, filters.destination, filters.minSeats, filters.maxPrice, filters.date, filters.departFrom, filters.departTo, filters.communityId]);

  // Abrir detalhe
  async function openRideDetail(rideId: string) {
    setDetailRide(null);
    setDetailLoading(true);
    setOpenDetail(true);
    try {
      const data = await apiRequest<ApiRide>(`/rides/${rideId}`);
      setDetailRide(data);
    } catch {
      setDetailRide(null);
    } finally {
      setDetailLoading(false);
    }
  }

  // Confirmar reserva
  async function doBook(rideId: string, opts?: { message?: string; stripePaymentIntentId?: string }) {
    await apiRequest(`/bookings/rides/${rideId}`, {
      method: "POST",
      body: JSON.stringify({ seats: 1, ...opts }),
    });
    const ride = [...apiRides, ...forYouRides].find((r) => r.id === rideId);
    showSuccess(
      "Reserva feita!",
      ride ? `${ride.origin} → ${ride.destination}. O condutor irá confirmar em breve.` : "Reserva registada."
    );
    setOpenRequestSeat(false);
    setSelectedRideId(null);
    apiRequest<ApiRide[]>(`/rides/search?${buildSearchParams(filters).toString()}`)
      .then((data) => setApiRides(Array.isArray(data) ? data : []))
      .catch(() => {});
  }

  function handleOpenBooking(rideId: string) {
    if (!user) {
      showError(
        "Sessão necessária",
        "Inicia sessão ou cria uma conta para reservar boleias. Vai ao separador Perfil."
      );
      return;
    }
    if (!user?.verification?.email) {
      showError(
        "Email não confirmado",
        "Para reservar boleias precisas de confirmar o teu email. Vai ao teu Perfil → Verificações e segue as instruções."
      );
      return;
    }
    setSelectedRideId(rideId);
    setOpenRequestSeat(true);
  }

  async function handleToggleRecurring(ride: ApiRide) {
    if (!ride.scheduleTemplateId) return;
    const isSubscribed = myRecurringTemplateIds.has(ride.scheduleTemplateId);
    try {
      if (isSubscribed) {
        // encontrar o id da subscrição para cancelar
        const data = await apiRequest<{ id: string; scheduleTemplate: { id: string } | null }[]>("/recurring-bookings/mine");
        const rb = data.find((r) => r.scheduleTemplate?.id === ride.scheduleTemplateId);
        if (rb) {
          await apiRequest(`/recurring-bookings/${rb.id}`, { method: "DELETE" });
          setMyRecurringTemplateIds((prev) => { const next = new Set(prev); next.delete(ride.scheduleTemplateId!); return next; });
          showSuccess("Subscrição cancelada", `Não farás mais reservas automáticas para ${ride.origin} → ${ride.destination}.`);
        }
      } else {
        await apiRequest("/recurring-bookings", {
          method: "POST",
          body: JSON.stringify({ scheduleTemplateId: ride.scheduleTemplateId, seats: 1 }),
        });
        setMyRecurringTemplateIds((prev) => new Set([...prev, ride.scheduleTemplateId!]));
        showSuccess("Reserva recorrente ativada!", `Serás reservado automaticamente sempre que ${ride.origin} → ${ride.destination} for publicada.`);
      }
    } catch (err: any) {
      showError("Erro", err instanceof Error ? err.message : "Tenta novamente.");
    }
  }

  async function handleConfirmBook(opts?: { message?: string; stripePaymentIntentId?: string }) {
    if (!selectedRideId) return;
    try {
      await doBook(selectedRideId, opts);
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      if (msg.includes("PASSENGER_POLICY_NOT_ACCEPTED")) {
        setPendingBookingRideId(selectedRideId);
        setOpenRequestSeat(false);
        setOpenPassengerPolicy(true);
        return;
      }
      if (msg.toLowerCase().includes("verific") && msg.toLowerCase().includes("email")) {
        showError("Email não confirmado", "Confirma o teu email no Perfil → Verificações antes de reservar.");
        return;
      }
      showError("Erro ao reservar", err instanceof Error ? err.message : "Tenta novamente.");
    }
  }

  // Chips de filtros activos (para mostrar na UI)
  const filterChips: { label: string; clear: () => void }[] = [];
  if (filters.origin?.trim()) filterChips.push({ label: `De: ${filters.origin.trim()}`, clear: () => setFilters(f => ({ ...f, origin: "" })) });
  if (filters.destination?.trim()) filterChips.push({ label: `Para: ${filters.destination.trim()}`, clear: () => setFilters(f => ({ ...f, destination: "" })) });
  if (filters.date) filterChips.push({ label: new Date(filters.date + "T12:00:00").toLocaleDateString("pt-PT", { day: "numeric", month: "short" }), clear: () => setFilters(f => ({ ...f, date: "", departFrom: "", departTo: "" })) });
  if (filters.departFrom && filters.date) filterChips.push({ label: `≥ ${filters.departFrom}`, clear: () => setFilters(f => ({ ...f, departFrom: "" })) });
  if (filters.departTo && filters.date) filterChips.push({ label: `≤ ${filters.departTo}`, clear: () => setFilters(f => ({ ...f, departTo: "" })) });
  if (filters.minSeats > 1) filterChips.push({ label: `${filters.minSeats}+ lugares`, clear: () => setFilters(f => ({ ...f, minSeats: 1 })) });
  if (filters.maxPrice != null) filterChips.push({ label: `≤ €${filters.maxPrice}`, clear: () => setFilters(f => ({ ...f, maxPrice: undefined })) });
  if (filters.verified) filterChips.push({ label: "Verificados", clear: () => setFilters(f => ({ ...f, verified: false })) });
  if (filters.communityId && filters.communityName) filterChips.push({ label: `Comunidade: ${filters.communityName}`, clear: () => setFilters(f => ({ ...f, communityId: undefined, communityName: undefined })) });

  return (
    <>
      <DiscoverTopBar active={tab} onChange={setTab} onFilter={() => setOpenFilters(true)} filterCount={activeFilterCount(filters)} />

      <main className="relative min-h-screen pb-32 bg-white text-gray-900">
        <BackgroundGlow />
        <div className="relative z-10 px-4">
          <div className="mx-auto max-w-mobile md:max-w-tablet lg:max-w-desktop">

            {/* Explore */}
            {tab === "explore" && (
              <>
                {/* Chips de filtros activos */}
                {filterChips.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto scrollbar-none py-2 -mx-4 px-4">
                    {filterChips.map((chip) => (
                      <button
                        key={chip.label}
                        onClick={chip.clear}
                        className="shrink-0 inline-flex items-center gap-1 bg-gray-900 text-white text-xs font-semibold px-3 py-1.5 rounded-full"
                      >
                        {chip.label}
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                      </button>
                    ))}
                  </div>
                )}
                {/* Chips de comunidade */}
                {userCommunities.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto scrollbar-none py-1 -mx-4 px-4">
                    {userCommunities.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setFilters(f => f.communityId === c.id
                          ? { ...f, communityId: undefined, communityName: undefined }
                          : { ...f, communityId: c.id, communityName: c.name }
                        )}
                        className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                          filters.communityId === c.id
                            ? "bg-gray-900 text-white border-gray-900"
                            : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
                <h2 className="text-sm font-bold text-gray-800 mt-3 mb-2">
                  Boleias disponíveis
                  {apiRides.length > 0 && ` (${apiRides.filter(r => !filters.verified || r.driver?.isIdentityVerified).filter(r => r.driverId !== user?.id).length})`}
                </h2>
                {apiRidesLoading ? (
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, i) => <EntityCardSkeleton key={i} />)}
                  </div>
                ) : apiRides.filter((r) => r.driverId !== user?.id && (!filters.verified || r.driver?.isIdentityVerified)).length === 0 ? (
                  <div className="text-center py-16 px-4">
                    <p className="text-xl font-bold text-gray-900 mb-2">Sem boleias disponíveis</p>
                    <p className="text-sm text-gray-600 max-w-[280px] mx-auto">
                      Tenta ajustar os filtros ou sê o primeiro a criar uma boleia.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {apiRides
                      .filter((ride) => ride.driverId !== user?.id && (!filters.verified || ride.driver?.isIdentityVerified))
                      .map((ride) => {
                        const dep = new Date(ride.departureTime);
                        const dateStr = dep.toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" });
                        const timeStr = dep.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
                        const driverName = ride.driver?.profile?.name ?? ride.driver?.email ?? "Condutor";
                        const seatsLeft = ride.remainingSeats;
                        const minsUntil = Math.round((dep.getTime() - Date.now()) / 60_000);
                        const isImminente = minsUntil >= 0 && minsUntil <= 120;
                        const imminentLabel = minsUntil < 60
                          ? `Parte em ${minsUntil} min`
                          : `Parte em ${Math.round(minsUntil / 60)}h`;
                        return (
                          <EntityCard
                            key={ride.id}
                            title={`${ride.origin} → ${ride.destination}`}
                            subtitle={`${dateStr}, ${timeStr}`}
                            meta={`Condutor: ${driverName}`}
                            badges={[
                              ...(isImminente
                                ? [{ label: imminentLabel, tone: "brand" as const }]
                                : []),
                              {
                                label: `${seatsLeft} lugar${seatsLeft !== 1 ? "es" : ""}`,
                                tone: seatsLeft >= 3 ? "success" : "warning",
                              },
                              ...(ride.instantBooking
                                ? [{ label: "Instantânea", tone: "success" as const }]
                                : []),
                              ...(ride.driver?.isIdentityVerified
                                ? [{ label: "Verificado", tone: "success" as const }]
                                : []),
                              ...(ride.price != null && ride.price > 0
                                ? [{ label: `€${ride.price.toFixed(0)}/lugar` }]
                                : []),
                            ]}
                            avatar={{
                              src: ride.driver?.profile?.avatarUrl ?? undefined,
                              initials: driverName.slice(0, 2).toUpperCase(),
                            }}
                            primaryLabel="Reservar"
                            secondaryLabel="Detalhes"
                            onPrimary={() => handleOpenBooking(ride.id)}
                            onSecondary={() => openRideDetail(ride.id)}
                          />
                        );
                      })}
                  </div>
                )}
              </>
            )}

            {/* Para Ti */}
            {tab === "for-you" && (
              <>
                {/* Secção colapsável: rotas + pedidos */}
                <div className="mb-4">
                  <button
                    type="button"
                    className="flex items-center justify-between w-full py-2"
                    onClick={() => setShowMyConfig(v => !v)}
                  >
                    <span className="text-sm font-semibold text-gray-800">As minhas configurações</span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      {userRoutes.length > 0 || rideRequests.length > 0
                        ? `${userRoutes.length} rota${userRoutes.length !== 1 ? "s" : ""} · ${rideRequests.length} pedido${rideRequests.length !== 1 ? "s" : ""}`
                        : "Configurar"}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        className={`transition-transform ${showMyConfig ? "rotate-180" : ""}`}>
                        <path d="M6 9l6 6 6-6"/>
                      </svg>
                    </span>
                  </button>

                  {showMyConfig && (
                    <div className="flex flex-col gap-4 mt-2">
                      {/* Rotas habituais */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Rotas habituais</h3>
                          <button type="button" className="text-xs text-gray-900 font-semibold" onClick={() => setOpenSaveRoute(true)}>+ Adicionar</button>
                        </div>
                        {userRoutes.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-gray-200 px-4 py-3 text-center">
                            <p className="text-xs text-gray-500">Nenhuma rota guardada</p>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {userRoutes.map((r) => (
                              <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{r.origin} - {r.destination}</p>
                                  <p className="text-xs text-gray-500">{r.departTime} · {(r.daysOfWeek as string[]).join(", ")}</p>
                                </div>
                                <button type="button" className="text-xs text-red-500 font-semibold ml-4 shrink-0"
                                  onClick={async () => { try { await apiRequest(`/user-routes/${r.id}`, { method: "DELETE" }); handleRouteDeleted(r.id); } catch { /* ignore */ } }}>
                                  Apagar
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Pedidos de boleia */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Pedidos ativos</h3>
                          <button type="button" className="text-xs text-gray-900 font-semibold" onClick={() => setOpenRideRequest(true)}>+ Publicar</button>
                        </div>
                        {rideRequests.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-gray-200 px-4 py-3 text-center">
                            <p className="text-xs text-gray-500">Nenhum pedido ativo</p>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {rideRequests.map((r) => (
                              <div key={r.id} className="flex items-start justify-between bg-gray-50 rounded-xl px-4 py-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">{r.origin} - {r.destination}</p>
                                  <p className="text-xs text-gray-500">{r.departTime} · {(r.daysOfWeek as string[]).join(", ")}</p>
                                  {r.note && <p className="text-xs text-gray-400 mt-0.5 italic truncate">{r.note}</p>}
                                </div>
                                <button type="button" className="text-xs text-red-500 font-semibold ml-4 shrink-0 mt-0.5"
                                  onClick={() => handleDeleteRequest(r.id)}>
                                  Fechar
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {forYouLoading ? (
                  <div className="flex flex-col gap-6">
                    {["Para amanhã", "Esta semana"].map((label) => (
                      <div key={label}>
                        <div className="h-4 w-28 bg-gray-100 rounded mb-3 animate-pulse" />
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                          {Array.from({ length: 2 }).map((_, i) => <EntityCardSkeleton key={i} />)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : forYouRides.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <p className="text-xl font-bold text-gray-900 mb-2">Sem sugestões ainda</p>
                    <p className="text-sm text-gray-600 max-w-[300px] mx-auto mb-6">
                      Guarda a tua rota habitual e vemos boleias que batem certo com o teu horário.
                    </p>
                    <Button onClick={() => setOpenSaveRoute(true)}>Guardar rota habitual</Button>
                  </div>
                ) : (() => {
                  const tomorrow = forYouRides.filter((r) => r.section === "tomorrow");
                  const familiar = forYouRides.filter((r) => r.section === "familiar");
                  const thisWeek = forYouRides.filter((r) => r.section === "this_week");

                  function RideCard({ ride }: { ride: ApiRide }) {
                    const dep = new Date(ride.departureTime);
                    const dateStr = dep.toLocaleDateString("pt-PT", { weekday: "short", day: "numeric", month: "short" });
                    const timeStr = dep.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
                    const driverName = ride.driver?.profile?.name ?? ride.driver?.email ?? "Condutor";
                    const seatsLeft = ride.remainingSeats;
                    return (
                      <EntityCard
                        key={ride.id}
                        title={`${ride.origin} → ${ride.destination}`}
                        subtitle={`${dateStr}, ${timeStr} - ${driverName}`}
                        badges={[
                          { label: `${seatsLeft} lugar${seatsLeft !== 1 ? "es" : ""}`, tone: seatsLeft >= 3 ? "success" : "warning" },
                          ...(ride.sharedCommunity ? [{ label: ride.sharedCommunity.name, tone: "success" as const }] : []),
                          ...(ride.community && !ride.sharedCommunity ? [{ label: "Privada", tone: "neutral" as const }] : []),
                          ...(ride.overlapPct != null
                            ? [{ label: `${ride.overlapPct}% compativel`, tone: (ride.overlapPct >= 70 ? "success" : ride.overlapPct >= 40 ? "warning" : "neutral") as "success" | "warning" | "neutral" }]
                            : []),
                          ...(ride.instantBooking ? [{ label: "Instantanea", tone: "success" as const }] : []),
                          ...(ride.driver?.isIdentityVerified ? [{ label: "Verificado", tone: "success" as const }] : []),
                          ...(ride.price != null && ride.price > 0 ? [{ label: `€${ride.price.toFixed(0)}/lugar` }] : []),
                        ]}
                        avatar={{ src: ride.driver?.profile?.avatarUrl ?? undefined, initials: driverName.slice(0, 2).toUpperCase() }}
                        primaryLabel="Reservar"
                        secondaryLabel="Detalhes"
                        onPrimary={() => handleOpenBooking(ride.id)}
                        onSecondary={() => openRideDetail(ride.id)}
                        {...(ride.scheduleTemplateId && {
                          tertiaryLabel: myRecurringTemplateIds.has(ride.scheduleTemplateId)
                            ? "Cancelar reserva recorrente"
                            : "Reservar sempre (subscrever)",
                          onTertiary: () => handleToggleRecurring(ride),
                        })}
                      />
                    );
                  }

                  return (
                    <div className="flex flex-col gap-6">
                      {tomorrow.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-base">🌅</span>
                            <h2 className="text-sm font-bold text-gray-900">Para amanhã</h2>
                            <span className="text-xs text-gray-400 font-medium">{tomorrow.length} boleia{tomorrow.length !== 1 ? "s" : ""}</span>
                          </div>
                          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                            {tomorrow.map((ride) => <RideCard key={ride.id} ride={ride} />)}
                          </div>
                        </div>
                      )}

                      {familiar.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-base">🤝</span>
                            <h2 className="text-sm font-bold text-gray-900">Condutores habituais</h2>
                            <span className="text-xs text-gray-400 font-medium">já viajaste com eles</span>
                          </div>
                          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                            {familiar.map((ride) => <RideCard key={ride.id} ride={ride} />)}
                          </div>
                        </div>
                      )}

                      {thisWeek.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-base">📅</span>
                            <h2 className="text-sm font-bold text-gray-900">Esta semana</h2>
                            <span className="text-xs text-gray-400 font-medium">{thisWeek.length} boleia{thisWeek.length !== 1 ? "s" : ""}</span>
                          </div>
                          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                            {thisWeek.map((ride) => <RideCard key={ride.id} ride={ride} />)}
                          </div>
                        </div>
                      )}

                      {userRoutes.length === 0 && (
                        <button type="button" onClick={() => setOpenSaveRoute(true)} className="w-full rounded-2xl border-2 border-dashed border-gray-200 py-4 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 transition">
                          + Guardar rota habitual para sugestões mais precisas
                        </button>
                      )}
                    </div>
                  );
                })()}
              </>
            )}

            {/* Agora */}
            {tab === "now" && (
              <>
                <div className="flex items-center justify-between pt-2 pb-3">
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Disponível agora</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Boleias que partem nas próximas 2 horas</p>
                  </div>
                  <button
                    type="button"
                    className="text-xs font-semibold text-gray-500 hover:text-gray-800"
                    onClick={() => {
                      setNowLoading(true);
                      apiRequest<ApiRide[]>("/rides/available-now")
                        .then((data) => setNowRides(Array.isArray(data) ? data : []))
                        .catch(() => setNowRides([]))
                        .finally(() => setNowLoading(false));
                    }}
                  >
                    Atualizar
                  </button>
                </div>

                {/* Arranjos pendentes — aviso se o passageiro tem proposta por responder */}
                {arrangements.asPassenger.filter((a) => a.status === "PENDING").map((a) => (
                  <div key={a.id} className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-sm font-semibold text-amber-900 mb-1">Proposta de boleia recorrente</p>
                    <p className="text-xs text-amber-800 mb-3">
                      {a.otherUser?.name ?? "O condutor"} quer repetir regularmente {a.scheduleTemplate?.origin} - {a.scheduleTemplate?.destination} ({a.scheduleTemplate?.time}, {(a.scheduleTemplate?.daysOfWeek as string[])?.join(", ")}).
                      {a.note && ` "${a.note}"`}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="flex-1 rounded-xl bg-gray-900 text-white text-xs font-semibold py-2"
                        onClick={async () => {
                          await apiRequest(`/recurring-arrangements/${a.id}/respond`, { method: "PATCH", body: JSON.stringify({ accept: true }) });
                          setArrangementsLoaded(false);
                          setArrangements((prev) => ({
                            ...prev,
                            asPassenger: prev.asPassenger.map((x) => x.id === a.id ? { ...x, status: "ACTIVE" } : x),
                          }));
                          showSuccess("Arranjo aceite!", "Serás reservado automaticamente nas próximas boleias deste condutor.");
                        }}
                      >
                        Aceitar
                      </button>
                      <button
                        type="button"
                        className="flex-1 rounded-xl border border-gray-200 text-gray-700 text-xs font-semibold py-2"
                        onClick={async () => {
                          await apiRequest(`/recurring-arrangements/${a.id}/respond`, { method: "PATCH", body: JSON.stringify({ accept: false }) });
                          setArrangements((prev) => ({
                            ...prev,
                            asPassenger: prev.asPassenger.filter((x) => x.id !== a.id),
                          }));
                        }}
                      >
                        Recusar
                      </button>
                    </div>
                  </div>
                ))}

                {nowLoading ? (
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {Array.from({ length: 3 }).map((_, i) => <EntityCardSkeleton key={i} />)}
                  </div>
                ) : nowRides.filter((r) => r.driverId !== user?.id).length === 0 ? (
                  <div className="text-center py-16 px-4">
                    <p className="text-5xl mb-4">🕐</p>
                    <p className="text-xl font-bold text-gray-900 mb-2">Nenhuma boleia nas próximas 2h</p>
                    <p className="text-sm text-gray-600 max-w-[280px] mx-auto">
                      Tenta mais tarde ou vê as boleias disponíveis na tab Explorar.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {nowRides
                      .filter((ride) => ride.driverId !== user?.id)
                      .map((ride) => {
                        const dep = new Date(ride.departureTime);
                        const minsUntil = Math.max(0, Math.round((dep.getTime() - Date.now()) / 60_000));
                        const timeLabel = minsUntil < 60
                          ? `Parte em ${minsUntil} min`
                          : `Parte em ${Math.round(minsUntil / 60)}h`;
                        const driverName = ride.driver?.profile?.name ?? ride.driver?.email ?? "Condutor";
                        const seatsLeft = ride.remainingSeats;
                        return (
                          <EntityCard
                            key={ride.id}
                            title={`${ride.origin} → ${ride.destination}`}
                            subtitle={`${dep.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })} - ${driverName}`}
                            badges={[
                              { label: timeLabel, tone: minsUntil < 30 ? "brand" : "warning" },
                              { label: `${seatsLeft} lugar${seatsLeft !== 1 ? "es" : ""}`, tone: seatsLeft >= 3 ? "success" : "warning" },
                              ...(ride.instantBooking ? [{ label: "Instantânea", tone: "success" as const }] : []),
                              ...(ride.price != null && ride.price > 0 ? [{ label: `€${ride.price.toFixed(0)}/lugar` }] : []),
                            ]}
                            avatar={{ src: ride.driver?.profile?.avatarUrl ?? undefined, initials: driverName.slice(0, 2).toUpperCase() }}
                            primaryLabel="Reservar"
                            secondaryLabel="Detalhes"
                            onPrimary={() => handleOpenBooking(ride.id)}
                            onSecondary={() => openRideDetail(ride.id)}
                          />
                        );
                      })}
                  </div>
                )}
              </>
            )}

          </div>
        </div>
      </main>

      <DiscoverFiltersSheet
        open={openFilters}
        initial={filters}
        onClose={() => setOpenFilters(false)}
        onApply={(next) => { setFilters(next); setOpenFilters(false); }}
      />

      {selectedRideId && (() => {
        const ride = [...apiRides, ...forYouRides].find((r) => r.id === selectedRideId);
        const dep = ride ? new Date(ride.departureTime) : null;
        const t = dep ? dep.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }) : "";
        return (
          <RequestSeatSheet
            open={openRequestSeat}
            onClose={() => { setOpenRequestSeat(false); setSelectedRideId(null); }}
            onConfirm={handleConfirmBook}
            offerTitle={ride ? `${ride.origin} → ${ride.destination} (${t})` : ""}
            rideId={selectedRideId}
            price={ride?.price}
            platformFee={(ride as any)?.platformFee}
            seats={1}
            meetingPoint={ride?.meetingPoint}
          />
        );
      })()}

      {reportTarget && (
        <ReportSheet
          open={openReport}
          onClose={() => { setOpenReport(false); setReportTarget(null); }}
          targetId={reportTarget.id}
          targetName={reportTarget.name}
        />
      )}

      {/* Política de passageiro — aparece quando tenta reservar sem aceitar */}
      <PolicyAcceptanceSheet
        open={openPassengerPolicy}
        role="passenger"
        onClose={() => { setOpenPassengerPolicy(false); setPendingBookingRideId(null); }}
        onAccepted={async () => {
          setOpenPassengerPolicy(false);
          if (pendingBookingRideId) {
            try {
              await doBook(pendingBookingRideId);
            } catch (err) {
              showError("Erro ao reservar", err instanceof Error ? err.message : "Tenta novamente.");
            } finally {
              setPendingBookingRideId(null);
            }
          }
        }}
      />

      <PublicProfileSheet
        userId={profileUserId}
        open={openProfile}
        onClose={() => { setOpenProfile(false); setProfileUserId(null); }}
        zIndex={110}
      />

      <SaveRouteSheet
        open={openSaveRoute}
        onClose={() => setOpenSaveRoute(false)}
        onSaved={handleRouteSaved}
      />

      <RideRequestSheet
        open={openRideRequest}
        onClose={() => setOpenRideRequest(false)}
        onSaved={handleRequestSaved}
      />

      {/* Detail sheet */}
      <Sheet
        open={openDetail}
        onClose={() => { setOpenDetail(false); setDetailRide(null); }}
        title="Detalhes da boleia"
        height="lg"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setOpenDetail(false)}>
              Fechar
            </Button>
            {detailRide && detailRide.driverId !== user?.id && detailRide.remainingSeats > 0 && (
              <Button
                className="flex-1"
                onClick={() => {
                  setOpenDetail(false);
                  handleOpenBooking(detailRide.id);
                }}
              >
                Reservar lugar
              </Button>
            )}
          </div>
        }
      >
        {detailLoading && <p className="text-sm text-gray-500 py-8 text-center">A carregar...</p>}
        {!detailLoading && detailRide && (() => {
          const dep = new Date(detailRide.departureTime);
          const dateStr = dep.toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" });
          const timeStr = dep.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
          const driverName = detailRide.driver?.profile?.name ?? detailRide.driver?.email ?? "Condutor";
          const oLng = detailRide.originLocation?.lng;
          const oLat = detailRide.originLocation?.lat;
          const dLng = detailRide.destinationLocation?.lng;
          const dLat = detailRide.destinationLocation?.lat;
          const hasMap = !!(MAPBOX_TOKEN && oLat && oLng && dLat && dLng);

          return (
            <div>
              {/* Mapa no topo */}
              {hasMap ? (
                <div className="-mx-5 -mt-2 mb-6 relative">
                  <img
                    src={`https://api.mapbox.com/styles/v1/mapbox/light-v11/static/pin-s+111111(${oLng},${oLat}),pin-s+888888(${dLng},${dLat})/auto/600x200@2x?padding=60,30,30,30&access_token=${MAPBOX_TOKEN}`}
                    alt="Mapa da rota"
                    className="w-full h-44 object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white/70 to-transparent px-5 pb-3 pt-6">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center shrink-0">
                        <div className="w-2.5 h-2.5 rounded-full bg-gray-900" />
                        <div className="route-dotted-line my-1" style={{ height: 18 }} />
                        <div className="w-2.5 h-2.5 rounded-full border-2 border-gray-500 bg-white" />
                      </div>
                      <div className="flex flex-col gap-1.5 min-w-0">
                        <p className="font-headline font-bold text-gray-900 text-sm truncate">{detailRide.origin}</p>
                        <p className="font-headline font-bold text-gray-900 text-sm truncate">{detailRide.destination}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-2xl p-4 mb-5">
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center pt-1 shrink-0">
                      <div className="w-2.5 h-2.5 rounded-full bg-gray-900" />
                      <div className="route-dotted-line my-1" style={{ minHeight: 28 }} />
                      <div className="w-2.5 h-2.5 rounded-full border-2 border-gray-400 bg-white" />
                    </div>
                    <div className="flex flex-col justify-between gap-3 min-w-0">
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Origem</p>
                        <p className="font-headline font-semibold text-gray-900 text-sm">{detailRide.origin}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Destino</p>
                        <p className="font-headline font-semibold text-gray-900 text-sm">{detailRide.destination}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Condutor */}
              {detailRide.driver && (
                <div className="flex items-center justify-between mb-5">
                  <button
                    className="flex items-center gap-3 hover:opacity-80 transition text-left"
                    onClick={() => { setProfileUserId(detailRide.driverId); setOpenProfile(true); }}
                  >
                    {detailRide.driver.profile?.avatarUrl ? (
                      <img src={detailRide.driver.profile.avatarUrl} alt="" className="w-16 h-16 rounded-full object-cover ring-2 ring-gray-100" />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-900 text-white flex items-center justify-center text-lg font-bold shrink-0">
                        {driverName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="font-headline font-bold text-gray-900 text-lg leading-tight">{driverName}</p>
                        {detailRide.driver.isIdentityVerified && (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-700 shrink-0">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">Ver perfil →</p>
                    </div>
                  </button>
                  {detailRide.driverId !== user?.id && (
                    <button
                      className="w-11 h-11 rounded-2xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition shrink-0"
                      aria-label="Mensagem"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                      </svg>
                    </button>
                  )}
                </div>
              )}

              {/* Grid de info */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-gray-50 rounded-2xl p-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Partida</p>
                  <p className="font-headline font-bold text-gray-900 text-base">{timeStr}</p>
                  <p className="text-xs text-gray-500 mt-0.5 capitalize">{dateStr}</p>
                </div>
                {detailRide.vehicle && (
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Veículo</p>
                    <p className="font-headline font-bold text-gray-900 text-base leading-tight">
                      {detailRide.vehicle.brand} {detailRide.vehicle.model}
                    </p>
                    {detailRide.vehicle.color && (
                      <p className="text-xs text-gray-500 mt-0.5">{detailRide.vehicle.color}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Preço + lugares */}
              {detailRide.price != null && detailRide.price > 0 && (
                <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-4 mb-5">
                  <div>
                    <p className="text-xs text-gray-500">Preço por lugar</p>
                    <p className="font-headline font-extrabold text-gray-900 text-2xl">€{detailRide.price.toFixed(2)}</p>
                  </div>
                  <div className="bg-white rounded-xl px-3 py-2 border border-gray-200 text-center">
                    <p className="font-bold text-gray-900 text-sm">{detailRide.bookedSeats}/{detailRide.availableSeats}</p>
                    <p className="text-[10px] text-gray-400">lugares</p>
                  </div>
                </div>
              )}

              {/* Denunciar */}
              {detailRide.driverId !== user?.id && (
                <button
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                  onClick={() => {
                    const name = detailRide.driver?.profile?.name ?? detailRide.driver?.email ?? "Condutor";
                    setReportTarget({ id: detailRide.driverId, name });
                    setOpenDetail(false);
                    setOpenReport(true);
                  }}
                >
                  Denunciar condutor
                </button>
              )}
            </div>
          );
        })()}
      </Sheet>
    </>
  );
}
