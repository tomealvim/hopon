-- 1. reports - CREATE TABLE, indexes, foreign keys
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "reports_targetId_idx" ON "reports"("targetId");

CREATE INDEX "reports_status_idx" ON "reports"("status");

ALTER TABLE "reports" ADD CONSTRAINT "reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reports" ADD CONSTRAINT "reports_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. bookings_stripePaymentIntentId_key - REMOVIDO: este indice unico parcial ja existe
-- desde a migration 20260303000004_add_booking_payment_method (CREATE UNIQUE INDEX
-- IF NOT EXISTS ... WHERE "stripePaymentIntentId" IS NOT NULL). O prisma migrate diff
-- deu um falso positivo por nao representar bem indices parciais (WHERE) ao reconstruir
-- o estado a partir das migrations. Confirmado ao tentar aplicar em hopon_test: erro
-- 42P07 "relation already exists".

-- 3. ALTER COLUMN "updatedAt" DROP DEFAULT
ALTER TABLE "payout_requests" ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "recurring_arrangements" ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "recurring_bookings" ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "ride_requests" ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "user_routes" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- 4. DROP INDEX orfao
DROP INDEX "rides_communityId_idx";

-- 5. RENAME INDEX em recurring_arrangements
ALTER INDEX "recurring_arrangements_driverId_passengerId_scheduleTemplateId_" RENAME TO "recurring_arrangements_driverId_passengerId_scheduleTemplat_key";
