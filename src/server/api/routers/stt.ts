import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '~/server/api/trpc'
import { TRPCError } from '@trpc/server'
import { db } from '~/server/db'
import { Logger } from '~/lib/utils/logger'

export const sttRouter = createTRPCRouter({
  // 获取STT任务列表
  listJobs: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(10),
      offset: z.number().min(0).default(0),
      status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']).optional(),
    }))
    .query(async ({ input }) => {
      const { limit, offset, status } = input

      const where: any = {}
      if (status) where.status = status

      try {
        const [jobs, total] = await Promise.all([
          db.sttJob.findMany({
            take: limit,
            skip: offset,
            where,
            orderBy: { createdAt: 'desc' }
          }),
          db.sttJob.count({ where })
        ])

        return {
          data: jobs,
          total,
          hasMore: offset + jobs.length < total
        }
      } catch (error) {
        Logger.error(`获取STT任务列表失败: ${error}`)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `获取任务列表失败: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    }),

  // 获取单个STT任务详情
  getJob: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      try {
        const job = await db.sttJob.findUnique({
          where: { id: input.id }
        })

        if (!job) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: '任务未找到'
          })
        }

        return job
      } catch (error) {
        Logger.error(`获取STT任务详情失败: ${error}`)
        if (error instanceof TRPCError) throw error
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `获取任务详情失败: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    }),

  // 获取STT任务统计
  stats: publicProcedure.query(async () => {
    try {
      const [
        total,
        pending,
        processing,
        completed,
        failed
      ] = await Promise.all([
        db.sttJob.count(),
        db.sttJob.count({ where: { status: 'PENDING' } }),
        db.sttJob.count({ where: { status: 'PROCESSING' } }),
        db.sttJob.count({ where: { status: 'COMPLETED' } }),
        db.sttJob.count({ where: { status: 'FAILED' } })
      ])

      return {
        total,
        byStatus: {
          pending,
          processing,
          completed,
          failed
        }
      }
    } catch (error) {
      Logger.error(`获取STT统计信息失败: ${error}`)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `获取统计信息失败: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  })
})
