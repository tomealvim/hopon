-- Add meetingPoint to rides
ALTER TABLE "rides" ADD COLUMN IF NOT EXISTS "meetingPoint" TEXT;

-- Create recurring_bookings table
CREATE TABLE IF NOT EXISTS "recurring_bookings" (
    "id"                 TEXT NOT NULL,
    "passengerId"        TEXT NOT NULL,
    "scheduleTemplateId" TEXT NOT NULL,
    "seats"              INTEGER NOT NULL DEFAULT 1,
    "status"             TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recurring_bookings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "recurring_bookings_passengerId_scheduleTemplateId_key" UNIQUE ("passengerId", "scheduleTemplateId")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "recurring_bookings_passengerId_idx" ON "recurring_bookings"("passengerId");
CREATE INDEX IF NOT EXISTS "recurring_bookings_scheduleTemplateId_status_idx" ON "recurring_bookings"("scheduleTemplateId", "status");

-- Foreign keys
ALTER TABLE "recurring_bookings" ADD CONSTRAINT "recurring_bookings_passengerId_fkey"
    FOREIGN KEY ("passengerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "recurring_bookings" ADD CONSTRAINT "recurring_bookings_scheduleTemplateId_fkey"
    FOREIGN KEY ("scheduleTemplateId") REFERENCES "schedule_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
