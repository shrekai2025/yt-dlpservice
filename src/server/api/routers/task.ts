import { z } from 'zod'
import { createTRPCRouter, publicProcedure, loggedProcedure } from '~/server/api/trpc'
import { TRPCError } from '@trpc/server'
import { db } from '~/server/db'
import { 
  createTaskSchema, 
  updateTaskSchema, 
  taskQuerySchema, 
  idSchema, 
  getVideoInfoSchema,
  isValidStatusTransition,
  validateVideoUrl,
  getPlatformFromUrl,
  getDownloadTypeDisplayName
} from '~/lib/utils/validation'
import { TaskProcessor } from '~/lib/services/task-processor'
import { videoDownloader } from '~/lib/services/video-downloader'
import { Logger } from '~/lib/utils/logger'
// 确保应用服务已初始化
import '~/lib/init'

const taskProcessor = new TaskProcessor()

export const taskRouter = createTRPCRouter({
  // 创建新任务
  create: publicProcedure
    .input(createTaskSchema)
    .mutation(async ({ input }) => {
      try {
        // 验证URL和获取平台信息
        const urlValidation = validateVideoUrl(input.url)
        if (!urlValidation.isValid) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: urlValidation.error || '不支持的视频URL'
          })
        }

        const platform = urlValidation.platform!
        const downloadType = input.downloadType || 'AUDIO_ONLY'

        // 创建任务（允许重复URL）
        const task = await db.task.create({
          data: {
            url: input.url,
            platform,
            downloadType,
            status: 'PENDING'
          }
        })

        Logger.info(`新任务创建成功: ${task.id}, URL: ${input.url}, 下载类型: ${getDownloadTypeDisplayName(downloadType)}`)

        return {
          success: true,
          data: task,
          message: `任务创建成功，下载类型：${getDownloadTypeDisplayName(downloadType)}`
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
      try {
        const { limit, offset, orderBy, orderDirection, status, platform, downloadType } = input
        
        const where = {
          ...(status && { status }),
          ...(platform && { platform }),
          ...(downloadType && { downloadType })
        }

        const [tasks, total] = await Promise.all([
          db.task.findMany({
            where,
            orderBy: { [orderBy]: orderDirection },
            take: limit,
            skip: offset
          }),
          db.task.count({ where })
        ])

        return {
          data: tasks,
          pagination: {
            total,
            page: Math.floor(offset / limit) + 1,
            limit,
            hasMore: offset + limit < total
          }
        }
      } catch (error) {
        Logger.error(`获取任务列表失败: ${error}`)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `获取任务列表失败: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    }),

  // 根据ID获取任务
  getById: publicProcedure
    .input(idSchema)
    .query(async ({ input }) => {
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

        return { data: task }
      } catch (error) {
        Logger.error(`获取任务失败: ${error}`)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `获取任务失败: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    }),

  // 更新任务
  update: loggedProcedure
    .input(updateTaskSchema)
    .mutation(async ({ input }) => {
      try {
        const { id, ...updateData } = input

        // 检查任务是否存在
        const existingTask = await db.task.findUnique({
          where: { id }
        })

        if (!existingTask) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: '任务不存在'
          })
        }

        // 验证状态转换
        if (updateData.status && !isValidStatusTransition(existingTask.status, updateData.status)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `不能从状态 ${existingTask.status} 切换到 ${updateData.status}`
          })
        }

        const updatedTask = await db.task.update({
          where: { id },
          data: updateData
        })

        Logger.info(`任务更新成功: ${id}`)

        return {
          success: true,
          data: updatedTask,
          message: '任务更新成功'
        }
      } catch (error) {
        Logger.error(`更新任务失败: ${error}`)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `更新任务失败: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    }),

  // 删除任务
  delete: loggedProcedure
    .input(idSchema)
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
  process: loggedProcedure
    .input(idSchema)
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
        taskProcessor.processTask(input.id).catch(error => {
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
  processPending: loggedProcedure.mutation(async () => {
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
        taskProcessor.processTask(task.id).catch(error => {
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
    .query(async ({ input }) => {
      try {
        // 验证URL
        const urlValidation = validateVideoUrl(input.url)
        if (!urlValidation.isValid) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: urlValidation.error || '不支持的视频URL'
          })
        }

        const videoInfo = await videoDownloader.getVideoInfo(input.url)
        
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
      const status = await videoDownloader.checkAvailability()
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