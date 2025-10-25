/**
 * Digital Human tRPC Router
 *
 * 即梦数字人快速版 API 路由
 */

import { z } from 'zod'
import { createTRPCRouter, userProcedure } from '~/server/api/trpc'
import { TRPCError } from '@trpc/server'
import { DigitalHumanService } from '~/lib/services/digital-human/digital-human-service'
import { db } from '~/server/db'
import type { CredentialsSource } from '~/lib/services/digital-human/jimeng-client'

/**
 * 获取即梦 provider 的凭证配置
 */
async function getJimengCredentials(): Promise<CredentialsSource | undefined> {
  // 从数据库获取即梦 provider 配置
  const jimengProvider = await db.aIProvider.findFirst({
    where: {
      slug: 'jimeng',
    },
    select: {
      apiKey: true,
      apiKeyId: true,
      apiKeySecret: true,
    },
  })

  if (!jimengProvider) {
    return undefined
  }

  return {
    apiKey: jimengProvider.apiKey,
    apiKeyId: jimengProvider.apiKeyId,
    apiKeySecret: jimengProvider.apiKeySecret,
  }
}

/**
 * 创建数字人任务服务实例（懒加载）
 */
async function getDigitalHumanService() {
  const credentials = await getJimengCredentials()
  return new DigitalHumanService(credentials)
}

export const digitalHumanRouter = createTRPCRouter({
  /**
   * 创建数字人任务
   */
  createTask: userProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        imageUrl: z.string().url(),
        audioUrl: z.string().url(),
        prompt: z.string().max(500).optional(),
        seed: z.number().int().min(-1).max(999999999).optional(),
        peFastMode: z.boolean().default(false),
        enableMultiSubject: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId!

      // 创建并启动任务
      const service = await getDigitalHumanService()
      const task = await service.createTask({
        userId,
        ...input,
      })

      return task
    }),

  /**
   * 获取单个任务详情
   */
  getTask: userProcedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.userId!

      const service = await getDigitalHumanService()
      const task = await service.getTask(input.taskId)

      // 检查任务归属
      if (task.userId !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: '无权访问此任务',
        })
      }

      return task
    }),

  /**
   * 获取用户的任务列表
   */
  getUserTasks: userProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.userId!

      const service = await getDigitalHumanService()
      const tasks = await service.getUserTasks(userId)

      // 简单分页
      const start = (input.page - 1) * input.limit
      const end = start + input.limit
      const paginatedTasks = tasks.slice(start, end)

      return {
        tasks: paginatedTasks,
        total: tasks.length,
        page: input.page,
        limit: input.limit,
        totalPages: Math.ceil(tasks.length / input.limit),
      }
    }),

  /**
   * 选择主体并继续视频生成（多主体模式）
   */
  selectSubject: userProcedure
    .input(
      z.object({
        taskId: z.string(),
        maskIndex: z.number().int().min(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId!

      const service = await getDigitalHumanService()

      // 先检查任务归属
      const task = await service.getTask(input.taskId)
      if (task.userId !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: '无权访问此任务',
        })
      }

      // 检查任务状态
      if (task.stage !== 'AWAITING_SUBJECT_SELECTION') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '任务不在等待主体选择状态',
        })
      }

      // 检查mask索引是否有效
      const maskUrls = task.maskUrls
      if (!maskUrls || !Array.isArray(maskUrls)) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '主体检测数据异常',
        })
      }

      if (input.maskIndex >= maskUrls.length) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '选择的主体索引超出范围',
        })
      }

      // 继续视频生成
      await service.selectSubjectAndContinue(input.taskId, input.maskIndex)

      return { success: true }
    }),

  /**
   * 删除任务
   */
  deleteTask: userProcedure
    .input(z.object({ taskId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId!

      const service = await getDigitalHumanService()

      // 先检查任务归属
      const task = await service.getTask(input.taskId)
      if (task.userId !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: '无权访问此任务',
        })
      }

      // 检查任务是否可以删除
      if (task.stage === 'VIDEO_GENERATION_PROCESSING') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '任务正在生成中，无法删除',
        })
      }

      await service.deleteTask(input.taskId)

      return { success: true }
    }),

  /**
   * 验证音频时长限制（<35秒）
   */
  validateAudioDuration: userProcedure
    .input(z.object({ audioUrl: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      // TODO: 实现音频时长检测逻辑
      // 可以通过 HTTP HEAD 获取音频文件的时长信息
      // 或者下载临时文件并使用 ffmpeg 检测时长

      // 暂时返回有效，实际使用时需要实现真实的检测逻辑
      return {
        isValid: true,
        duration: null, // 秒数，未知时为null
        maxDuration: 35,
      }
    }),
})