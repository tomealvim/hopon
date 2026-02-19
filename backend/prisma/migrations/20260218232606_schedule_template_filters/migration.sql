-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_schedule_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "daysOfWeek" TEXT NOT NULL,
    "availableSeats" INTEGER NOT NULL DEFAULT 3,
    "price" REAL,
    "acceptDetours" BOOLEAN NOT NULL DEFAULT true,
    "detourMaxMin" INTEGER NOT NULL DEFAULT 10,
    "meetingPoint" TEXT,
    "notes" TEXT,
    "preferences" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "schedule_templates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "schedule_templates_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_schedule_templates" ("active", "availableSeats", "createdAt", "daysOfWeek", "destination", "id", "origin", "price", "time", "updatedAt", "userId", "vehicleId") SELECT "active", "availableSeats", "createdAt", "daysOfWeek", "destination", "id", "origin", "price", "time", "updatedAt", "userId", "vehicleId" FROM "schedule_templates";
DROP TABLE "schedule_templates";
ALTER TABLE "new_schedule_templates" RENAME TO "schedule_templates";
CREATE INDEX "schedule_templates_userId_idx" ON "schedule_templates"("userId");
CREATE INDEX "schedule_templates_active_idx" ON "schedule_templates"("active");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
