-- AlterTable: remove campus column from Location
ALTER TABLE "Location" DROP COLUMN IF EXISTS "campus";
