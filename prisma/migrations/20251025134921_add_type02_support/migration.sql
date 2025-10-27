-- AlterTable
ALTER TABLE "studio_shots" ADD COLUMN "compositionPosition" TEXT;
ALTER TABLE "studio_shots" ADD COLUMN "poseExpressionCostume" TEXT;
ALTER TABLE "studio_shots" ADD COLUMN "settingBackground" TEXT;
ALTER TABLE "studio_shots" ADD COLUMN "shotSizeView" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_studio_episodes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "episodeNumber" INTEGER NOT NULL,
    "title" TEXT,
    "type" TEXT NOT NULL DEFAULT 'TYPE01',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "rawInput" TEXT,
    "corePoint" TEXT,
    "objective" TEXT,
    "objectiveLLM" TEXT,
    "systemPrompt" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "archivedAt" DATETIME,
    CONSTRAINT "studio_episodes_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "studio_projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_studio_episodes" ("archivedAt", "corePoint", "createdAt", "episodeNumber", "id", "objective", "objectiveLLM", "projectId", "rawInput", "status", "systemPrompt", "title", "updatedAt") SELECT "archivedAt", "corePoint", "createdAt", "episodeNumber", "id", "objective", "objectiveLLM", "projectId", "rawInput", "status", "systemPrompt", "title", "updatedAt" FROM "studio_episodes";
DROP TABLE "studio_episodes";
ALTER TABLE "new_studio_episodes" RENAME TO "studio_episodes";
CREATE INDEX "studio_episodes_projectId_idx" ON "studio_episodes"("projectId");
CREATE INDEX "studio_episodes_status_idx" ON "studio_episodes"("status");
CREATE UNIQUE INDEX "studio_episodes_projectId_episodeNumber_key" ON "studio_episodes"("projectId", "episodeNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
