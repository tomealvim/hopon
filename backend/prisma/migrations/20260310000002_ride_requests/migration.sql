CREATE TABLE "ride_requests" (
  "id"             TEXT NOT NULL,
  "passengerId"    TEXT NOT NULL,
  "origin"         TEXT NOT NULL,
  "originLat"      DOUBLE PRECISION,
  "originLng"      DOUBLE PRECISION,
  "destination"    TEXT NOT NULL,
  "destinationLat" DOUBLE PRECISION,
  "destinationLng" DOUBLE PRECISION,
  "departTime"     TEXT NOT NULL,
  "daysOfWeek"     JSONB NOT NULL,
  "status"         TEXT NOT NULL DEFAULT 'OPEN',
  "note"           TEXT,
  "expiresAt"      TIMESTAMP(3) NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ride_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ride_requests_passengerId_idx" ON "ride_requests"("passengerId");
CREATE INDEX "ride_requests_status_idx" ON "ride_requests"("status");

ALTER TABLE "ride_requests" ADD CONSTRAINT "ride_requests_passengerId_fkey"
  FOREIGN KEY ("passengerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
