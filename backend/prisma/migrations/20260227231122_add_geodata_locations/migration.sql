-- AlterTable
ALTER TABLE "rides" ADD COLUMN     "destinationLocationId" TEXT,
ADD COLUMN     "originLocationId" TEXT;

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "placeId" TEXT,
    "city" TEXT,
    "campus" TEXT,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "rides" ADD CONSTRAINT "rides_originLocationId_fkey" FOREIGN KEY ("originLocationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rides" ADD CONSTRAINT "rides_destinationLocationId_fkey" FOREIGN KEY ("destinationLocationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
