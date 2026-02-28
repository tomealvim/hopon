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
  isIdentityVerified?: boolean;
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

export interface ApiRideBooking {
  id: string;
  userId: string;
  seats: number;
  status: string;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    profile?: { name: string; username?: string; avatarUrl?: string } | null;
  } | null;
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
  bookings?: ApiRideBooking[];
  createdAt?: string;
  updatedAt?: string;
  /** Presente em respostas de /rides/for-you — pontuação de relevância */
  matchScore?: number;
}
