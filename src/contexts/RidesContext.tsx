import { createContext, useContext, useState, useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import type { OfferRideFormValues } from "../components/ui/OfferRideForm";
import type { RequestRideFormValues } from "../components/ui/RequestRideForm";
import { useAuth } from "./AuthContext";

// Tipos para ofertas de boleia
export interface RideOffer {
  id: string;
  userId: string; // quem oferece
  origem: string;
  destino: string;
  data: string;
  hora: string;
  lugares: number;
  lugaresDisponiveis: number;
  aceitaDesvios: boolean;
  desvioMaxMin: number;
  pontoEncontro?: string;
  recorrente: boolean;
  diasSemana: Array<"seg" | "ter" | "qua" | "qui" | "sex">;
  observacoes?: string;
  preferencias: {
    musica: boolean;
    falar: boolean;
    bagagem: boolean;
    animais: boolean;
  };
  createdAt: string;
  status: "active" | "completed" | "cancelled";
  pedidos: string[]; // IDs dos pedidos recebidos
  vehicle: {
    id: string;
    brand: string;
    model: string;
    plate?: string;
    color?: string;
    imageUrl?: string;
  };
}

// Tipos para pedidos de boleia
export interface RideRequest {
  id: string;
  userId: string; // quem pede
  origem: string;
  destino: string;
  data: string;
  horaMin: string;
  horaMax: string;
  passageiros: number;
  aceitaDesvios: boolean;
  desvioMaxMin: number;
  orcamentoMax?: number;
  preferencias: {
    musica: boolean;
    falar: boolean;
    bagagem: boolean;
    animais: boolean;
    fumador: boolean;
  };
  urgencia: "baixa" | "media" | "alta";
  observacoes?: string;
  contacto: string;
  disponibilidade: {
    manha: boolean;
    tarde: boolean;
    noite: boolean;
  };
  createdAt: string;
  status: "pending" | "matched" | "completed" | "cancelled";
  matchedOfferId?: string; // ID da oferta com que fez match
  requestMessage?: string; // mensagem enviada quando pede lugar
}

interface RidesContextValue {
  offers: RideOffer[];
  requests: RideRequest[];
  createOffer: (values: OfferRideFormValues) => RideOffer;
  createRequest: (values: RequestRideFormValues) => RideRequest;
  requestSeatOnOffer: (offerId: string, message?: string) => { request: RideRequest; threadId?: string };
  cancelOffer: (id: string) => void;
  cancelRequest: (id: string) => void;
  addRequestToOffer: (offerId: string, requestId: string) => void;
  acceptRequest: (offerId: string, requestId: string) => void;
  declineRequest: (offerId: string, requestId: string) => void;
  getMyOffers: (userId: string) => RideOffer[];
  getMyRequests: (userId: string) => RideRequest[];
  getAvailableOffers: () => RideOffer[];
  getAvailableRequests: () => RideRequest[];
  getOffersForRequest: (request: RideRequest) => RideOffer[];
  getRequestsForOffer: (offer: RideOffer) => RideRequest[];
  invitePassenger: (offerId: string, requestId: string) => void;
  onCreateThread?: (threadData: { 
    offerId: string; 
    requestId: string; 
    offerUserId: string; // ID do condutor
    origem: string;
    destino: string;
    data: string;
    hora: string;
    message?: string 
  }) => string | undefined;
}

const RidesContext = createContext<RidesContextValue | undefined>(undefined);

const STORAGE_KEY_OFFERS = "hopon_offers";
const STORAGE_KEY_REQUESTS = "hopon_requests";

export function RidesProvider({ children, onCreateThread }: { 
  children: ReactNode; 
  onCreateThread?: (threadData: { 
    offerId: string; 
    requestId: string; 
    offerUserId: string;
    origem: string;
    destino: string;
    data: string;
    hora: string;
    message?: string 
  }) => string | undefined 
}) {
  const { user } = useAuth();
  // Carregar dados do localStorage
  const [offers, setOffers] = useState<RideOffer[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_OFFERS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [requests, setRequests] = useState<RideRequest[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_REQUESTS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Guardar no localStorage quando mudar
  const saveOffers = useCallback((newOffers: RideOffer[]) => {
    setOffers(newOffers);
    localStorage.setItem(STORAGE_KEY_OFFERS, JSON.stringify(newOffers));
  }, []);

  const saveRequests = useCallback((newRequests: RideRequest[]) => {
    setRequests(newRequests);
    localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(newRequests));
  }, []);

  // Criar oferta
  const createOffer = useCallback(
    (values: OfferRideFormValues): RideOffer => {
      if (!user?.id) {
        throw new Error("Utilizador não autenticado");
      }

      const vehicle = user.vehicles?.find(v => v.id === values.vehicleId) ?? null;
      if (!vehicle) {
        throw new Error("Veículo obrigatório para oferecer boleia");
      }
      
      const newOffer: RideOffer = {
        id: `offer_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        userId: user.id,
        origem: values.origem,
        destino: values.destino,
        data: values.data,
        hora: values.hora,
        lugares: values.lugares,
        lugaresDisponiveis: values.lugares,
        aceitaDesvios: values.aceitaDesvios,
        desvioMaxMin: values.desvioMaxMin,
        pontoEncontro: values.pontoEncontro,
        recorrente: values.recorrente,
        diasSemana: values.diasSemana,
        observacoes: values.observacoes,
        preferencias: values.preferencias,
        createdAt: new Date().toISOString(),
        status: "active",
        pedidos: [],
        vehicle: {
          id: vehicle.id,
          brand: vehicle.brand,
          model: vehicle.model,
          plate: vehicle.plate,
          color: vehicle.color,
          imageUrl: vehicle.imageUrl,
        },
      };

      saveOffers([...offers, newOffer]);
      return newOffer;
    },
    [offers, saveOffers, user?.id, user?.vehicles]
  );

  // Criar pedido
  const createRequest = useCallback(
    (values: RequestRideFormValues): RideRequest => {
      if (!user?.id) {
        throw new Error("Utilizador não autenticado");
      }
      
      const newRequest: RideRequest = {
        id: `request_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        userId: user.id,
        origem: values.origem,
        destino: values.destino,
        data: values.data,
        horaMin: values.horaMin,
        horaMax: values.horaMax,
        passageiros: values.passageiros,
        aceitaDesvios: values.aceitaDesvios,
        desvioMaxMin: values.desvioMaxMin,
        orcamentoMax: values.orcamentoMax,
        preferencias: values.preferencias,
      urgencia: values.urgencia,
      observacoes: values.observacoes,
      contacto: values.contacto,
      disponibilidade: values.disponibilidade,
      createdAt: new Date().toISOString(),
      status: "pending",
      requestMessage: undefined,
    };

      saveRequests([...requests, newRequest]);
      return newRequest;
    },
    [requests, saveRequests, user?.id]
  );

  // Cancelar oferta
  const cancelOffer = useCallback(
    (id: string) => {
      saveOffers(offers.map((o) => (o.id === id ? { ...o, status: "cancelled" as const } : o)));
    },
    [offers, saveOffers]
  );

  // Cancelar pedido
  const cancelRequest = useCallback(
    (id: string) => {
      saveRequests(requests.map((r) => (r.id === id ? { ...r, status: "cancelled" as const } : r)));
    },
    [requests, saveRequests]
  );

  // Adicionar pedido a uma oferta (quando alguém pede lugar)
  const addRequestToOffer = useCallback(
    (offerId: string, requestId: string) => {
      saveOffers(
        offers.map((o) =>
          o.id === offerId && !o.pedidos.includes(requestId)
            ? { ...o, pedidos: [...o.pedidos, requestId] }
            : o
        )
      );
    },
    [offers, saveOffers]
  );

  // Pedir lugar numa oferta existente (com mensagem opcional)
  const requestSeatOnOffer = useCallback(
    (offerId: string, message?: string): { request: RideRequest; threadId?: string } => {
      if (!user?.id) {
        throw new Error("Utilizador não autenticado");
      }
      
      const offer = offers.find(o => o.id === offerId);
      if (!offer) {
        throw new Error("Oferta não encontrada");
      }

      const newRequest: RideRequest = {
        id: `request_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        userId: user.id,
        origem: offer.origem,
        destino: offer.destino,
        data: offer.data,
        horaMin: offer.hora,
        horaMax: offer.hora,
        passageiros: 1,
        aceitaDesvios: true,
        desvioMaxMin: 10,
        preferencias: {
          musica: true,
          falar: true,
          bagagem: false,
          animais: false,
          fumador: false,
        },
        urgencia: "media",
        contacto: "",
        disponibilidade: {
          manha: true,
          tarde: false,
          noite: false,
        },
        createdAt: new Date().toISOString(),
        status: "pending",
        requestMessage: message,
      };

      // Adicionar o pedido à oferta
      addRequestToOffer(offerId, newRequest.id);

      // Criar thread na Inbox se callback fornecido
      let threadId: string | undefined;
      if (onCreateThread) {
        threadId = onCreateThread({
          offerId,
          requestId: newRequest.id,
          offerUserId: offer.userId, // ID do condutor da oferta
          origem: offer.origem,
          destino: offer.destino,
          data: offer.data,
          hora: offer.hora,
          message: message
        });
      }

      saveRequests([...requests, newRequest]);
      return { request: newRequest, threadId };
    },
    [offers, requests, saveRequests, addRequestToOffer, onCreateThread, user?.id]
  );

  // Aceitar pedido
  const acceptRequest = useCallback(
    (offerId: string, requestId: string) => {
      // Reduzir lugares disponíveis na oferta
      saveOffers(
        offers.map((o) =>
          o.id === offerId
            ? { ...o, lugaresDisponiveis: Math.max(0, o.lugaresDisponiveis - 1) }
            : o
        )
      );

      // Marcar pedido como matched
      saveRequests(
        requests.map((r) =>
          r.id === requestId
            ? { ...r, status: "matched" as const, matchedOfferId: offerId }
            : r
        )
      );
    },
    [offers, requests, saveOffers, saveRequests]
  );

  // Recusar pedido
  const declineRequest = useCallback(
    (offerId: string, requestId: string) => {
      // Remover pedido da lista de pedidos da oferta
      saveOffers(offers.map((o) => (o.id === offerId ? { ...o, pedidos: o.pedidos.filter((p) => p !== requestId) } : o)));
    },
    [offers, saveOffers]
  );

  // Queries
  const getMyOffers = useCallback(
    (userId: string) => offers.filter((o) => o.userId === userId && o.status === "active"),
    [offers]
  );

  const getMyRequests = useCallback(
    (userId: string) => requests.filter((r) => r.userId === userId && r.status !== "cancelled"),
    [requests]
  );

  const getAvailableOffers = useCallback(
    () => offers.filter((o) => o.status === "active" && o.lugaresDisponiveis > 0),
    [offers]
  );

  const getAvailableRequests = useCallback(
    () => requests.filter((r) => r.status === "pending"),
    [requests]
  );

  // Matching simples: ofertas compatíveis com um pedido
  const getOffersForRequest = useCallback(
    (request: RideRequest) => {
      return offers.filter((offer) => {
        if (offer.status !== "active" || offer.lugaresDisponiveis < request.passageiros) {
          return false;
        }

        // Verificar data
        if (offer.data !== request.data) {
          return false;
        }

        // Verificar hora (simplificado: se a hora da oferta está entre min e max do pedido)
        if (offer.hora < request.horaMin || offer.hora > request.horaMax) {
          return false;
        }

        // Matching básico de origem/destino (contains)
        const matchOrigem =
          offer.origem.toLowerCase().includes(request.origem.toLowerCase()) ||
          request.origem.toLowerCase().includes(offer.origem.toLowerCase());

        const matchDestino =
          offer.destino.toLowerCase().includes(request.destino.toLowerCase()) ||
          request.destino.toLowerCase().includes(offer.destino.toLowerCase());

        return matchOrigem && matchDestino;
      });
    },
    [offers]
  );

  // Matching inverso: pedidos compatíveis com uma oferta
  const getRequestsForOffer = useCallback(
    (offer: RideOffer) => {
      return requests.filter((request) => {
        if (request.status !== "pending" || offer.lugaresDisponiveis < request.passageiros) {
          return false;
        }

        // Verificar data
        if (offer.data !== request.data) {
          return false;
        }

        // Verificar hora (se a hora da oferta está entre min e max do pedido)
        if (offer.hora < request.horaMin || offer.hora > request.horaMax) {
          return false;
        }

        // Matching básico de origem/destino
        const matchOrigem =
          offer.origem.toLowerCase().includes(request.origem.toLowerCase()) ||
          request.origem.toLowerCase().includes(offer.origem.toLowerCase());

        const matchDestino =
          offer.destino.toLowerCase().includes(request.destino.toLowerCase()) ||
          request.destino.toLowerCase().includes(offer.destino.toLowerCase());

        return matchOrigem && matchDestino;
      });
    },
    [requests]
  );

  // Convidar passageiro (condutor convida alguém que fez pedido)
  const invitePassenger = useCallback(
    (offerId: string, requestId: string) => {
      // Adicionar pedido à lista de pedidos da oferta
      addRequestToOffer(offerId, requestId);
    },
    [addRequestToOffer]
  );

  const value = useMemo(
    () => ({
      offers,
      requests,
      createOffer,
      createRequest,
      requestSeatOnOffer,
      cancelOffer,
      cancelRequest,
      addRequestToOffer,
      acceptRequest,
      declineRequest,
      getMyOffers,
      getMyRequests,
      getAvailableOffers,
      getAvailableRequests,
      getOffersForRequest,
      getRequestsForOffer,
      invitePassenger,
    }),
    [
      offers,
      requests,
      createOffer,
      createRequest,
      requestSeatOnOffer,
      cancelOffer,
      cancelRequest,
      addRequestToOffer,
      acceptRequest,
      declineRequest,
      getMyOffers,
      getMyRequests,
      getAvailableOffers,
      getAvailableRequests,
      getOffersForRequest,
      getRequestsForOffer,
      invitePassenger,
    ]
  );

  return <RidesContext.Provider value={value}>{children}</RidesContext.Provider>;
}

export function useRides() {
  const context = useContext(RidesContext);
  if (!context) {
    throw new Error("useRides deve ser usado dentro de RidesProvider");
  }
  return context;
}

