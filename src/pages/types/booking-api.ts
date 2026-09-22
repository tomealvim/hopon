export interface ApiBooking {
  id: string;
  rideId: string;
  userId: string;
  seats: number;
  status: string; // PENDING | CONFIRMED | DECLINED | CANCELLED | COMPLETED
  passengerConfirmed?: boolean | null;
  passengerConfirmedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  conversationId?: string | null;
  ride: {
    id: string;
    origin: string;
    destination: string;
    departureTime: string;
    availableSeats: number;
    priceCents?: number | null;
    status: string;
    vehicle?: {
      id: string;
      brand: string;
      model: string;
      color?: string;
      imageUrl?: string;
    } | null;
    driver?: {
      id: string;
      email: string;
      phone?: string | null;
      isIdentityVerified?: boolean;
      profile?: { name: string; username?: string; avatarUrl?: string } | null;
    } | null;
  } | null;
}
