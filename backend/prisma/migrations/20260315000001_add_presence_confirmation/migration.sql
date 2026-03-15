ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "passengerConfirmed" BOOLEAN;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "passengerConfirmedAt" TIMESTAMP(3);
