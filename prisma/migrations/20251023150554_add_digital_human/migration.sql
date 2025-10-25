-- AlterTable
ALTER TABLE "ai_providers" ADD COLUMN "apiKeyId" TEXT;
ALTER TABLE "ai_providers" ADD COLUMN "apiKeySecret" TEXT;

-- AlterTable
ALTER TABLE "media_actors" ADD COLUMN "appearancePrompt" TEXT;
ALTER TABLE "media_actors" ADD COLUMN "referenceImageUrl" TEXT;
ALTER TABLE "media_actors" ADD COLUMN "tags" TEXT;
ALTER TABLE "media_actors" ADD COLUMN "voiceId" TEXT;

-- CreateTable
CREATE TABLE "digital_human_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
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
    CONSTRAINT "digital_human_tasks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "chat_conversations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "systemInstruction" TEXT,
    "enableWebSearch" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chat_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "chat_conversations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "studio_projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT NOT NULL,
    "config" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "studio_projects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "studio_episodes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "episodeNumber" INTEGER NOT NULL,
    "title" TEXT,
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

-- CreateTable
CREATE TABLE "studio_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "episodeId" TEXT NOT NULL,
    "era" TEXT,
    "genre" TEXT,
    "visualStyle" TEXT,
    "referenceImages" TEXT,
    "stylePrompt" TEXT,
    "lightingPrompt" TEXT,
    "colorPrompt" TEXT,
    "customPrompts" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "studio_settings_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "studio_episodes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "studio_characters" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sourceActorId" TEXT,
    "sourceEpisodeId" TEXT,
    "appearancePrompt" TEXT,
    "referenceImage" TEXT,
    "voiceId" TEXT,
    "metadata" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "studio_characters_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "studio_projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "studio_characters_sourceActorId_fkey" FOREIGN KEY ("sourceActorId") REFERENCES "media_actors" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "studio_characters_sourceEpisodeId_fkey" FOREIGN KEY ("sourceEpisodeId") REFERENCES "studio_episodes" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "studio_shots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "episodeId" TEXT NOT NULL,
    "shotNumber" INTEGER NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "scenePrompt" TEXT,
    "actionPrompt" TEXT,
    "cameraPrompt" TEXT,
    "dialogue" TEXT,
    "duration" REAL,
    "extendedAudioUrl" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "studio_shots_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "studio_episodes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "studio_shot_characters" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shotId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "dialogue" TEXT,
    "position" TEXT,
    "action" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "studio_shot_characters_shotId_fkey" FOREIGN KEY ("shotId") REFERENCES "studio_shots" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "studio_shot_characters_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "studio_characters" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "studio_frames" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shotId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "taskId" TEXT,
    "inputImages" TEXT,
    "parameters" TEXT,
    "resultUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "isSelected" BOOLEAN NOT NULL DEFAULT false,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "studio_frames_shotId_fkey" FOREIGN KEY ("shotId") REFERENCES "studio_shots" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "studio_frames_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "ai_models" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "studio_frames_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ai_generation_tasks" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ai_generation_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "modelId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "inputImages" TEXT,
    "numberOfOutputs" INTEGER NOT NULL DEFAULT 1,
    "parameters" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "progress" REAL,
    "results" TEXT,
    "errorMessage" TEXT,
    "providerTaskId" TEXT,
    "requestPayload" TEXT,
    "responsePayload" TEXT,
    "durationMs" INTEGER,
    "shotId" TEXT,
    "costUSD" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    "deletedAt" DATETIME,
    CONSTRAINT "ai_generation_tasks_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "ai_models" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ai_generation_tasks_shotId_fkey" FOREIGN KEY ("shotId") REFERENCES "studio_shots" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ai_generation_tasks" ("completedAt", "createdAt", "deletedAt", "durationMs", "errorMessage", "id", "inputImages", "modelId", "numberOfOutputs", "parameters", "progress", "prompt", "providerTaskId", "requestPayload", "responsePayload", "results", "status", "updatedAt") SELECT "completedAt", "createdAt", "deletedAt", "durationMs", "errorMessage", "id", "inputImages", "modelId", "numberOfOutputs", "parameters", "progress", "prompt", "providerTaskId", "requestPayload", "responsePayload", "results", "status", "updatedAt" FROM "ai_generation_tasks";
