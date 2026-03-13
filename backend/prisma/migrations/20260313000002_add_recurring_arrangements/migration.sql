CREATE TABLE IF NOT EXISTS "recurring_arrangements" (
  "id"                 TEXT NOT NULL,
  "driverId"           TEXT NOT NULL,
  "passengerId"        TEXT NOT NULL,
  "scheduleTemplateId" TEXT NOT NULL,
  "status"             TEXT NOT NULL DEFAULT 'PENDING',
  "proposedById"       TEXT NOT NULL,
  "note"               TEXT,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "recurring_arrangements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "recurring_arrangements_driverId_passengerId_scheduleTemplateId_key"
    UNIQUE ("driverId", "passengerId", "scheduleTemplateId"),
  CONSTRAINT "recurring_arrangements_driverId_fkey"
    FOREIGN KEY ("driverId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "recurring_arrangements_passengerId_fkey"
    FOREIGN KEY ("passengerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "recurring_arrangements_scheduleTemplateId_fkey"
    FOREIGN KEY ("scheduleTemplateId") REFERENCES "schedule_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "recurring_arrangements_driverId_idx" ON "recurring_arrangements"("driverId");
CREATE INDEX IF NOT EXISTS "recurring_arrangements_passengerId_idx" ON "recurring_arrangements"("passengerId");
