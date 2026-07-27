-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Vision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "whereIWantToBe" TEXT NOT NULL DEFAULT '',
    "whoIWantToBe" TEXT NOT NULL DEFAULT '',
    "whatIWantToAchieve" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Vision_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LifebookCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "currentBeliefs" TEXT NOT NULL DEFAULT '',
    "idealVision" TEXT NOT NULL DEFAULT '',
    "whyIWantIt" TEXT NOT NULL DEFAULT '',
    "howIWillAchieveIt" TEXT NOT NULL DEFAULT '',
    "linkedVision3" BOOLEAN NOT NULL DEFAULT false,
    "linkedVision5" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LifebookCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TwelveWeekCycle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "closureSummary" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TwelveWeekCycle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Objective" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cycleId" TEXT NOT NULL,
    "lifebookCategoryId" TEXT,
    "name" TEXT NOT NULL,
    "lagMeasure" TEXT NOT NULL DEFAULT '',
    "leadMeasure" TEXT NOT NULL DEFAULT '',
    "linkedVision3" BOOLEAN NOT NULL DEFAULT false,
    "linkedVision5" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Objective_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "TwelveWeekCycle" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Objective_lifebookCategoryId_fkey" FOREIGN KEY ("lifebookCategoryId") REFERENCES "LifebookCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WeeklyTactic" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "objectiveId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "completed" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "WeeklyTactic_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "Objective" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WeeklyReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cycleId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "whatWorked" TEXT NOT NULL DEFAULT '',
    "whatDidntWork" TEXT NOT NULL DEFAULT '',
    "whatIAdjust" TEXT NOT NULL DEFAULT '',
    "whoIReport" TEXT NOT NULL DEFAULT '',
    "executionScore" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WeeklyReview_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "TwelveWeekCycle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Habit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "cycleId" TEXT,
    "name" TEXT NOT NULL,
    "scheduledTime" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "stackedAfter" TEXT,
    "makeItObvious" TEXT NOT NULL DEFAULT '',
    "makeItAttractive" TEXT NOT NULL DEFAULT '',
    "makeItEasy" TEXT NOT NULL DEFAULT '',
    "makeItSatisfying" TEXT NOT NULL DEFAULT '',
    "startWeek" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Habit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Habit_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "TwelveWeekCycle" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HabitLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "habitId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    CONSTRAINT "HabitLog_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MonthlyReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "lifebookCategoryId" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MonthlyReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MonthlyReview_lifebookCategoryId_fkey" FOREIGN KEY ("lifebookCategoryId") REFERENCES "LifebookCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CycleClosure" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cycleId" TEXT NOT NULL,
    "achievedResults" TEXT NOT NULL DEFAULT '',
    "learnings" TEXT NOT NULL DEFAULT '',
    "executionPercent" REAL NOT NULL DEFAULT 0,
    "objectivesToRepeat" TEXT NOT NULL DEFAULT '[]',
    "objectivesToDiscard" TEXT NOT NULL DEFAULT '[]',
    "autoSummary" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CycleClosure_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "TwelveWeekCycle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StudyTopic" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudyTopic_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StudyFront" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "topicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudyFront_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "StudyTopic" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StudyNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "frontId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mentalImage" TEXT,
    "flashcard" TEXT,
    "mentalImageEdited" BOOLEAN NOT NULL DEFAULT false,
    "aiPromptUsed" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StudyNote_frontId_fkey" FOREIGN KEY ("frontId") REFERENCES "StudyFront" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SpacedRepetitionEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "noteId" TEXT NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "easeFactor" REAL NOT NULL DEFAULT 2.5,
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "nextReviewDate" DATETIME NOT NULL,
    "lastReviewDate" DATETIME,
    CONSTRAINT "SpacedRepetitionEntry_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "StudyNote" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RepetitionLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entryId" TEXT NOT NULL,
    "reviewDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quality" INTEGER NOT NULL,
    "newInterval" INTEGER NOT NULL,
    CONSTRAINT "RepetitionLog_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "SpacedRepetitionEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "dailyChecklistTime" TEXT NOT NULL DEFAULT '08:00',
    "weeklyReviewDay" INTEGER NOT NULL DEFAULT 0,
    "weeklyReviewTime" TEXT NOT NULL DEFAULT '18:00',
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "openaiApiKey" TEXT,
    "aiPromptTemplate" TEXT NOT NULL DEFAULT 'Genera una imagen mental memorable (escena visual concreta y vívida, máximo 3 líneas) y una pregunta de repaso tipo flashcard para esta nota. No inventes datos que no estén en el texto. Responde en el mismo idioma de la nota. Formato exacto de respuesta:
IMAGEN_MENTAL: [descripción]
FLASHCARD: [pregunta]',
    CONSTRAINT "AppSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Vision_userId_type_key" ON "Vision"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "LifebookCategory_userId_slug_key" ON "LifebookCategory"("userId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyTactic_objectiveId_weekNumber_key" ON "WeeklyTactic"("objectiveId", "weekNumber");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyReview_cycleId_weekNumber_key" ON "WeeklyReview"("cycleId", "weekNumber");

-- CreateIndex
CREATE UNIQUE INDEX "HabitLog_habitId_date_key" ON "HabitLog"("habitId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "CycleClosure_cycleId_key" ON "CycleClosure"("cycleId");

-- CreateIndex
CREATE UNIQUE INDEX "SpacedRepetitionEntry_noteId_key" ON "SpacedRepetitionEntry"("noteId");

-- CreateIndex
CREATE UNIQUE INDEX "AppSettings_userId_key" ON "AppSettings"("userId");
