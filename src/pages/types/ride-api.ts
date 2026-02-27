// Resposta da API GET /rides/search e GET /rides/:id

export interface ApiLocation {
  id: string;
  label: string;
  lat?: number | null;
  lng?: number | null;
  city?: string | null;
  campus?: string | null;
}

export interface ApiRideDriver {
  id: string;
  email?: string;
  phone?: string;
  profile?: {
    name: string;
    username?: string;
    avatarUrl?: string;
  } | null;
}

export interface ApiRideVehicle {
  id: string;
  brand: string;
  model: string;
  color?: string;
  imageUrl?: string;
  seats: number;
  features?: Record<string, unknown> | null;
}

export interface ApiRide {
  id: string;
  driverId: string;
  vehicleId: string;
  origin: string;
  destination: string;
  originLocation?: ApiLocation | null;
  destinationLocation?: ApiLocation | null;
  departureTime: string;
  availableSeats: number;
  bookedSeats: number;
  remainingSeats: number;
  price?: number | null;
  status: string;
  vehicle: ApiRideVehicle | null;
  driver: ApiRideDriver | null;
  createdAt?: string;
  updatedAt?: string;
}
