import { db } from '~/server/db'
import { TaskStatus } from '@prisma/client'
import { VideoDownloader } from './video-downloader'
import { Logger } from '~/lib/utils/logger'
import { ConfigManager } from '~/lib/utils/config'
import { promises as fs } from 'fs'

export class TaskProcessor {
  private static instance: TaskProcessor
  private videoDownloader: VideoDownloader

  constructor() {
    this.videoDownloader = VideoDownloader.getInstance()
  }

  static getInstance(): TaskProcessor {
    if (!TaskProcessor.instance) {
      TaskProcessor.instance = new TaskProcessor()
    }
    return TaskProcessor.instance
  }

  /**
   * 处理单个任务
   */
  async processTask(taskId: string): Promise<void> {
    Logger.info(`开始处理任务: ${taskId}`)
    
    try {
      // Ensure temp directory exists before any file operations
      const config = await ConfigManager.getTyped();
      await fs.mkdir(config.tempDir, { recursive: true });

      // 获取任务信息
      const task = await db.task.findUnique({
        where: { id: taskId },
      })

      if (!task) {
        throw new Error(`Task ${taskId} not found`)
      }

      Logger.info(`处理任务 ${taskId}: ${task.url}`)

      // 更新任务状态为处理中
      await this.updateTaskStatus(taskId, 'DOWNLOADING')

      // 获取视频信息
      Logger.info(`获取视频信息: ${task.url}`)
      const videoInfo = await this.videoDownloader.getVideoInfo(task.url)
      
      // 更新任务标题
      await db.task.update({
        where: { id: taskId },
        data: { 
          title: videoInfo.title,
          updatedAt: new Date()
        }
      })

      // 检查是否需要认证（从视频信息中判断）
      if (videoInfo.originalData?.error === 'Authentication required') {
        Logger.warn(`任务 ${taskId} 的视频需要认证，但自动登录流程可能已经处理`)
        
        // 如果仍然需要认证，标记任务为失败
        if (videoInfo.originalData?.authAttempted) {
          await this.updateTaskStatus(taskId, 'FAILED', '视频需要认证且自动登录失败')
          return
        }
      }

      // 下载视频
      Logger.info(`开始下载视频: ${task.url}`)
      const videoPath = await this.videoDownloader.downloadVideo(task.url, {
        taskId: taskId,
      })

      // 更新任务状态和视频路径
      await db.task.update({
        where: { id: taskId },
        data: { 
          videoPath: videoPath,
          status: 'EXTRACTING' 
        },
      })

      // 提取音频
      Logger.info(`开始提取音频: ${task.url}`)
      await this.updateTaskStatus(taskId, 'EXTRACTING')
      const audioPath = await this.videoDownloader.downloadAudio(task.url, {
        taskId: taskId,
      })

      // 更新任务状态和音频路径
      await db.task.update({
        where: { id: taskId },
        data: { 
          audioPath: audioPath,
          status: 'TRANSCRIBING',
          updatedAt: new Date()
        }
      })

      Logger.info(`音频提取完成: ${audioPath}`)

      // TODO: 接下来集成通义听悟API进行语音转文字
      // 目前先标记为完成
      await this.updateTaskStatus(taskId, 'COMPLETED')
      
      Logger.info(`任务 ${taskId} 处理完成`)

    } catch (error) {
      Logger.error(`任务 ${taskId} 处理失败: ${error}`)
      
      // 检查错误类型，提供更详细的错误信息
      let errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      if (errorMessage.includes('Authentication required')) {
        errorMessage = 'YouTube 视频需要登录认证，请确保已在专用浏览器中登录'
      } else if (errorMessage.includes('Private video')) {
        errorMessage = '私人视频，无法访问'
      } else if (errorMessage.includes('Video unavailable')) {
        errorMessage = '视频不可用'
      }
      
      await this.updateTaskStatus(taskId, 'FAILED', errorMessage)
      
      // 清理可能的临时文件
      try {
        const config = await ConfigManager.getTyped()
        await this.videoDownloader.cleanupFiles(config.tempDir, 0) // 立即清理
      } catch (cleanupError) {
        Logger.warn(`清理临时文件时出错: ${cleanupError}`)
      }
    }
  }

  /**
   * 更新任务状态
   */
  private async updateTaskStatus(
    taskId: string, 
    status: TaskStatus, 
    errorMessage?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        updatedAt: new Date(),
      }

      if (status === TaskStatus.COMPLETED) {
        updateData.completedAt = new Date()
      }

      if (errorMessage) {
        updateData.errorMessage = errorMessage
      }

      await db.task.update({
        where: { id: taskId },
        data: updateData
      })

      Logger.info(`Task ${taskId} status updated to: ${status}`)
    } catch (error) {
      Logger.error(`Failed to update task ${taskId} status: ${error}`)
      throw error
    }
  }

  /**
   * 批量处理等待中的任务
   */
  async processPendingTasks(): Promise<void> {
    try {
      const config = await ConfigManager.getTyped()
      
      // 获取等待中的任务
      const pendingTasks = await db.task.findMany({
        where: { status: TaskStatus.PENDING },
        orderBy: { createdAt: 'asc' },
        take: config.maxConcurrentTasks
      })

      if (pendingTasks.length === 0) {
        Logger.info('No pending tasks to process')
        return
      }

      Logger.info(`Processing ${pendingTasks.length} pending tasks`)

      // 并发处理任务（但有限制）
      const promises = pendingTasks.map(task => 
        this.processTask(task.id).catch(error => {
          Logger.error(`Failed to process task ${task.id}: ${error}`)
        })
      )

      await Promise.all(promises)
      
      Logger.info('Batch processing completed')
    } catch (error) {
      Logger.error(`Batch processing failed: ${error}`)
      throw error
    }
  }

  /**
   * 清理过期的已完成任务文件
   */
  async cleanupExpiredFiles(): Promise<void> {
    try {
      const config = await ConfigManager.getTyped()
      const cutoffTime = new Date(Date.now() - config.maxFileAgeHours * 60 * 60 * 1000)

      // 查找过期的已完成任务
      const expiredTasks = await db.task.findMany({
        where: {
          status: TaskStatus.COMPLETED,
          completedAt: {
            lt: cutoffTime
          },
          OR: [
            { videoPath: { not: null } },
            { audioPath: { not: null } }
          ]
        }
      })

      Logger.info(`Found ${expiredTasks.length} expired tasks to cleanup`)

      for (const task of expiredTasks) {
        try {
          // 清理文件
          await this.videoDownloader.cleanupFiles(task.id)
          
          // 清除数据库中的文件路径
          await db.task.update({
            where: { id: task.id },
            data: {
              videoPath: null,
              audioPath: null,
              updatedAt: new Date()
            }
          })

          Logger.info(`Cleaned up files for task ${task.id}`)
        } catch (error) {
          Logger.error(`Failed to cleanup task ${task.id}: ${error}`)
        }
      }
    } catch (error) {
      Logger.error(`Cleanup process failed: ${error}`)
      throw error
    }
  }

  /**
   * 检查视频下载器是否可用
   */
  async checkVideoDownloaderAvailability(): Promise<boolean> {
    const status = await this.videoDownloader.checkAvailability()
    return status.available
  }
} 