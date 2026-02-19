-- CreateTable
CREATE TABLE "schedule_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "daysOfWeek" TEXT NOT NULL,
    "availableSeats" INTEGER NOT NULL DEFAULT 3,
    "price" REAL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "schedule_templates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "schedule_templates_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_rides" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "driverId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "departureTime" DATETIME NOT NULL,
    "availableSeats" INTEGER NOT NULL,
    "price" REAL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "scheduleTemplateId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "rides_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "rides_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "rides_scheduleTemplateId_fkey" FOREIGN KEY ("scheduleTemplateId") REFERENCES "schedule_templates" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_rides" ("availableSeats", "createdAt", "departureTime", "destination", "driverId", "id", "origin", "price", "status", "updatedAt", "vehicleId") SELECT "availableSeats", "createdAt", "departureTime", "destination", "driverId", "id", "origin", "price", "status", "updatedAt", "vehicleId" FROM "rides";
DROP TABLE "rides";
ALTER TABLE "new_rides" RENAME TO "rides";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "schedule_templates_userId_idx" ON "schedule_templates"("userId");

-- CreateIndex
CREATE INDEX "schedule_templates_active_idx" ON "schedule_templates"("active");
