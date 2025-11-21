// Tipos relacionados com utilizador e perfil

export interface TimeBlock {
  id: string;
  start: string; // formato "HH:mm" ex: "09:00"
  end: string;   // formato "HH:mm" ex: "11:30"
  title?: string; // disciplina, ex.: "PF I-T"
  room?: string;  // sala, ex.: "TA-A127"
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

export interface User {
  id: string;
  email: string;
  profile?: UserProfile;
}

