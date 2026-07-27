-- DropIndex
DROP INDEX "WeeklyTactic_objectiveId_weekNumber_key";

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TwelveWeekCycle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "totalWeeks" INTEGER NOT NULL DEFAULT 12,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "closureSummary" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TwelveWeekCycle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TwelveWeekCycle" ("closureSummary", "createdAt", "endDate", "id", "name", "startDate", "status", "userId") SELECT "closureSummary", "createdAt", "endDate", "id", "name", "startDate", "status", "userId" FROM "TwelveWeekCycle";
DROP TABLE "TwelveWeekCycle";
ALTER TABLE "new_TwelveWeekCycle" RENAME TO "TwelveWeekCycle";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
