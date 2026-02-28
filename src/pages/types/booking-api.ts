export interface ApiBooking {
  id: string;
  rideId: string;
  userId: string;
  seats: number;
  status: string; // PENDING | CONFIRMED | DECLINED | CANCELLED | COMPLETED
  createdAt: string;
  updatedAt: string;
  conversationId?: string | null;
  ride: {
    id: string;
    origin: string;
    destination: string;
    departureTime: string;
    availableSeats: number;
    price?: number | null;
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
      isIdentityVerified?: boolean;
      profile?: { name: string; username?: string; avatarUrl?: string } | null;
    } | null;
  } | null;
}
