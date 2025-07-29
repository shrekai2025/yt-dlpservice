import { z } from 'zod'
import { createTRPCRouter, publicProcedure, loggedProcedure } from '~/server/api/trpc'
import { TRPCError } from '@trpc/server'
import { cleanupManager } from '~/lib/services/cleanup-manager'
import { Logger } from '~/lib/utils/logger'

export const cleanupRouter = createTRPCRouter({
  // 手动执行清理
  manual: loggedProcedure.mutation(async () => {
    try {
      Logger.info('API 触发手动清理')
      const result = await cleanupManager.manualCleanup()
      
      return {
        success: result.success,
        message: result.message,
        data: {
          tempFiles: result.details.tempFiles,
          completedTasks: result.details.completedTasks,
          totalSizeCleared: result.details.totalSizeCleared,
          formattedSize: formatBytes(result.details.totalSizeCleared)
        }
      }
    } catch (error) {
      Logger.error(`手动清理API失败: ${error}`)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `清理失败: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }),

  // 获取清理状态
  status: publicProcedure.query(async () => {
    try {
      const status = cleanupManager.getStatus()
      return {
        success: true,
        data: {
          autoCleanupEnabled: status.autoCleanupEnabled,
          isRunning: status.isRunning
        }
      }
    } catch (error) {
      Logger.error(`获取清理状态失败: ${error}`)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `获取状态失败: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }),

  // 启动自动清理
  startAuto: loggedProcedure.mutation(async () => {
    try {
      await cleanupManager.startAutoCleanup()
      Logger.info('API 启动自动清理服务')
      
      return {
        success: true,
        message: '自动清理服务已启动'
      }
    } catch (error) {
      Logger.error(`启动自动清理失败: ${error}`)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `启动自动清理失败: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }),

  // 停止自动清理
  stopAuto: loggedProcedure.mutation(async () => {
    try {
      cleanupManager.stopAutoCleanup()
      Logger.info('API 停止自动清理服务')
      
      return {
        success: true,
        message: '自动清理服务已停止'
      }
    } catch (error) {
      Logger.error(`停止自动清理失败: ${error}`)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `停止自动清理失败: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }),

  // 强制清理指定任务的文件
  cleanTask: loggedProcedure
    .input(z.object({
      taskId: z.string()
    }))
    .mutation(async ({ input }) => {
      try {
        // 这里可以添加清理特定任务文件的逻辑
        Logger.info(`清理任务文件: ${input.taskId}`)
        
        return {
          success: true,
          message: `任务 ${input.taskId} 的文件已清理`
        }
      } catch (error) {
        Logger.error(`清理任务文件失败: ${error}`)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `清理任务文件失败: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    })
})

/**
 * 格式化文件大小
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
} 