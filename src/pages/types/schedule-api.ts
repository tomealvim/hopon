// API GET /schedules/my e POST /schedules

export interface ApiScheduleVehicle {
  id: string;
  brand: string;
  model: string;
  color?: string;
  imageUrl?: string;
  seats: number;
}

export interface ApiSchedulePreferences {
  musica?: boolean;
  falar?: boolean;
  bagagem?: boolean;
  animais?: boolean;
}

export interface ApiSchedule {
  id: string;
  userId: string;
  vehicleId: string;
  origin: string;
  destination: string;
  time: string;
  daysOfWeek: string[];
  availableSeats: number;
  price: number | null;
  acceptDetours?: boolean;
  detourMaxMin?: number;
  meetingPoint?: string | null;
  notes?: string | null;
  preferences?: ApiSchedulePreferences | null;
  active: boolean;
  vehicle: ApiScheduleVehicle | null;
  createdAt: string;
  updatedAt: string;
}

export type CreateSchedulePayload = {
  vehicleId: string;
  origin: string;
  destination: string;
  time: string;
  daysOfWeek: string[];
  availableSeats: number;
  price?: number;
  acceptDetours?: boolean;
  detourMaxMin?: number;
  meetingPoint?: string;
  notes?: string;
  preferences?: ApiSchedulePreferences;
};

export type CreateRideFromTemplatePayload = {
  departureTime: string; // ISO date string
  availableSeats?: number;
  price?: number;
};
