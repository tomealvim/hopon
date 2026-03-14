ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referralCode" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referredById" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referralPaidAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "users_referralCode_key" ON "users"("referralCode");

ALTER TABLE "users" ADD CONSTRAINT "users_referredById_fkey"
  FOREIGN KEY ("referredById") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
