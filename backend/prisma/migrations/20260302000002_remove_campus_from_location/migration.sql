-- AlterTable: remove campus column from Location
ALTER TABLE "locations" DROP COLUMN IF EXISTS "campus";
