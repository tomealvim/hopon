CREATE TABLE IF NOT EXISTS "user_routes" (
  "id"          TEXT        NOT NULL,
  "userId"      TEXT        NOT NULL,
  "origin"      TEXT        NOT NULL,
  "destination" TEXT        NOT NULL,
  "departTime"  TEXT        NOT NULL,
  "daysOfWeek"  JSONB       NOT NULL,
  "active"      BOOLEAN     NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_routes_pkey" PRIMARY KEY ("id"),
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "user_routes_userId_idx" ON "user_routes"("userId");
