import { useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useRides, type RideOffer, type RideRequest } from "../contexts/RidesContext";
import { useNotifications } from "../contexts/NotificationContext";
import DiscoverTopBar, { type DiscoverTab } from "../components/ui/DiscoverTopBar";
import DiscoverFiltersSheet from "../components/ui/DiscoverFiltersSheet";
import RequestSeatSheet from "../components/ui/RequestSeatSheet";
import EntityCard from "../components/ui/EntityCard";
// import { EntityCardSkeleton } from "../components/ui/Skeleton"; // Para uso futuro quando houver API
import Sheet from "../components/ui/Sheet";
import { Button } from "../components/ui/Button";

import type { DiscoverFilters } from "./types/discover";
import { defaultFilters } from "./types/discover";

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

    // Filtro de chips
    if (filters.chips.includes("seats3plus")) {
      result = result.filter(offer => offer.lugaresDisponiveis >= 3);
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

  // Handler: Abrir sheet para pedir lugar
  const handleOpenRequestSeat = (offerId: string) => {
    setSelectedOfferId(offerId);
    setOpenRequestSeat(true);
  };

  // Handler: Confirmar pedido com mensagem
  const handleConfirmRequestSeat = (message?: string) => {
    if (!selectedOfferId) return;
    
    try {
      const offer = availableOffers.find((o) => o.id === selectedOfferId);
      if (!offer) return;

      // Criar pedido com mensagem personalizada
      const { threadId } = requestSeatOnOffer(selectedOfferId, message);
      
      // Mostrar notificação de sucesso
      showSuccess(
        "Pedido enviado!",
        `${offer.origem} → ${offer.destino}\n${offer.data} às ${offer.hora}\nConversa aberta na Inbox.`
      );
      
      setOpenRequestSeat(false);
      setSelectedOfferId(null);
      
      // Aguardar um pouco para garantir que a thread foi criada no contexto
      setTimeout(() => {
        onOpenInbox?.(threadId);
      }, 50);
    } catch (error) {
      console.error("Erro ao enviar pedido:", error);
      showError("Erro ao enviar pedido", "Tenta novamente.");
    }
  };

  // Handler: Abrir detalhes da viagem
  const handleOpenDetails = (ride: RideOffer | RideRequest) => {
    setSelectedRideForDetails(ride);
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
      <DiscoverTopBar active={tab} onChange={setTab} onFilter={openAdjustments} />

      <main className="relative min-h-screen px-4 pb-28 text-white overflow-hidden">
        {/* Blur effects coloridos */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -left-10 w-[28rem] h-[28rem] bg-pink-500/20 blur-[180px]" />
          <div className="absolute top-32 right-0 w-[24rem] h-[24rem] bg-purple-500/20 blur-[160px]" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[32rem] h-[32rem] bg-amber-200/15 blur-[200px]" />
        </div>
        
        <div className="relative z-10">
        {tab === "explore" && (
          <>
            <h2 className="text-sm font-bold text-white mt-3 mb-2">
              Boleias disponíveis {filteredOffers.length > 0 && `(${filteredOffers.length})`}
            </h2>
            {filteredOffers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-white/70 mb-1">Sem boleias disponíveis</p>
                <p className="text-xs text-white/50">
                  {availableOffers.length > 0 
                    ? "Tenta ajustar os filtros"
                    : "Sê o primeiro a oferecer uma boleia!"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {/* TODO: Quando houver API real, adicionar loading state: {isLoading ? Array(4).fill(0).map((_, i) => <EntityCardSkeleton key={i} />) : ...} */}
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
            <h2 className="text-sm font-bold text-white mt-3 mb-2">
              Pedidos de boleia {matchedRequestsForMyOffers.length > 0 && `(${matchedRequestsForMyOffers.length} compatíveis)`}
            </h2>
            {myOffers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-white/70 mb-1">Sem pedidos disponíveis</p>
                <p className="text-xs text-white/50">Cria uma oferta de boleia para veres pedidos compatíveis</p>
              </div>
            ) : matchedRequestsForMyOffers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-white/70 mb-1">Sem pedidos compatíveis</p>
                <p className="text-xs text-white/50">Ainda ninguém pediu boleia no teu percurso</p>
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
            <h2 className="text-sm font-bold text-white mt-3 mb-2">
              Para ti {forYouOffers.length > 0 && `(${forYouOffers.length})`}
            </h2>
            {forYouOffers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-white/70 mb-1">Sem sugestões personalizadas</p>
                <p className="text-xs text-white/50">Cria um pedido de boleia para veres ofertas compatíveis</p>
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
      </main>

      <DiscoverFiltersSheet
        open={openSheet}
        initial={filters}
        onClose={() => setOpenSheet(false)}
        onApply={applyFilters}
      />

      {selectedOfferId && (
        <RequestSeatSheet
          open={openRequestSeat}
          onClose={() => {
            setOpenRequestSeat(false);
            setSelectedOfferId(null);
          }}
          onConfirm={handleConfirmRequestSeat}
          offerTitle={(() => {
            const offer = availableOffers.find(o => o.id === selectedOfferId);
            return offer ? `${offer.origem} → ${offer.destino} (${offer.data} às ${offer.hora})` : "";
          })()}
        />
      )}

      <Sheet
        open={openDetailsSheet}
        onClose={() => {
          setOpenDetailsSheet(false);
          setSelectedRideForDetails(null);
        }}
        title={
          selectedRideForDetails && "hora" in selectedRideForDetails
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
            }}
          >
            Fechar
          </Button>
        }
      >
        {selectedRideForDetails && (
          <div className="grid gap-4 p-1">
            <div className="grid gap-2">
              <div className="text-xs font-semibold text-white/70 uppercase">
                {selectedRideForDetails && "hora" in selectedRideForDetails ? "Oferta de Boleia" : "Pedido de Boleia"}
              </div>
              <div className="text-xl font-bold text-white">
                {"hora" in selectedRideForDetails
                  ? selectedRideForDetails.hora
                  : "horaMin" in selectedRideForDetails
                  ? `${selectedRideForDetails.horaMin}-${selectedRideForDetails.horaMax}`
                  : ""}
              </div>
            </div>

            <div className="grid gap-2 p-4 bg-white/5 border border-white/10 rounded-xl">
              <div className="flex items-center gap-2">
                <span className="text-lg">📍</span>
                <div>
                  <div className="text-xs text-white/70">Origem</div>
                  <div className="text-sm font-semibold text-white">
                    {"origem" in selectedRideForDetails ? selectedRideForDetails.origem : ""}
                  </div>
                </div>
              </div>
              <div className="h-px bg-white/10 my-1" />
              <div className="flex items-center gap-2">
                <span className="text-lg">🎯</span>
                <div>
                  <div className="text-xs text-white/70">Destino</div>
                  <div className="text-sm font-semibold text-white">
                    {"destino" in selectedRideForDetails ? selectedRideForDetails.destino : ""}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-2 p-4 bg-white/5 border border-white/10 rounded-xl">
              <div className="text-xs text-white/70">Data</div>
              <div className="text-sm font-semibold text-white">
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

                <div className="grid gap-3 p-4 bg-white/5 border border-white/10 rounded-xl">
                  <div className="text-xs font-semibold text-white/70 uppercase mb-1">Características</div>
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/60">Aceita desvios:</span>
                      <span className="font-semibold text-white">
                        {selectedRideForDetails.aceitaDesvios ? "Sim" : "Não"}
                      </span>
                    </div>
                    {selectedRideForDetails.aceitaDesvios && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60">Desvio máximo:</span>
                        <span className="font-semibold text-white">{selectedRideForDetails.desvioMaxMin} min</span>
                      </div>
                    )}
                    {selectedRideForDetails.pontoEncontro && (
                      <div className="flex items-start gap-2 text-sm">
                        <span className="text-white/60">Ponto de encontro:</span>
                        <span className="font-semibold text-white">{selectedRideForDetails.pontoEncontro}</span>
                      </div>
                    )}
                    {selectedRideForDetails.recorrente && (
                      <div className="flex items-start gap-2 text-sm">
                        <span className="text-white/60">Recorrente:</span>
                        <span className="font-semibold text-white">
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

                <div className="grid gap-3 p-4 bg-white/5 border border-white/10 rounded-xl">
                  <div className="text-xs font-semibold text-white/70 uppercase mb-1">Preferências</div>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedRideForDetails.preferencias.musica && (
                      <div className="text-xs text-white/70">🎵 Música</div>
                    )}
                    {selectedRideForDetails.preferencias.falar && (
                      <div className="text-xs text-white/70">💬 Conversa</div>
                    )}
                    {selectedRideForDetails.preferencias.bagagem && (
                      <div className="text-xs text-white/70">🧳 Bagagem</div>
                    )}
                    {selectedRideForDetails.preferencias.animais && (
                      <div className="text-xs text-white/70">🐕 Animais</div>
                    )}
                    {!selectedRideForDetails.preferencias.musica &&
                      !selectedRideForDetails.preferencias.falar &&
                      !selectedRideForDetails.preferencias.bagagem &&
                      !selectedRideForDetails.preferencias.animais && (
                        <div className="text-xs text-white/50 col-span-2">Sem preferências especiais</div>
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

                <div className="grid gap-3 p-4 bg-white/5 border border-white/10 rounded-xl">
                  <div className="text-xs font-semibold text-white/70 uppercase mb-1">Características</div>
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/60">Aceita desvios:</span>
                      <span className="font-semibold text-white">
                        {selectedRideForDetails.aceitaDesvios ? "Sim" : "Não"}
                      </span>
                    </div>
                    {selectedRideForDetails.aceitaDesvios && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60">Desvio máximo:</span>
                        <span className="font-semibold text-white">{selectedRideForDetails.desvioMaxMin} min</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/60">Urgência:</span>
                      <span className="font-semibold text-white capitalize">{selectedRideForDetails.urgencia}</span>
                    </div>
                    {selectedRideForDetails.orcamentoMax && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60">Orçamento máximo:</span>
                        <span className="font-semibold text-white">{selectedRideForDetails.orcamentoMax}€</span>
                      </div>
                    )}
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-white/60">Contacto:</span>
                      <span className="font-semibold text-white">{selectedRideForDetails.contacto}</span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 p-4 bg-white/5 border border-white/10 rounded-xl">
                  <div className="text-xs font-semibold text-white/70 uppercase mb-1">Preferências</div>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedRideForDetails.preferencias.musica && (
                      <div className="text-xs text-white/70">🎵 Música</div>
                    )}
                    {selectedRideForDetails.preferencias.falar && (
                      <div className="text-xs text-white/70">💬 Conversa</div>
                    )}
                    {selectedRideForDetails.preferencias.bagagem && (
                      <div className="text-xs text-white/70">🧳 Bagagem</div>
                    )}
                    {selectedRideForDetails.preferencias.animais && (
                      <div className="text-xs text-white/70">🐕 Animais</div>
                    )}
                    {selectedRideForDetails.preferencias.fumador && (
                      <div className="text-xs text-white/70">🚬 Fumador</div>
                    )}
                    {!selectedRideForDetails.preferencias.musica &&
                      !selectedRideForDetails.preferencias.falar &&
                      !selectedRideForDetails.preferencias.bagagem &&
                      !selectedRideForDetails.preferencias.animais &&
                      !selectedRideForDetails.preferencias.fumador && (
                        <div className="text-xs text-white/50 col-span-2">Sem preferências especiais</div>
                      )}
                  </div>
                </div>
              </>
            )}

            {"observacoes" in selectedRideForDetails && selectedRideForDetails.observacoes && (
              <div className="grid gap-2">
                <div className="text-xs font-semibold text-white/70">Observações</div>
                <div className="text-sm text-white/80 p-3 bg-white/5 border border-white/10 rounded-lg">
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
