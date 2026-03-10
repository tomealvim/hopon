CREATE TABLE "communities" (
  "id"               TEXT NOT NULL,
  "name"             TEXT NOT NULL,
  "description"      TEXT,
  "logoUrl"          TEXT,
  "ownerId"          TEXT NOT NULL,
  "inviteCode"       TEXT NOT NULL,
  "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
  "domain"           TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL,
  CONSTRAINT "communities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "community_members" (
  "id"          TEXT NOT NULL,
  "communityId" TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "role"        TEXT NOT NULL DEFAULT 'MEMBER',
  "status"      TEXT NOT NULL DEFAULT 'PENDING',
  "joinedAt"    TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "community_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "communities_inviteCode_key" ON "communities"("inviteCode");
CREATE INDEX "communities_ownerId_idx" ON "communities"("ownerId");
CREATE INDEX "communities_inviteCode_idx" ON "communities"("inviteCode");
CREATE UNIQUE INDEX "community_members_communityId_userId_key" ON "community_members"("communityId", "userId");
CREATE INDEX "community_members_userId_idx" ON "community_members"("userId");
CREATE INDEX "community_members_communityId_status_idx" ON "community_members"("communityId", "status");

ALTER TABLE "communities" ADD CONSTRAINT "communities_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "community_members" ADD CONSTRAINT "community_members_communityId_fkey"
  FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "community_members" ADD CONSTRAINT "community_members_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