DROP TABLE "ai_generation_tasks";
ALTER TABLE "new_ai_generation_tasks" RENAME TO "ai_generation_tasks";
CREATE INDEX "ai_generation_tasks_status_idx" ON "ai_generation_tasks"("status");
CREATE INDEX "ai_generation_tasks_modelId_idx" ON "ai_generation_tasks"("modelId");
CREATE INDEX "ai_generation_tasks_createdAt_idx" ON "ai_generation_tasks"("createdAt");
CREATE INDEX "ai_generation_tasks_deletedAt_idx" ON "ai_generation_tasks"("deletedAt");
CREATE INDEX "ai_generation_tasks_shotId_idx" ON "ai_generation_tasks"("shotId");
CREATE TABLE "new_llm_endpoints" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'openai',
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "llm_endpoints_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "llm_providers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_llm_endpoints" ("createdAt", "description", "id", "isActive", "name", "providerId", "sortOrder", "updatedAt", "url") SELECT "createdAt", "description", "id", "isActive", "name", "providerId", "sortOrder", "updatedAt", "url" FROM "llm_endpoints";
DROP TABLE "llm_endpoints";
ALTER TABLE "new_llm_endpoints" RENAME TO "llm_endpoints";
CREATE INDEX "llm_endpoints_providerId_idx" ON "llm_endpoints"("providerId");
CREATE INDEX "llm_endpoints_isActive_idx" ON "llm_endpoints"("isActive");
CREATE UNIQUE INDEX "llm_endpoints_providerId_name_key" ON "llm_endpoints"("providerId", "name");
CREATE TABLE "new_media_files" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "remark" TEXT,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "localPath" TEXT,
    "originalPath" TEXT,
    "thumbnailPath" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "duration" REAL,
    "folderId" TEXT,
    "actorId" TEXT,
    "starred" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "media_files_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "media_actors" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "media_files_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "media_folders" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "media_files_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_media_files" ("actorId", "createdAt", "duration", "fileSize", "folderId", "height", "id", "localPath", "mimeType", "name", "originalPath", "remark", "source", "sourceUrl", "thumbnailPath", "type", "updatedAt", "userId", "width") SELECT "actorId", "createdAt", "duration", "fileSize", "folderId", "height", "id", "localPath", "mimeType", "name", "originalPath", "remark", "source", "sourceUrl", "thumbnailPath", "type", "updatedAt", "userId", "width" FROM "media_files";
DROP TABLE "media_files";
ALTER TABLE "new_media_files" RENAME TO "media_files";
CREATE INDEX "media_files_userId_idx" ON "media_files"("userId");
CREATE INDEX "media_files_folderId_idx" ON "media_files"("folderId");
CREATE INDEX "media_files_actorId_idx" ON "media_files"("actorId");
CREATE INDEX "media_files_type_idx" ON "media_files"("type");
CREATE INDEX "media_files_source_idx" ON "media_files"("source");
CREATE INDEX "media_files_starred_idx" ON "media_files"("starred");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "digital_human_tasks_userId_idx" ON "digital_human_tasks"("userId");

-- CreateIndex
CREATE INDEX "digital_human_tasks_stage_idx" ON "digital_human_tasks"("stage");

-- CreateIndex
CREATE INDEX "digital_human_tasks_createdAt_idx" ON "digital_human_tasks"("createdAt");

-- CreateIndex
CREATE INDEX "chat_conversations_updatedAt_idx" ON "chat_conversations"("updatedAt");

-- CreateIndex
CREATE INDEX "chat_messages_conversationId_createdAt_idx" ON "chat_messages"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "studio_projects_slug_key" ON "studio_projects"("slug");

-- CreateIndex
CREATE INDEX "studio_projects_userId_idx" ON "studio_projects"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "studio_projects_userId_slug_key" ON "studio_projects"("userId", "slug");

-- CreateIndex
CREATE INDEX "studio_episodes_projectId_idx" ON "studio_episodes"("projectId");

-- CreateIndex
CREATE INDEX "studio_episodes_status_idx" ON "studio_episodes"("status");

-- CreateIndex
CREATE UNIQUE INDEX "studio_episodes_projectId_episodeNumber_key" ON "studio_episodes"("projectId", "episodeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "studio_settings_episodeId_key" ON "studio_settings"("episodeId");

-- CreateIndex
CREATE INDEX "studio_settings_episodeId_idx" ON "studio_settings"("episodeId");

-- CreateIndex
CREATE INDEX "studio_characters_projectId_idx" ON "studio_characters"("projectId");

-- CreateIndex
CREATE INDEX "studio_characters_sourceActorId_idx" ON "studio_characters"("sourceActorId");

-- CreateIndex
CREATE INDEX "studio_characters_sourceEpisodeId_idx" ON "studio_characters"("sourceEpisodeId");

-- CreateIndex
CREATE UNIQUE INDEX "studio_characters_projectId_name_key" ON "studio_characters"("projectId", "name");

-- CreateIndex
CREATE INDEX "studio_shots_episodeId_idx" ON "studio_shots"("episodeId");

-- CreateIndex
CREATE UNIQUE INDEX "studio_shots_episodeId_shotNumber_key" ON "studio_shots"("episodeId", "shotNumber");

-- CreateIndex
CREATE INDEX "studio_shot_characters_shotId_idx" ON "studio_shot_characters"("shotId");

-- CreateIndex
CREATE INDEX "studio_shot_characters_characterId_idx" ON "studio_shot_characters"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "studio_shot_characters_shotId_characterId_key" ON "studio_shot_characters"("shotId", "characterId");

-- CreateIndex
CREATE INDEX "studio_frames_shotId_idx" ON "studio_frames"("shotId");

-- CreateIndex
CREATE INDEX "studio_frames_modelId_idx" ON "studio_frames"("modelId");

-- CreateIndex
CREATE INDEX "studio_frames_taskId_idx" ON "studio_frames"("taskId");

-- CreateIndex
CREATE INDEX "studio_frames_status_idx" ON "studio_frames"("status");

-- CreateIndex
CREATE UNIQUE INDEX "studio_frames_shotId_type_version_key" ON "studio_frames"("shotId", "type", "version");
