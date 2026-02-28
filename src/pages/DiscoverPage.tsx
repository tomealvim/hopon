import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";
import { apiRequest } from "../services/api";
import DiscoverTopBar, { type DiscoverTab } from "../components/ui/DiscoverTopBar";
import DiscoverFiltersSheet from "../components/ui/DiscoverFiltersSheet";
import RequestSeatSheet from "../components/ui/RequestSeatSheet";
import EntityCard from "../components/ui/EntityCard";
import { EntityCardSkeleton } from "../components/ui/Skeleton";
import Sheet from "../components/ui/Sheet";
import { Button } from "../components/ui/Button";
import BackgroundGlow from "../components/ui/BackgroundGlow";

import type { DiscoverFilters } from "./types/discover";
import { defaultFilters } from "./types/discover";
import type { ApiRide } from "./types/ride-api";

type DiscoverPageProps = {
  onOpenInbox?: (threadId?: string) => void;
};

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

  // "Para Ti" — boleias que batem com os templates do utilizador
  const [forYouRides, setForYouRides] = useState<ApiRide[]>([]);
  const [forYouLoading, setForYouLoading] = useState(false);
  const [forYouLoaded, setForYouLoaded] = useState(false);

  useEffect(() => {
    if (tab !== "for-you" || forYouLoaded) return;
    setForYouLoading(true);
    apiRequest<ApiRide[]>("/rides/for-you")
      .then((data) => { setForYouRides(Array.isArray(data) ? data : []); setForYouLoaded(true); })
      .catch(() => setForYouRides([]))
      .finally(() => setForYouLoading(false));
  }, [tab, forYouLoaded]);

  // Carregar boleias ao mudar filtros (só no tab explore)
  useEffect(() => {
    if (tab !== "explore") return;
    const params = new URLSearchParams();
    if (filters.origin?.trim()) params.set("origin", filters.origin.trim());
    if (filters.destination?.trim()) params.set("destination", filters.destination.trim());
    if (filters.minSeats > 0) params.set("minSeats", String(filters.minSeats));
    setApiRidesLoading(true);
    apiRequest<ApiRide[]>(`/rides/search?${params.toString()}`)
      .then((data) => setApiRides(Array.isArray(data) ? data : []))
      .catch(() => setApiRides([]))
      .finally(() => setApiRidesLoading(false));
  }, [tab, filters.origin, filters.destination, filters.minSeats]);

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
  async function handleConfirmBook() {
    if (!selectedRideId) return;
    try {
      await apiRequest(`/bookings/rides/${selectedRideId}`, {
        method: "POST",
        body: JSON.stringify({ seats: 1 }),
      });
      const ride = apiRides.find((r) => r.id === selectedRideId);
      showSuccess(
        "Reserva feita!",
        ride ? `${ride.origin} → ${ride.destination}. O condutor irá confirmar em breve.` : "Reserva registada."
      );
      setOpenRequestSeat(false);
      setSelectedRideId(null);
      // Refrescar lista para actualizar lugares disponíveis
      const params = new URLSearchParams();
      if (filters.origin?.trim()) params.set("origin", filters.origin.trim());
      if (filters.destination?.trim()) params.set("destination", filters.destination.trim());
      if (filters.minSeats > 0) params.set("minSeats", String(filters.minSeats));
      apiRequest<ApiRide[]>(`/rides/search?${params.toString()}`)
        .then((data) => setApiRides(Array.isArray(data) ? data : []))
        .catch(() => {});
    } catch (err) {
      showError("Erro ao reservar", err instanceof Error ? err.message : "Tenta novamente.");
    }
  }

  return (
    <>
      <DiscoverTopBar active={tab} onChange={setTab} onFilter={() => setOpenFilters(true)} />

      <main className="relative min-h-screen pb-32 bg-white text-gray-900">
        <BackgroundGlow />
        <div className="relative z-10 px-4">
          <div className="mx-auto max-w-mobile md:max-w-tablet lg:max-w-desktop">

            {/* Explore */}
            {tab === "explore" && (
              <>
                <h2 className="text-sm font-bold text-gray-800 mt-3 mb-2">
                  Boleias disponíveis
                  {apiRides.length > 0 && ` (${apiRides.length})`}
                </h2>
                {apiRidesLoading ? (
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, i) => <EntityCardSkeleton key={i} />)}
                  </div>
                ) : apiRides.length === 0 ? (
                  <div className="text-center py-16 px-4">
                    <p className="text-xl font-bold text-gray-900 mb-2">Sem boleias disponíveis</p>
                    <p className="text-sm text-gray-600 max-w-[280px] mx-auto">
                      Tenta ajustar os filtros ou sê o primeiro a criar uma boleia.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {apiRides
                      .filter((ride) => ride.driverId !== user?.id)
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
                            onPrimary={() => { setSelectedRideId(ride.id); setOpenRequestSeat(true); }}
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
                <h2 className="text-sm font-bold text-gray-800 mt-3 mb-2">
                  Para ti
                  {forYouRides.length > 0 && ` (${forYouRides.length})`}
                </h2>
                {forYouLoading ? (
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {Array.from({ length: 3 }).map((_, i) => <EntityCardSkeleton key={i} />)}
                  </div>
                ) : forYouRides.length === 0 ? (
                  <div className="text-center py-16 px-4">
                    <p className="text-xl font-bold text-gray-900 mb-2">Sem sugestões ainda</p>
                    <p className="text-sm text-gray-600 max-w-[300px] mx-auto">
                      Cria templates de viagem na aba <strong>Rides</strong> para veres aqui
                      as boleias que batem certo com o teu horário habitual.
                    </p>
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
                          onPrimary={() => { setSelectedRideId(ride.id); setOpenRequestSeat(true); }}
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
            price={ride?.price}
            seats={1}
          />
        );
      })()}

      {/* Detail sheet */}
      <Sheet
        open={openDetail}
        onClose={() => { setOpenDetail(false); setDetailRide(null); }}
        title="Detalhes da boleia"
        height="lg"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setOpenDetail(false)}>
              Fechar
            </Button>
            {detailRide && detailRide.driverId !== user?.id && detailRide.remainingSeats > 0 && (
              <Button
                className="flex-1"
                onClick={() => {
                  setOpenDetail(false);
                  setSelectedRideId(detailRide.id);
                  setOpenRequestSeat(true);
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
              <div className="flex items-start gap-2">
                <span className="text-lg">📍</span>
                <div>
                  <div className="text-xs text-gray-500">Origem</div>
                  <div className="font-semibold text-sm text-gray-900">{detailRide.origin}</div>
                </div>
              </div>
              <div className="h-px bg-gray-100" />
              <div className="flex items-start gap-2">
                <span className="text-lg">🎯</span>
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
                <div className="flex items-center gap-3">
                  {detailRide.driver.profile?.avatarUrl ? (
                    <img src={detailRide.driver.profile.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-700">
                      {(detailRide.driver.profile?.name ?? detailRide.driver.email ?? "?").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-sm text-gray-900">
                      {detailRide.driver.profile?.name ?? detailRide.driver.email}
                    </div>
                    {detailRide.driver.profile?.username && (
                      <div className="text-xs text-gray-500">@{detailRide.driver.profile.username}</div>
                    )}
                  </div>
                </div>
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
