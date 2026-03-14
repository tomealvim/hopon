-- AddColumn: communityId optional on rides (private ride for a community)
ALTER TABLE "rides" ADD COLUMN IF NOT EXISTS "communityId" TEXT;
ALTER TABLE "rides" ADD CONSTRAINT "rides_communityId_fkey"
  FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "rides_communityId_idx" ON "rides"("communityId");
