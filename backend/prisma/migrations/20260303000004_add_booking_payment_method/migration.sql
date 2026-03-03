ALTER TABLE "bookings"
  ADD COLUMN IF NOT EXISTS "paymentMethod"         TEXT NOT NULL DEFAULT 'WALLET',
  ADD COLUMN IF NOT EXISTS "stripePaymentIntentId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "bookings_stripePaymentIntentId_key"
  ON "bookings"("stripePaymentIntentId")
  WHERE "stripePaymentIntentId" IS NOT NULL;
