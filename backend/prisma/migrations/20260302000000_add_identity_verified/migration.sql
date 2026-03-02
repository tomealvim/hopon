-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isIdentityVerified" BOOLEAN NOT NULL DEFAULT false;
