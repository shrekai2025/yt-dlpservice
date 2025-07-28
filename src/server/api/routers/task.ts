import { z } from 'zod'
import { TRPCError } from '@trpc/server'

import { createTRPCRouter, publicProcedure, loggedProcedure } from '~/server/api/trpc'
import { 
  createTaskSchema, 
  updateTaskSchema, 
  taskQuerySchema,
  validateVideoUrl,
  getPlatformFromUrl,
  isValidStatusTransition
} from '~/lib/utils/validation'
import { TaskStatus } from '@prisma/client'
import { TaskProcessor } from '~/lib/services/task-processor'
import { VideoDownloader } from '~/lib/services/video-downloader'

export const taskRouter = createTRPCRouter({
  /**
   * 创建任务 - 只入库，不开始处理
   */
  create: loggedProcedure
    .input(z.object({
      url: z.string().url('请输入有效的URL'),
    }))
    .mutation(async ({ ctx, input }) => {
      // 验证URL是否来自支持的平台
      const urlValidation = validateVideoUrl(input.url)
      if (!urlValidation.isValid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: urlValidation.error || '不支持的视频平台',
        })
      }

      const platform = getPlatformFromUrl(input.url)
      if (!platform) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '无法识别视频平台',
        })
      }

      // 允许重复URL任务 - 已移除重复检查
      
      // 创建新任务
      const task = await ctx.db.task.create({
        data: {
          url: input.url,
          platform,
          status: TaskStatus.PENDING,
        },
      })

      return task
    }),

  /**
   * 获取任务列表
   */
  list: loggedProcedure
    .input(taskQuerySchema.optional())
    .query(async ({ ctx, input = {} }) => {
      const {
        page = 1,
        limit = 20,
        status,
        platform,
        orderBy = 'createdAt',
        orderDirection = 'desc',
      } = input

      const where = {
        ...(status && { status }),
        ...(platform && { platform }),
      }

      const [tasks, total] = await Promise.all([
        ctx.db.task.findMany({
          where,
          orderBy: { [orderBy]: orderDirection },
          skip: (page - 1) * limit,
          take: limit,
        }),
        ctx.db.task.count({ where }),
      ])

      const totalPages = Math.ceil(total / limit)

      return {
        tasks,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasMore: page < totalPages,
        },
      }
    }),

  /**
   * 根据ID获取任务详情
   */
  getById: loggedProcedure
    .input(z.object({
      id: z.string().min(1, '任务ID不能为空'),
    }))
    .query(async ({ ctx, input }) => {
      const task = await ctx.db.task.findUnique({
        where: { id: input.id },
      })

      if (!task) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `任务 ${input.id} 不存在`,
        })
      }

      return task
    }),

  /**
   * 更新任务状态和信息
   */
  update: loggedProcedure
    .input(updateTaskSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input

      // 验证任务是否存在
      const existingTask = await ctx.db.task.findUnique({
        where: { id },
      })

      if (!existingTask) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `任务 ${id} 不存在`,
        })
      }

      // 验证状态流转是否合法
      if (updateData.status && !isValidStatusTransition(existingTask.status, updateData.status)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `不能从状态 ${existingTask.status} 切换到 ${updateData.status}`,
        })
      }

      // 更新任务
      const updatedTask = await ctx.db.task.update({
        where: { id },
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
      })

      return updatedTask
    }),

  /**
   * 删除任务
   */
  delete: loggedProcedure
    .input(z.object({
      id: z.string().min(1, '任务ID不能为空'),
    }))
    .mutation(async ({ ctx, input }) => {
      // 验证任务是否存在
      const task = await ctx.db.task.findUnique({
        where: { id: input.id },
      })

      if (!task) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `任务 ${input.id} 不存在`,
        })
      }

      // 删除任务
      await ctx.db.task.delete({
        where: { id: input.id },
      })

      return { success: true, message: '任务删除成功' }
    }),

  /**
   * 获取任务统计信息
   */
  stats: loggedProcedure
    .query(async ({ ctx }) => {
      const [
        total,
        pending,
        processing,
        completed,
        failed,
      ] = await Promise.all([
        ctx.db.task.count(),
        ctx.db.task.count({ where: { status: TaskStatus.PENDING } }),
        ctx.db.task.count({ 
          where: { 
            status: { 
              in: [
                TaskStatus.DOWNLOADING, 
                TaskStatus.EXTRACTING, 
                TaskStatus.UPLOADING, 
                TaskStatus.TRANSCRIBING
              ] 
            } 
          } 
        }),
        ctx.db.task.count({ where: { status: TaskStatus.COMPLETED } }),
        ctx.db.task.count({ where: { status: TaskStatus.FAILED } }),
      ])

      return {
        total,
        pending,
        processing,
        completed,
        failed,
      }
    }),

  /**
   * 手动处理指定任务
   */
  process: loggedProcedure
    .input(z.object({
      id: z.string().min(1, '任务ID不能为空'),
    }))
    .mutation(async ({ input }) => {
      try {
        const taskProcessor = TaskProcessor.getInstance()
        await taskProcessor.processTask(input.id)
        
        return { 
          success: true, 
          message: `任务 ${input.id} 处理完成` 
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : '任务处理失败',
        })
      }
    }),

  /**
   * 批量处理等待中的任务
   */
  processPending: loggedProcedure
    .mutation(async () => {
      try {
        const taskProcessor = TaskProcessor.getInstance()
        await taskProcessor.processPendingTasks()
        
        return { 
          success: true, 
          message: '批量处理完成' 
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : '批量处理失败',
        })
      }
    }),

  /**
   * 获取视频信息（不下载）
   */
  getVideoInfo: loggedProcedure
    .input(z.object({
      url: z.string().url('请输入有效的URL'),
    }))
    .query(async ({ input }) => {
      // 验证URL是否来自支持的平台
      const urlValidation = validateVideoUrl(input.url)
      if (!urlValidation.isValid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: urlValidation.error || '不支持的视频平台',
        })
      }

      try {
        const videoDownloader = VideoDownloader.getInstance()
        const videoInfo = await videoDownloader.getVideoInfo(input.url)
        
        return videoInfo
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : '获取视频信息失败',
        })
      }
    }),

  /**
   * 检查视频下载器状态
   */
  checkDownloader: publicProcedure
    .query(async () => {
      try {
        const downloader = VideoDownloader.getInstance()
        const status = await downloader.checkAvailability()
        
        return {
          available: status.available,
          version: status.version,
          path: status.path,
          message: status.available ? '下载器可用' : '下载器不可用'
        }
      } catch (error) {
        // Logger.error(`Failed to check downloader: ${error}`) // Assuming Logger is available
        return {
          available: false,
          path: 'unknown',
          message: `检查下载器失败: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      }
    })
}) 