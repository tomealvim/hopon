import type { CampusId } from "../pages/types/domain";

export const campuses: { id: CampusId; name: string }[] = [
  { id: "all", name: "Todos os Campi" },
  { id: "ciencias", name: "Ciências" },
  { id: "lusofona", name: "Lusófona" },
  { id: "letras", name: "Letras" },
  { id: "tecnico", name: "Técnico" },
];

export const NAMES = [
  "Rui",
  "Inês",
  "Marta",
  "Gonçalo",
  "Bea",
  "Tomás",
  "Sofia",
  "Diogo",
  "Carla",
  "João",
] as const;

export const ZONES = [
  "Estrela",
  "Benfica",
  "Alcântara",
  "Oeiras",
  "Carnide",
  "Campolide",
] as const;
