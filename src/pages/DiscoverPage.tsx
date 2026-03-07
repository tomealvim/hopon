import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (tab !== "for-you") return;
    // Carregar rotas habituais
    if (!routesLoaded) {
      apiRequest<UserRoute[]>("/user-routes")
        .then((data) => { setUserRoutes(Array.isArray(data) ? data : []); setRoutesLoaded(true); })
        .catch(() => setRoutesLoaded(true));
    }
    // Carregar boleias sugeridas
    if (!forYouLoaded) {
      setForYouLoading(true);
      apiRequest<ApiRide[]>("/rides/for-you")
        .then((data) => { setForYouRides(Array.isArray(data) ? data : []); setForYouLoaded(true); })
        .catch(() => setForYouRides([]))
        .finally(() => setForYouLoading(false));
    }
  }, [tab, forYouLoaded, routesLoaded]);

  function handleRouteDeleted(id: string) {
    setUserRoutes((prev) => prev.filter((r) => r.id !== id));
    setForYouLoaded(false); // forçar reload das sugestões
  }

  function handleRouteSaved() {
    setRoutesLoaded(false);
    setForYouLoaded(false);
    setOpenSaveRoute(false);
  }

  // Helper — converte os filtros em query params para o backend
  function buildSearchParams(f: typeof filters): URLSearchParams {
    const params = new URLSearchParams();
    if (f.origin?.trim()) params.set("origin", f.origin.trim());
    if (f.destination?.trim()) params.set("destination", f.destination.trim());
    if (f.minSeats > 1) params.set("minSeats", String(f.minSeats));
    if (f.maxPrice != null) params.set("maxPrice", String(f.maxPrice));
    if (f.date) {
      const from = f.departFrom ? `${f.date}T${f.departFrom}:00` : `${f.date}T00:00:00`;
      const to   = f.departTo   ? `${f.date}T${f.departTo}:59`   : `${f.date}T23:59:59`;
      params.set("departureTimeFrom", new Date(from).toISOString());
      params.set("departureTimeTo",   new Date(to).toISOString());
    }
    return params;
  }

  // Carregar boleias ao mudar filtros (só no tab explore)
  useEffect(() => {
    if (tab !== "explore") return;
    setApiRidesLoading(true);
    apiRequest<ApiRide[]>(`/rides/search?${buildSearchParams(filters).toString()}`)
      .then((data) => setApiRides(Array.isArray(data) ? data : []))
      .catch(() => setApiRides([]))
      .finally(() => setApiRidesLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, filters.origin, filters.destination, filters.minSeats, filters.maxPrice, filters.date, filters.departFrom, filters.departTo]);

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
                        return (
                          <EntityCard
                            key={ride.id}
                            title={`${ride.origin} → ${ride.destination}`}
                            subtitle={`${dateStr}, ${timeStr}`}
                            meta={`Condutor: ${driverName}`}
                            badges={[
                              {
                                label: `${seatsLeft} lugar${seatsLeft !== 1 ? "es" : ""}`,
                                tone: seatsLeft >= 3 ? "success" : "warning",
                              },
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
                {/* Rotas habituais guardadas */}
                {userRoutes.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-sm font-bold text-gray-800">As tuas rotas</h2>
                      <button
                        type="button"
                        className="text-xs text-gray-900 font-semibold"
                        onClick={() => setOpenSaveRoute(true)}
                      >
                        + Adicionar
                      </button>
                    </div>
                    <div className="flex flex-col gap-2">
                      {userRoutes.map((r) => (
                        <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{r.origin} → {r.destination}</p>
                            <p className="text-xs text-gray-500">{r.departTime} · {(r.daysOfWeek as string[]).join(", ")}</p>
                          </div>
                          <button
                            type="button"
                            className="text-xs text-red-500 font-semibold ml-4 shrink-0"
                            onClick={async () => {
                              try {
                                await apiRequest(`/user-routes/${r.id}`, { method: "DELETE" });
                                handleRouteDeleted(r.id);
                              } catch { /* ignore */ }
                            }}
                          >
                            Apagar
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <h2 className="text-sm font-bold text-gray-800 mt-1 mb-2">
                  Boleias para ti
                  {forYouRides.length > 0 && ` (${forYouRides.length})`}
                </h2>
                {forYouLoading ? (
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {Array.from({ length: 3 }).map((_, i) => <EntityCardSkeleton key={i} />)}
                  </div>
                ) : forYouRides.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <p className="text-xl font-bold text-gray-900 mb-2">Sem sugestões ainda</p>
                    <p className="text-sm text-gray-600 max-w-[300px] mx-auto mb-6">
                      Guarda a tua rota habitual e vemos boleias que batem certo com o teu horário.
                    </p>
                    <Button onClick={() => setOpenSaveRoute(true)}>
                      Guardar rota habitual
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {forYouRides.map((ride) => {
                      const dep = new Date(ride.departureTime);
                      const dateStr = dep.toLocaleDateString("pt-PT", { weekday: "short", day: "numeric", month: "short" });
                      const timeStr = dep.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
                      const driverName = ride.driver?.profile?.name ?? ride.driver?.email ?? "Condutor";
                      const seatsLeft = ride.remainingSeats;
                      return (
                        <EntityCard
                          key={ride.id}
                          title={`${ride.origin} → ${ride.destination}`}
                          subtitle={`${dateStr}, ${timeStr}`}
                          meta={`Condutor: ${driverName}`}
                          badges={[
                            { label: "Para ti", tone: "brand" },
                            {
                              label: `${seatsLeft} lugar${seatsLeft !== 1 ? "es" : ""}`,
                              tone: seatsLeft >= 3 ? "success" : "warning",
                            },
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
      />

      <SaveRouteSheet
        open={openSaveRoute}
        onClose={() => setOpenSaveRoute(false)}
        onSaved={handleRouteSaved}
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
        {detailLoading && <p className="text-sm text-gray-600 p-4">A carregar...</p>}
        {!detailLoading && detailRide && (
          <div className="grid gap-4 p-1">
            <div className="grid gap-2 p-4 bg-gray-50 border border-gray-200 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 w-5 h-5 rounded-full bg-gray-900 flex-shrink-0 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
                <div>
                  <div className="text-xs text-gray-500">Origem</div>
                  <div className="font-semibold text-sm text-gray-900">{detailRide.origin}</div>
                </div>
              </div>
              <div className="ml-2.5 h-4 w-px bg-gray-300" />
              <div className="flex items-start gap-3">
                <div className="mt-0.5 w-5 h-5 rounded-full border-2 border-gray-900 flex-shrink-0" />
                <div>
                  <div className="text-xs text-gray-500">Destino</div>
                  <div className="font-semibold text-sm text-gray-900">{detailRide.destination}</div>
                </div>
              </div>
            </div>
            <div className="grid gap-2 p-4 bg-gray-50 border border-gray-200 rounded-xl">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Partida</span>
                <span className="font-semibold text-gray-900">
                  {new Date(detailRide.departureTime).toLocaleString("pt-PT", {
                    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Lugares disponíveis</span>
                <span className="font-semibold text-gray-900">{detailRide.remainingSeats}</span>
              </div>
              {detailRide.price != null && detailRide.price > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Preço / lugar</span>
                  <span className="font-semibold text-gray-900">€{detailRide.price.toFixed(2)}</span>
                </div>
              )}
            </div>
            {detailRide.driver && (
              <div className="grid gap-2 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Condutor</div>
                <button
                  className="flex items-center gap-3 hover:opacity-80 transition text-left w-full"
                  onClick={() => { setProfileUserId(detailRide.driverId); setOpenProfile(true); }}
                >
                  {detailRide.driver.profile?.avatarUrl ? (
                    <img src={detailRide.driver.profile.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-700">
                      {(detailRide.driver.profile?.name ?? detailRide.driver.email ?? "?").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-sm text-gray-900">
                        {detailRide.driver.profile?.name ?? detailRide.driver.email}
                      </div>
                      {detailRide.driver.isIdentityVerified && (
                        <span className="text-xs bg-green-100 text-green-700 border border-green-200 rounded-full px-2 py-0.5">
                          Verificado
                        </span>
                      )}
                    </div>
                    {detailRide.driver.profile?.username && (
                      <div className="text-xs text-gray-500">@{detailRide.driver.profile.username}</div>
                    )}
                    <div className="text-[10px] text-gray-500 mt-0.5">Ver perfil →</div>
                  </div>
                </button>
                {detailRide.driverId !== user?.id && (
                  <button
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors text-left mt-1"
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
            )}
            {detailRide.vehicle && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Veículo</div>
                <div className="font-semibold text-sm text-gray-900">
                  {detailRide.vehicle.brand} {detailRide.vehicle.model}
                  {detailRide.vehicle.color ? ` · ${detailRide.vehicle.color}` : ""}
                </div>
                <div className="text-xs text-gray-500">{detailRide.vehicle.seats} lugares</div>
              </div>
            )}
          </div>
        )}
      </Sheet>
    </>
  );
}
