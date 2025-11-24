// Tipos relacionados com utilizador e perfil

export interface TimeBlock {
  id: string;
  start: string; // formato "HH:mm" ex: "09:00"
  end: string;   // formato "HH:mm" ex: "11:30"
  title?: string; // destino/descrição, ex.: "Trabalho", "IST"
  room?: string;  // local específico, ex.: "Edifício A, Sala 127"
}

export interface DaySchedule {
  day: "segunda" | "terca" | "quarta" | "quinta" | "sexta" | "sabado";
  blocks: TimeBlock[];
}

export interface UserSchedule {
  days: DaySchedule[];
}

export interface UserProfile {
  name: string;
  username?: string;
  phone: string;
  contactEmail?: string;
  avatarUrl?: string;
  address: string; // morada/zona de partida ou "Casa"
  schedule: UserSchedule;
  createdAt: string;
}

export interface VehicleFeatures {
  airConditioning: boolean;
  heater: boolean;
}

export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  plate?: string;
  color?: string;
  imageUrl?: string;
  features: VehicleFeatures;
  createdAt: string;
  updatedAt: string;
}

export interface UserVerification {
  email: boolean;
  phone: boolean;
}

export interface User {
  id: string;
  email: string;
  profile?: UserProfile;
  vehicles?: Vehicle[];
  activeVehicleId?: string;
  verification?: UserVerification;
}

