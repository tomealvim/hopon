export type EmailJobName =
  | 'email.otp'
  | 'email.booking-created'
  | 'email.booking-confirmed'
  | 'email.booking-declined'
  | 'email.booking-cancelled'
  | 'email.ride-cancelled'
  | 'email.late-cancel-warning';

export interface OtpEmailPayload {
  to: string;
  code: string;
  purpose: 'email' | 'phone';
  expiryMinutes: number;
}

export interface BookingCreatedEmailPayload {
  driverEmail: string;
  driverName: string;
  passengerName: string;
  origin: string;
  destination: string;
  departureTime: string;
  seats: number;
}

export interface BookingStatusEmailPayload {
  passengerEmail: string;
  passengerName: string;
  origin: string;
  destination: string;
  departureTime: string;
  status: 'CONFIRMED' | 'DECLINED';
}

export interface BookingCancelledEmailPayload {
  driverEmail: string;
  driverName: string;
  passengerName: string;
  origin: string;
  destination: string;
  departureTime: string;
}

export interface RideCancelledEmailPayload {
  userEmail: string;
  userName: string;
  origin: string;
  destination: string;
  departureTime: string;
}

export interface LateCancelWarningEmailPayload {
  userEmail: string;
  userName: string;
  count: number; // número atual de cancelamentos (5)
  windowDays: number; // janela de tempo (30 dias)
}
