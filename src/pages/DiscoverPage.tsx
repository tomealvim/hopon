import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useRides, type RideOffer, type RideRequest } from "../contexts/RidesContext";
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

export default function DiscoverPage({ onOpenInbox }: DiscoverPageProps) {
  const { user } = useAuth();
  const { 
    getAvailableOffers, 
    getAvailableRequests,
    getMyRequests, 
    getMyOffers,
    getRequestsForOffer,
    requestSeatOnOffer,
    invitePassenger,
    requests
  } = useRides();
  const { showSuccess, showError } = useNotifications();
  const [tab, setTab] = useState<DiscoverTab>("explore");
  const [openSheet, setOpenSheet] = useState(false);
  const [filters, setFilters] = useState<DiscoverFilters>(defaultFilters);
  const [openRequestSeat, setOpenRequestSeat] = useState(false);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [selectedRideForDetails, setSelectedRideForDetails] = useState<RideOffer | RideRequest | null>(null);
  const [openDetailsSheet, setOpenDetailsSheet] = useState(false);
  const [hydrating, setHydrating] = useState(true);

  // Boleias da API (backend) – com condutor
  const [apiRides, setApiRides] = useState<ApiRide[]>([]);
  const [apiRidesLoading, setApiRidesLoading] = useState(false);
  const [selectedApiRideId, setSelectedApiRideId] = useState<string | null>(null);
  const [selectedApiRideForDetail, setSelectedApiRideForDetail] = useState<string | null>(null);
  const [apiRideDetail, setApiRideDetail] = useState<ApiRide | null>(null);
  const [apiRideDetailLoading, setApiRideDetailLoading] = useState(false);
  const [apiRideDetailError, setApiRideDetailError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setHydrating(false), 300);
    return () => clearTimeout(timeout);
  }, []);

  // Carregar boleias da API quando estás no Explore
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

  // Carregar detalhe de uma boleia da API quando abres o sheet de detalhes
  useEffect(() => {
    if (!openDetailsSheet || !selectedApiRideForDetail) {
      setApiRideDetail(null);
      setApiRideDetailError(null);
      return;
    }
    setApiRideDetailLoading(true);
    setApiRideDetailError(null);
    apiRequest<ApiRide>(`/rides/${selectedApiRideForDetail}`)
      .then((data) => {
        setApiRideDetail(data);
        setApiRideDetailError(null);
      })
      .catch((err: Error) => {
        setApiRideDetail(null);
        setApiRideDetailError(err.message || "Não foi possível carregar os detalhes.");
      })
      .finally(() => setApiRideDetailLoading(false));
  }, [openDetailsSheet, selectedApiRideForDetail]);

  function openAdjustments() { setOpenSheet(true); }
  function applyFilters(next: DiscoverFilters) {
    setFilters(next);
    setOpenSheet(false);
  }

  // Carregar ofertas disponíveis (EXCLUINDO as do próprio utilizador!)
  const availableOffers = useMemo(() => {
    const userId = user?.id || "current_user";
    const myPendingRequestIds = new Set(
      requests
        .filter(request => request.userId === userId && request.status === "pending")
        .map(request => request.id)
    );

    return getAvailableOffers()
      .filter(offer => offer.userId !== userId)
      .filter(offer => !offer.pedidos.some(pid => myPendingRequestIds.has(pid)));
  }, [getAvailableOffers, requests, user?.id]);

  // Carregar pedidos disponíveis (excluindo os do próprio utilizador)
  const availableRequests = useMemo(() => {
    const userId = user?.id || "current_user";
    return getAvailableRequests().filter(request => request.userId !== userId);
  }, [getAvailableRequests, user?.id]);

  // Obter as minhas ofertas para matching com pedidos
  const myOffers = useMemo(() => getMyOffers(user?.id || "current_user"), [getMyOffers, user?.id]);

  // Aplicar filtros
  const filteredOffers = useMemo(() => {
    let result = [...availableOffers];

    // Filtro de lugares mínimos
    if (filters.minSeats > 0) {
      result = result.filter(offer => offer.lugaresDisponiveis >= filters.minSeats);
    }

    // Filtro de origem (se houver)
    if (filters.origin && filters.origin.trim()) {
      const originFilter = filters.origin.toLowerCase();
      result = result.filter(offer =>
        offer.origem.toLowerCase().includes(originFilter)
      );
    }

    // Filtro de destino (se houver)
    if (filters.destination && filters.destination.trim()) {
      const destinationFilter = filters.destination.toLowerCase();
      result = result.filter(offer =>
        offer.destino.toLowerCase().includes(destinationFilter)
      );
    }

    return result;
  }, [availableOffers, filters]);

  // Ofertas para "For You" - matching com os pedidos do utilizador
  const forYouOffers = useMemo(() => {
    const myRequests = getMyRequests(user?.id || "current_user");
    if (myRequests.length === 0) return [];

    // Para cada pedido, encontrar ofertas compatíveis
    const matchedOffers = new Set<string>();
    
    myRequests.forEach(request => {
      if (request.status === "pending") {
        availableOffers.forEach(offer => {
          // Verificar compatibilidade básica
          const sameDate = offer.data === request.data;
          const timeInRange = offer.hora >= request.horaMin && offer.hora <= request.horaMax;
          const enoughSeats = offer.lugaresDisponiveis >= request.passageiros;
          
          const matchOrigem = offer.origem.toLowerCase().includes(request.origem.toLowerCase()) ||
                            request.origem.toLowerCase().includes(offer.origem.toLowerCase());
          const matchDestino = offer.destino.toLowerCase().includes(request.destino.toLowerCase()) ||
                             request.destino.toLowerCase().includes(offer.destino.toLowerCase());

          if (sameDate && timeInRange && enoughSeats && matchOrigem && matchDestino) {
            matchedOffers.add(offer.id);
          }
        });
      }
    });

    return availableOffers.filter(offer => matchedOffers.has(offer.id));
  }, [availableOffers, getMyRequests, user?.id]);

  // Pedidos compatíveis com AS MINHAS OFERTAS (para convidar)
  const matchedRequestsForMyOffers = useMemo(() => {
    if (myOffers.length === 0) return [];

    const matchedRequests = new Set<string>();
    
    myOffers.forEach(offer => {
      const compatible = getRequestsForOffer(offer);
      compatible.forEach(req => matchedRequests.add(req.id));
    });

    return availableRequests.filter(req => matchedRequests.has(req.id));
  }, [myOffers, availableRequests, getRequestsForOffer]);

  // Handler: Abrir sheet para pedir lugar (oferta local)
  const handleOpenRequestSeat = (offerId: string) => {
    setSelectedOfferId(offerId);
    setSelectedApiRideId(null);
    setOpenRequestSeat(true);
  };

  // Handler: Abrir sheet para pedir lugar (boleia da API)
  const handleOpenRequestSeatApi = (rideId: string) => {
    setSelectedApiRideId(rideId);
    setSelectedOfferId(null);
    setOpenRequestSeat(true);
  };

  // Handler: Confirmar pedido com mensagem (local ou API)
  const handleConfirmRequestSeat = async (message?: string) => {
    if (selectedApiRideId) {
      try {
        await apiRequest(`/bookings/rides/${selectedApiRideId}`, {
          method: "POST",
          body: JSON.stringify({ seats: 1 }),
        });
        const ride = apiRides.find((r) => r.id === selectedApiRideId);
        showSuccess(
          "Reserva feita!",
          ride ? `${ride.origin} → ${ride.destination}. O condutor pode confirmar em breve.` : "A tua reserva foi registada."
        );
        setOpenRequestSeat(false);
        setSelectedApiRideId(null);
      } catch (err) {
        console.error("Erro ao reservar:", err);
        showError("Erro ao reservar", err instanceof Error ? err.message : "Tenta novamente.");
      }
      return;
    }

    if (!selectedOfferId) return;
    try {
      const offer = availableOffers.find((o) => o.id === selectedOfferId);
      if (!offer) return;

      const { threadId } = requestSeatOnOffer(selectedOfferId, message);

      showSuccess(
        "Pedido enviado!",
        `${offer.origem} → ${offer.destino}\n${offer.data} às ${offer.hora}\nConversa aberta na Inbox.`
      );

      setOpenRequestSeat(false);
      setSelectedOfferId(null);

      setTimeout(() => onOpenInbox?.(threadId), 50);
    } catch (error) {
      console.error("Erro ao enviar pedido:", error);
      showError("Erro ao enviar pedido", "Tenta novamente.");
    }
  };

  // Handler: Abrir detalhes da viagem (local)
  const handleOpenDetails = (ride: RideOffer | RideRequest) => {
    setSelectedRideForDetails(ride);
    setSelectedApiRideForDetail(null);
    setOpenDetailsSheet(true);
  };

  // Handler: Abrir detalhes da boleia da API (condutor e veículo)
  const handleOpenDetailsApi = (rideId: string) => {
    setSelectedApiRideForDetail(rideId);
    setSelectedRideForDetails(null);
    setOpenDetailsSheet(true);
  };

  // Handler: Convidar passageiro (condutor → passageiro)
  const handleInvitePassenger = (requestId: string) => {
    const request = availableRequests.find((r) => r.id === requestId);
    if (!request) return;

    // Encontrar qual das minhas ofertas é compatível
    const compatibleOffer = myOffers.find(offer => {
      const compatible = getRequestsForOffer(offer);
      return compatible.some(r => r.id === requestId);
    });

    if (!compatibleOffer) {
      showError("Sem oferta compatível", "Nenhuma das tuas ofertas é compatível com este pedido.");
      return;
    }

    // Adicionar pedido à oferta (convidar)
    invitePassenger(compatibleOffer.id, requestId);
    
    showSuccess(
      "Convite enviado!",
      `O passageiro foi notificado. Podes ver o pedido na secção Rides.`
    );
  };

  return (
    <>
      <DiscoverTopBar
        active={tab}
        onChange={setTab}
        onFilter={openAdjustments}
      />

      <main className="relative min-h-screen pb-32 bg-white text-gray-900">
        <BackgroundGlow />
        <div className="relative z-10 px-4">
          <div className="mx-auto max-w-mobile md:max-w-tablet lg:max-w-desktop">
        {tab === "explore" && (
          <>
            <h2 className="text-sm font-bold text-gray-800 mt-3 mb-2">
              Boleias disponíveis
              {(apiRides.length > 0 || filteredOffers.length > 0) &&
                ` (${apiRides.length + filteredOffers.length})`}
            </h2>
            {hydrating || apiRidesLoading ? (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <EntityCardSkeleton key={`offer-skeleton-${index}`} />
                ))}
              </div>
            ) : apiRides.length === 0 && filteredOffers.length === 0 ? (
              <div className="text-center py-16 px-4 animate-fade-in">
                <p className="text-xl font-bold text-gray-900 mb-2">Sem boleias disponíveis</p>
                <p className="text-sm text-gray-600 max-w-[280px] mx-auto">
                  Tenta ajustar os filtros ou sê o primeiro a criar uma boleia.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {/* Boleias da API (backend) – com condutor */}
                {apiRides.map((ride) => {
                  const dep = ride.departureTime ? new Date(ride.departureTime) : null;
                  const dateStr = dep ? dep.toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" }) : "";
                  const timeStr = dep ? dep.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }) : "";
                  const driverName = ride.driver?.profile?.name || ride.driver?.email || "Condutor";
                  const initials = driverName.slice(0, 2).toUpperCase();
                  const badges: Array<{ label: string; tone?: "brand" | "success" | "warning" }> = [];
                  if (ride.remainingSeats >= 3) {
                    badges.push({ label: `${ride.remainingSeats} lugares`, tone: "success" });
                  } else {
                    badges.push({ label: `${ride.remainingSeats} lugar${ride.remainingSeats !== 1 ? "es" : ""}`, tone: "warning" });
                  }
                  if (ride.price != null && ride.price > 0) {
                    badges.push({ label: `€${ride.price.toFixed(0)}` });
                  }
                  return (
                    <EntityCard
                      key={ride.id}
                      title={`${ride.origin} → ${ride.destination}`}
                      subtitle={dateStr && timeStr ? `${dateStr}, ${timeStr}` : ""}
                      meta={`Condutor: ${driverName}`}
                      badges={badges}
                      avatar={{
                        src: ride.driver?.profile?.avatarUrl ?? undefined,
                        initials,
                      }}
                      primaryLabel="Pedir lugar"
                      secondaryLabel="Detalhes"
                      onPrimary={() => handleOpenRequestSeatApi(ride.id)}
                      onSecondary={() => handleOpenDetailsApi(ride.id)}
                    />
                  );
                })}
                {/* Ofertas locais (mock) */}
                {filteredOffers.map((offer) => {
                  const initials = offer.origem.substring(0, 2).toUpperCase();
                  const badges: Array<{ label: string; tone?: "brand" | "success" | "warning" }> = [];
                  if (offer.lugaresDisponiveis >= 3) {
                    badges.push({ label: `${offer.lugaresDisponiveis} lugares`, tone: "success" });
                  } else {
                    badges.push({ label: `${offer.lugaresDisponiveis} lugar${offer.lugaresDisponiveis > 1 ? "es" : ""}`, tone: "warning" });
                  }
                  if (offer.aceitaDesvios) {
                    badges.push({ label: "Aceita desvios" });
                  }
                  return (
                    <EntityCard
                      key={offer.id}
                      title={`${offer.origem} → ${offer.destino}`}
                      subtitle={`${offer.data} às ${offer.hora}`}
                      meta={offer.observacoes || `${offer.desvioMaxMin} min desvio max`}
                      badges={badges}
                      avatar={{ initials }}
                      primaryLabel="Pedir lugar"
                      secondaryLabel="Detalhes"
                      onPrimary={() => handleOpenRequestSeat(offer.id)}
                      onSecondary={() => handleOpenDetails(offer)}
                    />
                  );
                })}
              </div>
            )}
          </>
        )}

        {tab === "requests" && (
          <>
            <h2 className="text-sm font-bold text-gray-900 mt-3 mb-2">
              Pedidos de boleia {matchedRequestsForMyOffers.length > 0 && `(${matchedRequestsForMyOffers.length} compatíveis)`}
            </h2>
            {hydrating ? (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <EntityCardSkeleton key={`request-skeleton-${index}`} />
                ))}
              </div>
            ) : myOffers.length === 0 ? (
              <div className="text-center py-16 px-4 animate-fade-in">
                <p className="text-xl font-bold text-gray-900 mb-2">Sem pedidos disponíveis</p>
                <p className="text-sm text-gray-600 max-w-[280px] mx-auto">
                  Cria uma oferta de boleia para veres pedidos compatíveis com o teu percurso
                </p>
              </div>
            ) : matchedRequestsForMyOffers.length === 0 ? (
              <div className="text-center py-16 px-4 animate-fade-in">
                <p className="text-xl font-bold text-gray-900 mb-2">Sem pedidos compatíveis</p>
                <p className="text-sm text-gray-600 max-w-[280px] mx-auto">
                  Ainda ninguém pediu boleia no teu percurso. Volta mais tarde!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {matchedRequestsForMyOffers.map((request) => {
                  const initials = request.origem.substring(0, 2).toUpperCase();
                  const badges: Array<{ label: string; tone?: "brand" | "success" | "warning" }> = [];
                  
                  if (request.urgencia === "alta") {
                    badges.push({ label: "Urgente", tone: "warning" });
                  }
                  
                  badges.push({ label: `${request.passageiros} passageiro${request.passageiros > 1 ? "s" : ""}` });

                  return (
                    <EntityCard
                      key={request.id}
                      title={`${request.origem} → ${request.destino}`}
                      subtitle={`${request.data} • ${request.horaMin}-${request.horaMax}`}
                      meta={request.observacoes || `Contacto: ${request.contacto}`}
                      badges={badges}
                      avatar={{ initials }}
                      primaryLabel="Convidar"
                      secondaryLabel="Detalhes"
                      onPrimary={() => handleInvitePassenger(request.id)}
                      onSecondary={() => handleOpenDetails(request)}
                    />
                  );
                })}
              </div>
            )}
          </>
        )}

        {tab === "for-you" && (
          <>
            <h2 className="text-sm font-bold text-gray-900 mt-3 mb-2">
              Para ti {forYouOffers.length > 0 && `(${forYouOffers.length})`}
            </h2>
            {hydrating ? (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {Array.from({ length: 2 }).map((_, index) => (
                  <EntityCardSkeleton key={`foryou-skeleton-${index}`} />
                ))}
              </div>
            ) : forYouOffers.length === 0 ? (
              <div className="text-center py-16 px-4 animate-fade-in">
                <p className="text-xl font-bold text-gray-900 mb-2">Sem sugestões personalizadas</p>
                <p className="text-sm text-gray-600 max-w-[280px] mx-auto">
                  Cria um pedido de boleia para veres ofertas compatíveis contigo
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {forYouOffers.map((offer) => {
                  const initials = offer.origem.substring(0, 2).toUpperCase();
                  return (
                    <EntityCard
                      key={offer.id}
                      title={`${offer.origem} → ${offer.destino}`}
                      subtitle={`${offer.data} às ${offer.hora}`}
                      meta={`${offer.lugaresDisponiveis} lugar${offer.lugaresDisponiveis > 1 ? "es" : ""} • Match perfeito!`}
                      badges={[{ label: "Para ti", tone: "brand" }]}
                      avatar={{ initials }}
                      primaryLabel="Pedir lugar"
                      secondaryLabel="Detalhes"
                      onPrimary={() => handleOpenRequestSeat(offer.id)}
                      onSecondary={() => handleOpenDetails(offer)}
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
        open={openSheet}
        initial={filters}
        onClose={() => setOpenSheet(false)}
        onApply={applyFilters}
      />

      {(selectedOfferId || selectedApiRideId) && (
        <RequestSeatSheet
          open={openRequestSeat}
          onClose={() => {
            setOpenRequestSeat(false);
            setSelectedOfferId(null);
            setSelectedApiRideId(null);
          }}
          onConfirm={handleConfirmRequestSeat}
          offerTitle={(() => {
            if (selectedApiRideId) {
              const ride = apiRides.find((r) => r.id === selectedApiRideId);
              if (ride) {
                const dep = ride.departureTime ? new Date(ride.departureTime) : null;
                const t = dep ? dep.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }) : "";
                return `${ride.origin} → ${ride.destination}${t ? ` (${t})` : ""}`;
              }
              return "";
            }
            const offer = availableOffers.find((o) => o.id === selectedOfferId);
            return offer ? `${offer.origem} → ${offer.destino} (${offer.data} às ${offer.hora})` : "";
          })()}
        />
      )}

      <Sheet
        open={openDetailsSheet}
        onClose={() => {
          setOpenDetailsSheet(false);
          setSelectedRideForDetails(null);
          setSelectedApiRideForDetail(null);
        }}
        title={
          selectedApiRideForDetail
            ? "Detalhes da boleia"
            : selectedRideForDetails && "hora" in selectedRideForDetails
            ? "Detalhes da oferta"
            : selectedRideForDetails && "horaMin" in selectedRideForDetails
            ? "Detalhes do pedido"
            : "Detalhes"
        }
        height="lg"
        footer={
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => {
              setOpenDetailsSheet(false);
              setSelectedRideForDetails(null);
              setSelectedApiRideForDetail(null);
            }}
          >
            Fechar
          </Button>
        }
      >
        {/* Detalhe de boleia da API (condutor + veículo) */}
        {selectedApiRideForDetail && (
          <div className="grid gap-4 p-1">
            {apiRideDetailLoading && (
              <p className="text-sm text-gray-600">A carregar...</p>
            )}
            {apiRideDetailError && !apiRideDetailLoading && (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-4">
                {apiRideDetailError}
              </p>
            )}
            {apiRideDetail && !apiRideDetailLoading && (
              <>
                <div className="grid gap-2 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📍</span>
                    <div>
                      <div className="text-xs text-gray-600">Origem</div>
                      <div className="text-sm font-semibold text-gray-900">{apiRideDetail.origin}</div>
                    </div>
                  </div>
                  <div className="h-px bg-gray-100 my-1" />
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🎯</span>
                    <div>
                      <div className="text-xs text-gray-600">Destino</div>
                      <div className="text-sm font-semibold text-gray-900">{apiRideDetail.destination}</div>
                    </div>
                  </div>
                </div>
                {apiRideDetail.departureTime && (
                  <div className="grid gap-2 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                    <div className="text-xs text-gray-600">Data e hora</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {new Date(apiRideDetail.departureTime).toLocaleString("pt-PT", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                )}
                {apiRideDetail.driver && (
                  <div className="grid gap-2 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                    <div className="text-xs font-semibold text-gray-600 uppercase mb-1">Condutor</div>
                    <div className="flex items-center gap-3">
                      {apiRideDetail.driver.profile?.avatarUrl ? (
                        <img
                          src={apiRideDetail.driver.profile.avatarUrl}
                          alt=""
                          className="w-10 h-10 rounded-full bg-gray-200 object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-sm font-semibold text-gray-700">
                          {(apiRideDetail.driver.profile?.name || apiRideDetail.driver.email || "C").slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 truncate">
                          {apiRideDetail.driver.profile?.name || apiRideDetail.driver.email || "Condutor"}
                        </div>
                        {apiRideDetail.driver.profile?.username && (
                          <div className="text-xs text-gray-600 truncate">@{apiRideDetail.driver.profile.username}</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {apiRideDetail.vehicle && (
                  <div className="grid gap-2 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                    <div className="text-xs font-semibold text-gray-600 uppercase mb-1">Veículo</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {apiRideDetail.vehicle.brand} {apiRideDetail.vehicle.model}
                      {apiRideDetail.vehicle.color ? ` · ${apiRideDetail.vehicle.color}` : ""}
                    </div>
                    <div className="text-xs text-gray-600">
                      {apiRideDetail.vehicle.seats} lugares
                      {apiRideDetail.price != null && apiRideDetail.price > 0 && ` · €${apiRideDetail.price.toFixed(0)}`}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {selectedRideForDetails && !selectedApiRideForDetail && (
          <div className="grid gap-4 p-1">
            <div className="grid gap-2">
              <div className="text-xs font-semibold text-gray-600 uppercase">
                {selectedRideForDetails && "hora" in selectedRideForDetails ? "Oferta de Boleia" : "Pedido de Boleia"}
              </div>
              <div className="text-xl font-bold text-gray-900">
                {"hora" in selectedRideForDetails
                  ? selectedRideForDetails.hora
                  : "horaMin" in selectedRideForDetails
                  ? `${selectedRideForDetails.horaMin}-${selectedRideForDetails.horaMax}`
                  : ""}
              </div>
            </div>

            <div className="grid gap-2 p-4 bg-gray-50 border border-gray-200 rounded-xl">
              <div className="flex items-center gap-2">
                <span className="text-lg">📍</span>
                <div>
                  <div className="text-xs text-gray-600">Origem</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {"origem" in selectedRideForDetails ? selectedRideForDetails.origem : ""}
                  </div>
                </div>
              </div>
              <div className="h-px bg-gray-100 my-1" />
              <div className="flex items-center gap-2">
                <span className="text-lg">🎯</span>
                <div>
                  <div className="text-xs text-gray-600">Destino</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {"destino" in selectedRideForDetails ? selectedRideForDetails.destino : ""}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-2 p-4 bg-gray-50 border border-gray-200 rounded-xl">
              <div className="text-xs text-gray-600">Data</div>
              <div className="text-sm font-semibold text-gray-900">
                {"data" in selectedRideForDetails ? selectedRideForDetails.data : ""}
              </div>
            </div>

            {selectedRideForDetails && "lugaresDisponiveis" in selectedRideForDetails && (
              <>
                <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
                  <div className="text-xs text-green-300">
                    <strong>
                      {selectedRideForDetails.lugaresDisponiveis}/{selectedRideForDetails.lugares} lugares disponíveis
                    </strong>
                  </div>
                </div>

                <div className="grid gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <div className="text-xs font-semibold text-gray-600 uppercase mb-1">Características</div>
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Aceita desvios:</span>
                      <span className="font-semibold text-gray-900">
                        {selectedRideForDetails.aceitaDesvios ? "Sim" : "Não"}
                      </span>
                    </div>
                    {selectedRideForDetails.aceitaDesvios && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Desvio máximo:</span>
                        <span className="font-semibold text-gray-900">{selectedRideForDetails.desvioMaxMin} min</span>
                      </div>
                    )}
                    {selectedRideForDetails.pontoEncontro && (
                      <div className="flex items-start gap-2 text-sm">
                        <span className="text-gray-500">Ponto de encontro:</span>
                        <span className="font-semibold text-gray-900">{selectedRideForDetails.pontoEncontro}</span>
                      </div>
                    )}
                    {selectedRideForDetails.recorrente && (
                      <div className="flex items-start gap-2 text-sm">
                        <span className="text-gray-500">Recorrente:</span>
                        <span className="font-semibold text-gray-900">
                          {selectedRideForDetails.diasSemana.map((d) => {
                            const dias: Record<string, string> = {
                              seg: "Seg",
                              ter: "Ter",
                              qua: "Qua",
                              qui: "Qui",
                              sex: "Sex",
                            };
                            return dias[d];
                          }).join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <div className="text-xs font-semibold text-gray-600 uppercase mb-1">Preferências</div>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedRideForDetails.preferencias.musica && (
                      <div className="text-xs text-gray-600">🎵 Música</div>
                    )}
                    {selectedRideForDetails.preferencias.falar && (
                      <div className="text-xs text-gray-600">💬 Conversa</div>
                    )}
                    {selectedRideForDetails.preferencias.bagagem && (
                      <div className="text-xs text-gray-600">🧳 Bagagem</div>
                    )}
                    {selectedRideForDetails.preferencias.animais && (
                      <div className="text-xs text-gray-600">🐕 Animais</div>
                    )}
                    {!selectedRideForDetails.preferencias.musica &&
                      !selectedRideForDetails.preferencias.falar &&
                      !selectedRideForDetails.preferencias.bagagem &&
                      !selectedRideForDetails.preferencias.animais && (
                        <div className="text-xs text-gray-400 col-span-2">Sem preferências especiais</div>
                      )}
                  </div>
                </div>
              </>
            )}

            {selectedRideForDetails && "passageiros" in selectedRideForDetails && (
              <>
                <div className="p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                  <div className="text-xs text-blue-300">
                    <strong>{selectedRideForDetails.passageiros} passageiro{selectedRideForDetails.passageiros > 1 ? "s" : ""}</strong>
                  </div>
                </div>

                <div className="grid gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <div className="text-xs font-semibold text-gray-600 uppercase mb-1">Características</div>
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Aceita desvios:</span>
                      <span className="font-semibold text-gray-900">
                        {selectedRideForDetails.aceitaDesvios ? "Sim" : "Não"}
                      </span>
                    </div>
                    {selectedRideForDetails.aceitaDesvios && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Desvio máximo:</span>
                        <span className="font-semibold text-gray-900">{selectedRideForDetails.desvioMaxMin} min</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Urgência:</span>
                      <span className="font-semibold text-gray-900 capitalize">{selectedRideForDetails.urgencia}</span>
                    </div>
                    {selectedRideForDetails.orcamentoMax && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Orçamento máximo:</span>
                        <span className="font-semibold text-gray-900">{selectedRideForDetails.orcamentoMax}€</span>
                      </div>
                    )}
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-gray-500">Contacto:</span>
                      <span className="font-semibold text-gray-900">{selectedRideForDetails.contacto}</span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <div className="text-xs font-semibold text-gray-600 uppercase mb-1">Preferências</div>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedRideForDetails.preferencias.musica && (
                      <div className="text-xs text-gray-600">🎵 Música</div>
                    )}
                    {selectedRideForDetails.preferencias.falar && (
                      <div className="text-xs text-gray-600">💬 Conversa</div>
                    )}
                    {selectedRideForDetails.preferencias.bagagem && (
                      <div className="text-xs text-gray-600">🧳 Bagagem</div>
                    )}
                    {selectedRideForDetails.preferencias.animais && (
                      <div className="text-xs text-gray-600">🐕 Animais</div>
                    )}
                    {selectedRideForDetails.preferencias.fumador && (
                      <div className="text-xs text-gray-600">🚬 Fumador</div>
                    )}
                    {!selectedRideForDetails.preferencias.musica &&
                      !selectedRideForDetails.preferencias.falar &&
                      !selectedRideForDetails.preferencias.bagagem &&
                      !selectedRideForDetails.preferencias.animais &&
                      !selectedRideForDetails.preferencias.fumador && (
                        <div className="text-xs text-gray-400 col-span-2">Sem preferências especiais</div>
                      )}
                  </div>
                </div>
              </>
            )}

            {"observacoes" in selectedRideForDetails && selectedRideForDetails.observacoes && (
              <div className="grid gap-2">
                <div className="text-xs font-semibold text-gray-600">Observações</div>
                <div className="text-sm text-gray-700 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  {selectedRideForDetails.observacoes}
                </div>
              </div>
            )}
          </div>
        )}
      </Sheet>
    </>
  );
}
