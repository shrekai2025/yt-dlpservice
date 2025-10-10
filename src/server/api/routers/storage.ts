/**
 * Storage tRPC Router
 *
 * Handles file upload to S3 storage
 */

import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '~/server/api/trpc'
import { s3Uploader } from '~/lib/adapters/utils/s3-uploader'

export const storageRouter = createTRPCRouter({
  /**
   * Upload file to S3
   * Accepts base64 encoded file data
   */
  uploadFile: publicProcedure
    .input(
      z.object({
        fileData: z.string(), // base64 encoded file data
        fileName: z.string().optional(), // custom filename (without extension)
        pathPrefix: z.string().optional().default('uploads'), // S3 path prefix
        contentType: z.string().optional(), // MIME type
      })
    )
    .mutation(async ({ input }) => {
      // Check if S3 is configured
      if (!s3Uploader.isConfigured()) {
        throw new Error('S3 storage is not configured. Please set AWS environment variables.')
      }

      // Decode base64 to buffer
      const buffer = Buffer.from(input.fileData, 'base64')

      // Upload to S3
      const url = await s3Uploader.uploadBuffer(
        buffer,
        input.pathPrefix,
        input.contentType,
        input.fileName
      )

      return {
        success: true,
        url,
        message: 'File uploaded successfully',
      }
    }),

  /**
   * Upload file from URL to S3
   */
  uploadFromUrl: publicProcedure
    .input(
      z.object({
        sourceUrl: z.string().url(),
        fileName: z.string().optional(),
        pathPrefix: z.string().optional().default('uploads'),
      })
    )
    .mutation(async ({ input }) => {
      // Check if S3 is configured
      if (!s3Uploader.isConfigured()) {
        throw new Error('S3 storage is not configured. Please set AWS environment variables.')
      }

      // Upload from URL
      const url = await s3Uploader.uploadFromUrl(
        input.sourceUrl,
        input.pathPrefix,
        input.fileName
      )

      return {
        success: true,
        url,
        message: 'File uploaded successfully from URL',
      }
    }),

  /**
   * Check S3 configuration status
   */
  getStatus: publicProcedure.query(() => {
    return {
      configured: s3Uploader.isConfigured(),
      message: s3Uploader.isConfigured()
        ? 'S3 storage is configured and ready'
        : 'S3 storage is not configured. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, and AWS_S3_BUCKET.',
    }
  }),
})
