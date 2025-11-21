// src/pages/RidesPage.tsx
import { useState, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useRides, type RideOffer, type RideRequest } from "../contexts/RidesContext";
import EntityCard from "../components/ui/EntityCard";
import RidesCalendar, { type DayRides } from "../components/ui/RidesCalendar";
import Sheet from "../components/ui/Sheet";
import { Button } from "../components/ui/Button";

export default function RidesPage() {
  const { user } = useAuth();
  const { getMyOffers, getMyRequests, requests, acceptRequest, declineRequest, cancelOffer, cancelRequest } = useRides();
  const [open, setOpen] = useState(false);

  // Carregar ofertas e pedidos do utilizador
  const myOffers = useMemo(() => getMyOffers(user?.id || "current_user"), [getMyOffers, user?.id]);
  const myRequests = useMemo(() => getMyRequests(user?.id || "current_user"), [getMyRequests, user?.id]);

  // Converter para formato do calendário
  const ridesData: DayRides[] = useMemo(() => {
    const ridesMap: Record<string, DayRides["rides"]> = {};

    // Adicionar ofertas
    myOffers.forEach((offer) => {
      if (!ridesMap[offer.data]) {
        ridesMap[offer.data] = [];
      }
      ridesMap[offer.data].push({
        id: offer.id,
        type: "offer",
        time: offer.hora,
        origin: offer.origem,
        destination: offer.destino,
        seats: offer.lugaresDisponiveis,
      });
    });

    // Adicionar pedidos
    myRequests.forEach((request) => {
      if (!ridesMap[request.data]) {
        ridesMap[request.data] = [];
      }
      ridesMap[request.data].push({
        id: request.id,
        type: request.status === "matched" ? "confirmed" : "request",
        time: request.horaMin,
        origin: request.origem,
        destination: request.destino,
      });
    });

    // Converter para array e ordenar por data
    return Object.entries(ridesMap)
      .map(([date, rides]) => ({ date, rides }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [myOffers, myRequests]);

  const [selectedRide, setSelectedRide] = useState<(RideOffer | RideRequest) & { type: "offer" | "request" } | null>(null);
  const [viewingRequests, setViewingRequests] = useState(false);

  const handleRideClick = (ride: any) => {
    setSelectedRide(ride);
    setOpen(true);
  };

  // Obter pedidos recebidos para uma oferta específica
  const getRequestsForOffer = (offerId: string) => {
    const offer = myOffers.find((o) => o.id === offerId);
    if (!offer) return [];
    return offer.pedidos.map((reqId) => requests.find((r) => r.id === reqId)).filter(Boolean) as RideRequest[];
  };

  const handleAcceptRequest = (offerId: string, requestId: string) => {
    acceptRequest(offerId, requestId);
    setOpen(false);
    setSelectedRide(null);
  };

  const handleDeclineRequest = (offerId: string, requestId: string) => {
    declineRequest(offerId, requestId);
  };

  const handleCancelOffer = (offerId: string) => {
    cancelOffer(offerId);
    setOpen(false);
    setSelectedRide(null);
  };

  const handleCancelRequest = (requestId: string) => {
    cancelRequest(requestId);
    setOpen(false);
    setSelectedRide(null);
  };

  return (
    <>
      <div className="relative min-h-screen px-4 pb-28 text-white overflow-hidden">
        {/* Blur effects coloridos */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -left-10 w-[28rem] h-[28rem] bg-pink-500/20 blur-[180px]" />
          <div className="absolute top-32 right-0 w-[24rem] h-[24rem] bg-purple-500/20 blur-[160px]" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[32rem] h-[32rem] bg-amber-200/15 blur-[200px]" />
        </div>
        
        <div className="relative z-10">
        <section className="pt-4 pb-6">
          <h2 className="text-sm font-bold text-white mb-3">Próximas boleias</h2>
          {ridesData.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-white/70 mb-1">Ainda não tens boleias</p>
              <p className="text-xs text-white/50">Usa o botão + para criar uma oferta ou pedido</p>
            </div>
          ) : (
            <>
              {/* TODO: Quando houver API real, adicionar loading state antes do RidesCalendar */}
              <RidesCalendar rides={ridesData} onRideClick={handleRideClick} />
            </>
          )}
        </section>

        {myOffers.length > 0 && (
          <section className="pb-6">
            <h2 className="text-sm font-bold text-white mb-3">As minhas ofertas</h2>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              {myOffers.map((offer) => (
                <EntityCard
                  key={offer.id}
                  title={`${offer.origem} → ${offer.destino}`}
                  subtitle={`${offer.data} às ${offer.hora}`}
                  meta={`${offer.lugaresDisponiveis}/${offer.lugares} lugares  •  ${offer.pedidos.length} pedido${offer.pedidos.length !== 1 ? "s" : ""}`}
                  avatar={{ initials: user?.profile?.name?.charAt(0).toUpperCase() || "U" }}
                  badges={[{ label: "Condutor", tone: "brand" }]}
                  primaryLabel={offer.pedidos.length > 0 ? "Ver pedidos" : "Detalhes"}
                  onPrimary={() => {
                    setSelectedRide({ ...offer, type: "offer" });
                    setOpen(true);
                  }}
                />
              ))}
            </div>
          </section>
        )}

        {myRequests.length > 0 && (
          <section className="pb-6">
            <h2 className="text-sm font-bold text-white mb-3">Os meus pedidos</h2>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              {myRequests.map((request) => (
                <EntityCard
                  key={request.id}
                  title={`${request.origem} → ${request.destino}`}
                  subtitle={`${request.data} • ${request.horaMin}-${request.horaMax}`}
                  meta={`${request.passageiros} passageiro${request.passageiros !== 1 ? "s" : ""}  •  ${request.urgencia}`}
                  avatar={{ initials: user?.profile?.name?.charAt(0).toUpperCase() || "U" }}
                  badges={[
                    {
                      label: request.status === "matched" ? "Confirmado" : request.status === "pending" ? "Pendente" : "Cancelado",
                      tone: request.status === "matched" ? "success" : request.status === "pending" ? "warning" : undefined,
                    },
                  ]}
                  primaryLabel="Detalhes"
                  onPrimary={() => {
                    setSelectedRide({ ...request, type: "request" });
                    setOpen(true);
                  }}
                />
              ))}
            </div>
          </section>
        )}
        </div>
      </div>

      <Sheet
        open={open}
        onClose={() => { 
          setOpen(false); 
          setSelectedRide(null); 
          setViewingRequests(false);
        }}
        title={
          viewingRequests && selectedRide && "type" in selectedRide && selectedRide.type === "offer"
            ? "Pedidos recebidos"
            : selectedRide?.type === "offer"
            ? "Oferta de boleia"
            : selectedRide?.type === "request"
            ? "Pedido de boleia"
            : "Detalhes"
        }
        height="lg"
        footer={
          viewingRequests ? (
            <Button variant="secondary" className="w-full" onClick={() => setViewingRequests(false)}>
              Voltar
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button 
                variant="secondary" 
                className="flex-1" 
                onClick={() => { setOpen(false); setSelectedRide(null); }}
              >
                Fechar
              </Button>
              {selectedRide?.type === "offer" && "pedidos" in selectedRide && selectedRide.pedidos.length > 0 && (
                <Button className="flex-1" onClick={() => setViewingRequests(true)}>
                  Ver pedidos ({selectedRide.pedidos.length})
                </Button>
              )}
              {selectedRide?.type === "offer" && (
                <Button 
                  variant="danger" 
                  className="flex-1" 
                  onClick={() => "id" in selectedRide && handleCancelOffer(selectedRide.id)}
                >
                  Cancelar oferta
                </Button>
              )}
              {selectedRide?.type === "request" && (
                <Button 
                  variant="danger" 
                  className="flex-1" 
                  onClick={() => "id" in selectedRide && handleCancelRequest(selectedRide.id)}
                >
                  Cancelar pedido
                </Button>
              )}
            </div>
          )
        }
      >
        {viewingRequests && selectedRide && "type" in selectedRide && selectedRide.type === "offer" && "id" in selectedRide ? (
          <div className="grid gap-3 p-1">
            {getRequestsForOffer(selectedRide.id).length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-white/70">Sem pedidos ainda</p>
              </div>
            ) : (
              getRequestsForOffer(selectedRide.id).map((request) => (
                <div key={request.id} className="p-4 border border-white/10 bg-white/5 rounded-xl">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {request.origem} → {request.destino}
                      </div>
                      <div className="text-xs text-white/70 mt-1">
                        {request.data} • {request.horaMin}-{request.horaMax}
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      request.status === "matched" 
                        ? "bg-green-500/20 text-green-300 border border-green-500/30" 
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    }`}>
                      {request.status === "matched" ? "Aceite" : "Pendente"}
                    </div>
                  </div>

                  <div className="grid gap-2 mb-3">
                    <div className="text-xs text-white/70">
                      <strong>Passageiros:</strong> {request.passageiros}
                    </div>
                    {request.observacoes && (
                      <div className="text-xs text-white/70">
                        <strong>Observações:</strong> {request.observacoes}
                      </div>
                    )}
                    <div className="text-xs text-white/70">
                      <strong>Contacto:</strong> {request.contacto}
                    </div>
                    {request.requestMessage && (
                      <div className="rounded-lg border border-blue-500/30 bg-blue-500/20 px-3 py-2">
                        <div className="text-xs font-semibold text-blue-300">Mensagem do passageiro</div>
                        <div className="text-sm text-blue-300/80">{request.requestMessage}</div>
                      </div>
                    )}
                  </div>

                  {request.status === "pending" && (
                    <div className="flex gap-2">
                      <Button 
                        variant="secondary" 
                        className="flex-1" 
                        onClick={() => handleDeclineRequest(selectedRide.id, request.id)}
                      >
                        Recusar
                      </Button>
                      <Button 
                        className="flex-1" 
                        onClick={() => handleAcceptRequest(selectedRide.id, request.id)}
                      >
                        Aceitar
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ) : selectedRide && (
          <div className="grid gap-4 p-1">
            <div className="grid gap-2">
              <div className="text-xs font-semibold text-white/70 uppercase">
                {selectedRide.type === "request" ? "Pedido de Boleia" : "Oferta de Boleia"}
              </div>
              <div className="text-xl font-bold text-white">
                {"hora" in selectedRide ? selectedRide.hora : "horaMin" in selectedRide ? `${selectedRide.horaMin}-${selectedRide.horaMax}` : ""}
              </div>
            </div>

            <div className="grid gap-2 p-4 bg-white/5 border border-white/10 rounded-xl">
              <div className="flex items-center gap-2">
                <span className="text-lg">📍</span>
                <div>
                  <div className="text-xs text-white/70">Origem</div>
                  <div className="text-sm font-semibold text-white">{"origem" in selectedRide ? selectedRide.origem : ""}</div>
                </div>
              </div>
              <div className="h-px bg-white/10 my-1" />
              <div className="flex items-center gap-2">
                <span className="text-lg">🎯</span>
                <div>
                  <div className="text-xs text-white/70">Destino</div>
                  <div className="text-sm font-semibold text-white">{"destino" in selectedRide ? selectedRide.destino : ""}</div>
                </div>
              </div>
            </div>

            <div className="grid gap-2 p-4 bg-white/5 border border-white/10 rounded-xl">
              <div className="text-xs text-white/70">Data</div>
              <div className="text-sm font-semibold text-white">{"data" in selectedRide ? selectedRide.data : ""}</div>
            </div>

            {selectedRide.type === "offer" && "lugaresDisponiveis" in selectedRide && (
              <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
                <div className="text-xs text-green-300">
                  <strong>{selectedRide.lugaresDisponiveis}/{("lugares" in selectedRide && selectedRide.lugares) || 0} lugares disponíveis</strong>
                </div>
              </div>
            )}

            {selectedRide.type === "request" && "status" in selectedRide && (
              <div className={`p-3 rounded-lg ${
                selectedRide.status === "matched" ? "bg-green-500/20 border border-green-500/30" : "bg-blue-500/20 border border-blue-500/30"
              }`}>
                <div className={`text-xs ${
                  selectedRide.status === "matched" ? "text-green-300" : "text-blue-300"
                }`}>
                  {selectedRide.status === "matched" 
                    ? "✓ Boleia confirmada!" 
                    : "Pedido pendente • Aguarda confirmação"}
                </div>
              </div>
            )}

            {"observacoes" in selectedRide && selectedRide.observacoes && (
              <div className="grid gap-2">
                <div className="text-xs font-semibold text-white/70">Observações</div>
                <div className="text-sm text-white/80">{selectedRide.observacoes}</div>
              </div>
            )}
          </div>
        )}
      </Sheet>
    </>
  );
}



