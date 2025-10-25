-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_digital_human_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "shotId" TEXT,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "audioUrl" TEXT NOT NULL,
    "maskUrls" TEXT,
    "selectedMaskIndex" INTEGER,
    "prompt" TEXT,
    "seed" INTEGER,
    "peFastMode" BOOLEAN NOT NULL DEFAULT false,
    "enableMultiSubject" BOOLEAN NOT NULL DEFAULT false,
    "stage" TEXT NOT NULL DEFAULT 'FACE_RECOGNITION_SUBMITTED',
    "faceRecognitionTaskId" TEXT,
    "subjectDetectionTaskId" TEXT,
    "videoGenerationTaskId" TEXT,
    "resultVideoUrl" TEXT,
    "aigcMetaTagged" BOOLEAN,
    "errorMessage" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "digital_human_tasks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "digital_human_tasks_shotId_fkey" FOREIGN KEY ("shotId") REFERENCES "studio_shots" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_digital_human_tasks" ("aigcMetaTagged", "audioUrl", "createdAt", "enableMultiSubject", "errorMessage", "faceRecognitionTaskId", "id", "imageUrl", "maskUrls", "metadata", "name", "peFastMode", "prompt", "resultVideoUrl", "seed", "selectedMaskIndex", "stage", "subjectDetectionTaskId", "updatedAt", "userId", "videoGenerationTaskId") SELECT "aigcMetaTagged", "audioUrl", "createdAt", "enableMultiSubject", "errorMessage", "faceRecognitionTaskId", "id", "imageUrl", "maskUrls", "metadata", "name", "peFastMode", "prompt", "resultVideoUrl", "seed", "selectedMaskIndex", "stage", "subjectDetectionTaskId", "updatedAt", "userId", "videoGenerationTaskId" FROM "digital_human_tasks";
DROP TABLE "digital_human_tasks";
ALTER TABLE "new_digital_human_tasks" RENAME TO "digital_human_tasks";
CREATE INDEX "digital_human_tasks_userId_idx" ON "digital_human_tasks"("userId");
CREATE INDEX "digital_human_tasks_shotId_idx" ON "digital_human_tasks"("shotId");
CREATE INDEX "digital_human_tasks_stage_idx" ON "digital_human_tasks"("stage");
CREATE INDEX "digital_human_tasks_createdAt_idx" ON "digital_human_tasks"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
