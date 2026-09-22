// Resposta da API GET /rides/search e GET /rides/:id

export interface ApiLocation {
  id: string;
  label: string;
  lat?: number | null;
  lng?: number | null;
  city?: string | null;
}

export interface ApiRideDriver {
  id: string;
  email?: string;
  phone?: string | null;
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
  pickupLat?: number | null;
  pickupLng?: number | null;
  detourMeters?: number | null;
  user?: {
    id: string;
    email: string;
    phone?: string | null;
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
  priceCents?: number | null;
  platformFeeCents?: number | null;
  status: string;
  vehicle: ApiRideVehicle | null;
  driver: ApiRideDriver | null;
  bookings?: ApiRideBooking[];
  createdAt?: string;
  updatedAt?: string;
  arrivedAt?: string | null;
  onTheWayAt?: string | null;
  instantBooking?: boolean;
  meetingPoint?: string | null;
  scheduleTemplateId?: string | null;
  routePolyline?: { lat: number; lng: number }[] | null;
  /** Presente em respostas de /rides/for-you - pontuação de relevância */
  matchScore?: number;
  /** Sobreposição de rota em % (0-100) - presente quando calculável */
  overlapPct?: number;
  /** Secção no smart feed: tomorrow | familiar | this_week */
  section?: 'tomorrow' | 'familiar' | 'this_week';
  /** Comunidade a que pertence a boleia (boleia privada) */
  communityId?: string | null;
  community?: { id: string; name: string } | null;
  /** Comunidade partilhada entre o utilizador e o condutor (badge) */
  sharedCommunity?: { id: string; name: string } | null;
}
