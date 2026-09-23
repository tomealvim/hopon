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
  contactEmail?: string;
  avatarUrl?: string;
  address?: string; // legacy - usar homeAddress
  homeAddress?: string;
  homeLat?: number;
  homeLng?: number;
  schedule: UserSchedule;
  createdAt: string;
  setupCompleted?: boolean;
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
  seats?: number;
  fuelType?: 'gasolina95' | 'gasoleo' | 'gpl' | 'eletrico' | 'hibrido';
  avgConsumption?: number;
  features: VehicleFeatures;
  createdAt: string;
  updatedAt: string;
}

export interface UserVerification {
  email: boolean;
  phone: boolean;
  driverLicense?: string; // NONE | PENDING | APPROVED | REJECTED
  identity?: string;      // NONE | PENDING | VERIFIED | REJECTED
}

export interface UserReliability {
  score: number | null;   // 0-100, null = menos de 3 viagens
  label: string;          // 'Excelente' | 'Bom' | 'Regular' | 'Baixo' | 'Novo condutor'
  totalRides: number;
  cancelledRides: number;
}

export interface User {
  id: string;
  email: string;
  phone?: string;
  profile?: UserProfile;
  vehicles?: Vehicle[];
  activeVehicleId?: string;
  verification?: UserVerification;
  isIdentityVerified?: boolean;
  identityDocumentStatus?: string | null;
  driverLicenseStatus?: string | null;
  driverLicenseAdminNote?: string | null;
  isAdmin?: boolean;
  reliability?: UserReliability;
  pushPreferences?: {
    messages?: boolean;
    bookings?: boolean;
    rides?: boolean;
    matches?: boolean;
  } | null;
}

