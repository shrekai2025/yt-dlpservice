-- AlterTable: Rename encryptedApiKey to apiKey and add S3 config fields
ALTER TABLE "ai_providers" RENAME COLUMN "encryptedApiKey" TO "apiKey";

-- AlterTable: Add S3 configuration fields
ALTER TABLE "ai_providers" ADD COLUMN "uploadToS3" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ai_providers" ADD COLUMN "s3PathPrefix" TEXT;

