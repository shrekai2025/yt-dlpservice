import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '~/server/api/trpc'
import { TRPCError } from '@trpc/server'
import { db } from '~/server/db'
import { 
  createTaskSchema, 
  updateTaskSchema, 
  taskQuerySchema,
  getVideoInfoSchema,
  validateVideoUrl,
  getDownloadTypeDisplayName
} from '~/lib/utils/validation'
import { parseTasksExtraMetadata, parseTaskExtraMetadata } from '~/lib/utils/json'
import { contentDownloader } from '~/lib/services/content-downloader'
import { Logger } from '~/lib/utils/logger'
// 导入全局TaskProcessor实例并确保应用服务已初始化
import { taskProcessor } from '~/lib/init'

export const taskRouter = createTRPCRouter({
  // 创建新任务
  create: publicProcedure
    .input(createTaskSchema)
    .mutation(async ({ input }) => {
      try {
        // 验证URL
        const urlValidation = await validateVideoUrl(input.url)
        if (!urlValidation.isValid) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: urlValidation.error || '不支持的视频URL'
          })
        }

        const platform = urlValidation.platform!
        const normalizedUrl = urlValidation.normalizedUrl || input.url

        // 创建任务
        const task = await db.task.create({
          data: {
            url: normalizedUrl, // 使用标准化后的URL
            platform,
            downloadType: input.downloadType,
            compressionPreset: input.compressionPreset,
            sttProvider: input.sttProvider,
            googleSttLanguage: input.googleSttLanguage,
            status: 'PENDING'
          }
        })

        Logger.info(`创建任务: ${task.id}, URL: ${normalizedUrl}, 下载类型: ${getDownloadTypeDisplayName(input.downloadType)}`)

        // 异步处理任务
        setImmediate(() => {
          taskProcessor.processTask(task.id).catch((error: any) => {
            Logger.error(`异步任务处理失败: ${task.id}, 错误: ${error}`)
          })
        })

        return {
          success: true,
          data: task,
          message: `任务创建成功，下载类型：${getDownloadTypeDisplayName(input.downloadType)}`
        }
      } catch (error) {
        Logger.error(`创建任务失败: ${error}`)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `创建任务失败: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    }),
  
    // 获取任务列表
  list: publicProcedure
    .input(taskQuerySchema)
    .query(async ({ input }) => {
      const { limit, offset, status, platform } = input
      
      const where: any = {}
      if (status) where.status = status
      if (platform) where.platform = platform

      const [tasks, total] = await Promise.all([
        db.task.findMany({
          take: limit,
          skip: offset,
          where,
          orderBy: { createdAt: 'desc' }
        }),
        db.task.count({ where })
      ])
      
      // 安全解析extraMetadata JSON字符串
      const tasksWithParsedMetadata = parseTasksExtraMetadata(tasks)
      
      return {
        data: tasksWithParsedMetadata,
        total
      }
    }),

  // 获取单个任务详情
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const task = await db.task.findUnique({
        where: { id: input.id }
      })
      if (!task) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '任务未找到'
        })
      }
      
      // 安全解析extraMetadata JSON字符串
      return parseTaskExtraMetadata(task)
    }),

  // 更新任务（内部使用）
  update: publicProcedure
    .input(z.object({
      id: z.string(),
      data: updateTaskSchema
    }))
    .mutation(async ({ input }) => {
      const { id, data } = input
      try {
        const updatedTask = await db.task.update({
          where: { id },
          data
        })
        return updatedTask
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '更新任务失败'
        })
      }
    }),
    
  // 删除任务
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const task = await db.task.findUnique({
          where: { id: input.id }
        })

        if (!task) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: '任务不存在'
          })
        }

        await db.task.delete({
          where: { id: input.id }
        })

        Logger.info(`任务删除成功: ${input.id}`)

        return {
          success: true,
          message: '任务删除成功'
        }
      } catch (error) {
        Logger.error(`删除任务失败: ${error}`)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `删除任务失败: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    }),

  // 获取任务统计
  stats: publicProcedure.query(async () => {
    try {
      const [
        total,
        pending,
        extracting,
        transcribing,
        completed,
        failed,
        audioOnly,
        videoOnly,
        both
      ] = await Promise.all([
        db.task.count(),
        db.task.count({ where: { status: 'PENDING' } }),
        db.task.count({ where: { status: 'EXTRACTING' } }),
        db.task.count({ where: { status: 'TRANSCRIBING' } }),
        db.task.count({ where: { status: 'COMPLETED' } }),
        db.task.count({ where: { status: 'FAILED' } }),
        db.task.count({ where: { downloadType: 'AUDIO_ONLY' } }),
        db.task.count({ where: { downloadType: 'VIDEO_ONLY' } }),
        db.task.count({ where: { downloadType: 'BOTH' } })
      ])

      return {
        total,
        byStatus: {
          pending,
          extracting,
          transcribing,
          completed,
          failed
        },
        byDownloadType: {
          audioOnly,
          videoOnly,
          both
        }
      }
    } catch (error) {
      Logger.error(`获取统计信息失败: ${error}`)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `获取统计信息失败: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }),

  // 处理单个任务
  process: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const task = await db.task.findUnique({
          where: { id: input.id }
        })

        if (!task) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: '任务不存在'
          })
        }

        Logger.info(`开始处理任务: ${input.id}, 下载类型: ${getDownloadTypeDisplayName(task.downloadType)}`)

        // 异步处理任务
        taskProcessor.processTask(input.id).catch((error: any) => {
          Logger.error(`任务处理失败: ${input.id}, 错误: ${error}`)
        })

        return {
          success: true,
          message: `任务 ${input.id} 开始处理，下载类型：${getDownloadTypeDisplayName(task.downloadType)}`
        }
      } catch (error) {
        Logger.error(`启动任务处理失败: ${error}`)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `启动任务处理失败: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    }),

  // 批量处理等待中的任务
  processPending: publicProcedure.mutation(async () => {
    try {
      const pendingTasks = await db.task.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        take: 10 // 限制批量处理数量
      })

      if (pendingTasks.length === 0) {
        return {
          success: true,
          message: '暂无等待处理的任务'
        }
      }

      Logger.info(`开始批量处理 ${pendingTasks.length} 个等待任务`)

      // 异步处理所有等待任务
      for (const task of pendingTasks) {
        taskProcessor.processTask(task.id).catch((error: any) => {
          Logger.error(`批量任务处理失败: ${task.id}, 错误: ${error}`)
        })
      }

      return {
        success: true,
        message: `开始批量处理 ${pendingTasks.length} 个任务`
      }
    } catch (error) {
      Logger.error(`批量处理任务失败: ${error}`)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `批量处理任务失败: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }),

  // 获取视频信息
  getVideoInfo: publicProcedure
    .input(getVideoInfoSchema)
    .mutation(async ({ input }) => {
      try {
        // 验证URL
        const urlValidation = await validateVideoUrl(input.url)
        if (!urlValidation.isValid) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: urlValidation.error || '不支持的视频URL'
          })
        }

        const normalizedUrl = urlValidation.normalizedUrl || input.url
        const videoInfo = await contentDownloader.getContentInfo(normalizedUrl)
        
        return {
          success: true,
          data: videoInfo,
          platform: urlValidation.platform
        }
      } catch (error) {
        Logger.error(`获取视频信息失败: ${error}`)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `获取视频信息失败: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    }),

  // 检查下载器可用性
  checkDownloader: publicProcedure.query(async () => {
    try {
      const status = await contentDownloader.checkAvailability()
      return {
        available: status.available,
        version: status.version,
        path: status.path,
        message: status.available ? 'yt-dlp 可用' : 'yt-dlp 不可用'
      }
    } catch (error) {
      Logger.error(`检查下载器失败: ${error}`)
      return {
        available: false,
        message: `检查下载器失败: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  })
}) 