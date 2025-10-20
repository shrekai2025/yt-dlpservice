/*
  Warnings:

  - You are about to drop the column `encryptedApiKey` on the `ai_providers` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ai_models" ADD COLUMN "pricingInfo" TEXT;

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "media_files" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "media_files_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "media_files_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "media_folders" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "media_files_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "media_actors" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "media_folders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "media_folders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "media_actors" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "media_actors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "media_tags" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#gray',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "media_tags_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "llm_providers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "apiKey" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "llm_endpoints" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "llm_endpoints_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "llm_providers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "llm_models" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "endpointId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "llm_models_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "llm_endpoints" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_MediaFileToMediaTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_MediaFileToMediaTag_A_fkey" FOREIGN KEY ("A") REFERENCES "media_files" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_MediaFileToMediaTag_B_fkey" FOREIGN KEY ("B") REFERENCES "media_tags" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ai_providers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "platformId" TEXT,
    "apiEndpoint" TEXT,
    "apiKey" TEXT,
    "uploadToS3" BOOLEAN NOT NULL DEFAULT false,
    "s3PathPrefix" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ai_providers_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "ai_platforms" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ai_providers" ("apiEndpoint", "createdAt", "description", "id", "isActive", "name", "platformId", "slug", "sortOrder", "updatedAt") SELECT "apiEndpoint", "createdAt", "description", "id", "isActive", "name", "platformId", "slug", "sortOrder", "updatedAt" FROM "ai_providers";
DROP TABLE "ai_providers";
ALTER TABLE "new_ai_providers" RENAME TO "ai_providers";
CREATE UNIQUE INDEX "ai_providers_slug_key" ON "ai_providers"("slug");
CREATE INDEX "ai_providers_slug_idx" ON "ai_providers"("slug");
CREATE INDEX "ai_providers_isActive_idx" ON "ai_providers"("isActive");
CREATE TABLE "new_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "title" TEXT,
    "status" TEXT NOT NULL,
    "downloadType" TEXT NOT NULL DEFAULT 'AUDIO_ONLY',
    "videoPath" TEXT,
    "audioPath" TEXT,
    "originalVideoPath" TEXT,
    "originalAudioPath" TEXT,
    "transcription" TEXT,
    "tingwuTaskId" TEXT,
    "sttProvider" TEXT,
    "googleSttLanguage" TEXT,
    "enableTranscription" BOOLEAN NOT NULL DEFAULT true,
    "duration" INTEGER,
    "fileSize" INTEGER,
    "thumbnail" TEXT,
    "description" TEXT,
    "compressionPreset" TEXT DEFAULT 'none',
    "originalFileSize" INTEGER,
    "compressedFileSize" INTEGER,
    "compressionRatio" REAL,
    "compressionDuration" INTEGER,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "extraMetadata" TEXT,
    "s3Url" TEXT,
    "s3TransferStatus" TEXT DEFAULT 'none',
    "s3TransferFileType" TEXT DEFAULT 'none',
    "s3TransferProgress" TEXT,
    "s3TransferredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_tasks" ("audioPath", "compressedFileSize", "compressionDuration", "compressionPreset", "compressionRatio", "createdAt", "description", "downloadType", "duration", "errorMessage", "extraMetadata", "fileSize", "googleSttLanguage", "id", "originalFileSize", "platform", "retryCount", "status", "sttProvider", "thumbnail", "tingwuTaskId", "title", "transcription", "updatedAt", "url", "videoPath") SELECT "audioPath", "compressedFileSize", "compressionDuration", "compressionPreset", "compressionRatio", "createdAt", "description", "downloadType", "duration", "errorMessage", "extraMetadata", "fileSize", "googleSttLanguage", "id", "originalFileSize", "platform", "retryCount", "status", "sttProvider", "thumbnail", "tingwuTaskId", "title", "transcription", "updatedAt", "url", "videoPath" FROM "tasks";
DROP TABLE "tasks";
ALTER TABLE "new_tasks" RENAME TO "tasks";
CREATE INDEX "tasks_status_idx" ON "tasks"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "media_files_userId_idx" ON "media_files"("userId");

-- CreateIndex
CREATE INDEX "media_files_folderId_idx" ON "media_files"("folderId");

-- CreateIndex
CREATE INDEX "media_files_actorId_idx" ON "media_files"("actorId");

-- CreateIndex
CREATE INDEX "media_files_type_idx" ON "media_files"("type");

-- CreateIndex
CREATE INDEX "media_files_source_idx" ON "media_files"("source");

-- CreateIndex
CREATE INDEX "media_folders_userId_idx" ON "media_folders"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "media_folders_userId_name_key" ON "media_folders"("userId", "name");

-- CreateIndex
CREATE INDEX "media_actors_userId_idx" ON "media_actors"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "media_actors_userId_name_key" ON "media_actors"("userId", "name");

-- CreateIndex
CREATE INDEX "media_tags_userId_idx" ON "media_tags"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "media_tags_userId_name_key" ON "media_tags"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "llm_providers_slug_key" ON "llm_providers"("slug");

-- CreateIndex
CREATE INDEX "llm_providers_slug_idx" ON "llm_providers"("slug");

-- CreateIndex
CREATE INDEX "llm_providers_isActive_idx" ON "llm_providers"("isActive");

-- CreateIndex
CREATE INDEX "llm_endpoints_providerId_idx" ON "llm_endpoints"("providerId");

-- CreateIndex
CREATE INDEX "llm_endpoints_isActive_idx" ON "llm_endpoints"("isActive");

-- CreateIndex
CREATE INDEX "llm_models_endpointId_idx" ON "llm_models"("endpointId");

-- CreateIndex
CREATE INDEX "llm_models_isActive_idx" ON "llm_models"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "llm_models_endpointId_slug_key" ON "llm_models"("endpointId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "_MediaFileToMediaTag_AB_unique" ON "_MediaFileToMediaTag"("A", "B");

-- CreateIndex
CREATE INDEX "_MediaFileToMediaTag_B_index" ON "_MediaFileToMediaTag"("B");
