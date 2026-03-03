-- Add identity verification fields to User
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "identityDocumentUrl" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "identityDocumentType" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "identityDocumentStatus" TEXT DEFAULT 'NONE';

-- Create Dispute model
CREATE TABLE IF NOT EXISTS "disputes" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "openedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "refundAmount" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "disputes_bookingId_idx" ON "disputes"("bookingId");
CREATE INDEX IF NOT EXISTS "disputes_status_idx" ON "disputes"("status");
CREATE INDEX IF NOT EXISTS "disputes_openedById_idx" ON "disputes"("openedById");

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
