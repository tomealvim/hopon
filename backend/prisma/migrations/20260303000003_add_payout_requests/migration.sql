CREATE TABLE IF NOT EXISTS "payout_requests" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "amount"    DOUBLE PRECISION NOT NULL,
  "iban"      TEXT NOT NULL,
  "status"    TEXT NOT NULL DEFAULT 'PENDING',
  "adminNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "payout_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payout_requests_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "payout_requests_userId_idx" ON "payout_requests"("userId");
CREATE INDEX IF NOT EXISTS "payout_requests_status_idx" ON "payout_requests"("status");
