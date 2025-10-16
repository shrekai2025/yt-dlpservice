/**
 * Storage Admin tRPC Router
 *
 * Provides admin interface for managing storage files
 */

import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '~/server/api/trpc'
import { s3Uploader } from '~/lib/services/s3-uploader'

export const storageAdminRouter = createTRPCRouter({
  /**
   * List all storage files with pagination
   */
  listFiles: publicProcedure
    .input(
      z.object({
        page: z.number().min(1).optional().default(1),
        pageSize: z.number().min(1).max(100).optional().default(50),
      }).optional().default({})
    )
    .query(async ({ ctx, input }) => {
      const page = input?.page ?? 1
      const pageSize = input?.pageSize ?? 50
      const skip = (page - 1) * pageSize

      const [files, total] = await Promise.all([
        ctx.db.storageFile.findMany({
          take: pageSize,
          skip,
          orderBy: { createdAt: 'desc' },
        }),
        ctx.db.storageFile.count(),
      ])

      return {
        files,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      }
    }),

  /**
   * Delete only database record
   */
  deleteRecord: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.storageFile.delete({
        where: { id: input.id },
      })

      return { success: true, message: 'Record deleted successfully' }
    }),

  /**
   * Delete both database record and S3 file
   */
  deleteRecordAndFile: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get file info
      const file = await ctx.db.storageFile.findUnique({
        where: { id: input.id },
      })

      if (!file) {
        throw new Error('File not found')
      }

      // Delete from AWS S3
      try {
        await s3Uploader.deleteFile(file.s3Key)
        console.log(`Successfully deleted S3 file: ${file.s3Key}`)
      } catch (error) {
        console.error(`Failed to delete S3 file: ${file.s3Key}`, error)
        // 继续删除数据库记录，即使S3删除失败
      }

      // Delete from database
      await ctx.db.storageFile.delete({
        where: { id: input.id },
      })

      return { success: true, message: 'Record and S3 file deleted successfully' }
    }),
})
