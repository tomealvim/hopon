// Tipos de filtros do Discover – simples e backend-friendly
export type DiscoverFilters = {
  q: string;

  // Rota & proximidade
  origin?: string;          // simplificado para string; podes trocar por {id, lat, lng}
  destination?: string;
  deviationKm: number;      // 0..10
  routeOverlapPct: number;  // 0..100

  // Tempo
  date?: string;            // "YYYY-MM-DD" — dia específico (vazio = qualquer dia)
  departFrom?: string;      // "08:00"
  departTo?: string;        // "10:00"
  toleranceMin: number;     // 0..20

  // Capacidade & conforto
  minSeats: number;         // 1..4
  baggage: "any" | "backpack" | "carry_on" | "large";
  ac: boolean;
  vibe: "any" | "quiet" | "chatty";
  music: boolean;

  // Reputação
  minRating: number;        // 3.5..5
  punctuality: "any" | "med" | "high";
  frequent: boolean;
  verified: boolean;

  // Acessibilidade
  accessible: boolean;
  backSeatsFree: boolean;

  // Preço (se aplicável)
  maxPrice?: number;

  // Ordenação
  sort: "recommended" | "nearby" | "earliest" | "shortest" | "rating";
  
  // UI Chips
  chips: string[];
};

export const defaultFilters: DiscoverFilters = {
  q: "",
  origin: "",
  destination: "",
  deviationKm: 0,
  routeOverlapPct: 60,

  date: "",
  departFrom: "",
  departTo: "",
  toleranceMin: 5,

  minSeats: 1,
  baggage: "any",
  ac: false,
  vibe: "any",
  music: false,

  minRating: 4.0,
  punctuality: "any",
  frequent: false,
  verified: false,

  accessible: false,
  backSeatsFree: false,

  maxPrice: undefined,

  sort: "recommended",
  chips: [],
};