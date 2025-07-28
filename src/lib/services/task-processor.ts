import { db } from '~/server/db'
import { Logger } from '~/lib/utils/logger'
import { VideoDownloader } from './video-downloader'
import type { TaskStatus, DownloadType } from '~/types/task'
import path from 'path'
import fs from 'fs/promises'

export class TaskProcessor {
  private videoDownloader: VideoDownloader

  constructor() {
    this.videoDownloader = new VideoDownloader()
  }

  /**
   * 处理单个任务
   */
  async processTask(taskId: string): Promise<void> {
    try {
      Logger.info(`开始处理任务: ${taskId}`)

      // 获取任务信息
      const task = await db.task.findUnique({
        where: { id: taskId }
      })

      if (!task) {
        throw new Error(`任务 ${taskId} 不存在`)
      }

      if (task.status !== 'PENDING') {
        Logger.warn(`任务 ${taskId} 状态为 ${task.status}，跳过处理`)
        return
      }

      // 创建临时目录
      const tempDir = `/tmp/yt-dlpservice`
      await fs.mkdir(tempDir, { recursive: true })

      const outputDir = path.join(tempDir, taskId)
      await fs.mkdir(outputDir, { recursive: true })

      // 更新状态为下载中
      await this.updateTaskStatus(taskId, 'DOWNLOADING')

      // 根据下载类型进行相应处理
      const downloadResult = await this.handleDownloadByType(task.url, task.downloadType, outputDir)

      // 更新任务的文件路径
      await db.task.update({
        where: { id: taskId },
        data: {
          videoPath: downloadResult.videoPath,
          audioPath: downloadResult.audioPath,
          status: this.determineNextStatus(task.downloadType)
        }
      })

      Logger.info(`任务 ${taskId} 下载完成，类型: ${this.getDownloadTypeDisplayName(task.downloadType)}`)

      // 如果下载类型包含音频且需要转录，则继续处理
      if (task.downloadType === 'AUDIO_ONLY' || task.downloadType === 'BOTH') {
        if (downloadResult.audioPath) {
          await this.processAudioTranscription(taskId, downloadResult.audioPath)
        }
      } else {
        // 仅视频下载，直接标记为完成
        await this.updateTaskStatus(taskId, 'COMPLETED')
      }

    } catch (error) {
      Logger.error(`任务处理失败: ${taskId}, 错误: ${error}`)
      
      // 确定错误类型并设置相应的错误信息
      let errorMessage = error instanceof Error ? error.message : 'Unknown error'
      if (errorMessage.includes('Authentication required')) {
        errorMessage = 'YouTube 视频需要登录认证，请确保已在专用浏览器中登录'
      } else if (errorMessage.includes('Private video')) {
        errorMessage = '私人视频，无法访问'
      } else if (errorMessage.includes('Video unavailable')) {
        errorMessage = '视频不可用'
      } else if (errorMessage.includes('Members-only content')) {
        errorMessage = '会员专享内容，需要相应权限'
      }

      await this.updateTaskStatus(taskId, 'FAILED', errorMessage)

      // 清理临时文件
      try {
        const tempDir = `/tmp/yt-dlpservice/${taskId}`
        await fs.rmdir(tempDir, { recursive: true })
      } catch (cleanupError) {
        Logger.warn(`清理临时文件失败: ${cleanupError}`)
      }
    }
  }

  /**
   * 根据下载类型处理下载
   */
  private async handleDownloadByType(
    url: string, 
    downloadType: DownloadType, 
    outputDir: string
  ): Promise<{ videoPath?: string; audioPath?: string }> {
    const downloadOptions = {
      outputDir,
      downloadType,
      format: 'best',
      quality: 'best'
    }

    Logger.info(`执行${this.getDownloadTypeDisplayName(downloadType)}下载: ${url}`)
    
    const result = await this.videoDownloader.downloadContent(url, downloadOptions)
    
    Logger.info(`下载完成 - 视频: ${result.videoPath || '无'}, 音频: ${result.audioPath || '无'}`)
    
    return result
  }

  /**
   * 处理音频转录（预留接口）
   */
  private async processAudioTranscription(taskId: string, audioPath: string): Promise<void> {
    try {
      Logger.info(`开始音频转录: ${taskId}, 文件: ${audioPath}`)
      
      // 更新状态为转录中
      await this.updateTaskStatus(taskId, 'TRANSCRIBING')
      
      // TODO: 集成通义语音转文字API
      // 目前暂时跳过转录，直接标记为完成
      Logger.info('转录功能暂未实现，跳过转录步骤')
      
      await this.updateTaskStatus(taskId, 'COMPLETED')
      
    } catch (error) {
      Logger.error(`音频转录失败: ${taskId}, 错误: ${error}`)
      throw error
    }
  }

  /**
   * 根据下载类型确定下一个状态
   */
  private determineNextStatus(downloadType: DownloadType): TaskStatus {
    switch (downloadType) {
      case 'AUDIO_ONLY':
        return 'TRANSCRIBING' // 音频需要转录
      case 'VIDEO_ONLY':
        return 'COMPLETED' // 视频下载完成即可
      case 'BOTH':
        return 'TRANSCRIBING' // 包含音频的需要转录
      default:
        return 'COMPLETED'
    }
  }

  /**
   * 获取下载类型的显示名称
   */
  private getDownloadTypeDisplayName(downloadType: DownloadType): string {
    const displayNames: Record<DownloadType, string> = {
      'AUDIO_ONLY': '仅音频',
      'VIDEO_ONLY': '仅视频',
      'BOTH': '视频+音频'
    }
    return displayNames[downloadType]
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
      await db.task.update({
        where: { id: taskId },
        data: {
          status,
          ...(errorMessage && { errorMessage }),
          updatedAt: new Date()
        }
      })
      
      Logger.info(`任务 ${taskId} 状态更新为: ${status}`)
    } catch (error) {
      Logger.error(`更新任务状态失败: ${taskId}, 错误: ${error}`)
      throw error
    }
  }

  /**
   * 批量处理等待中的任务
   */
  async processPendingTasks(): Promise<void> {
    try {
      const pendingTasks = await db.task.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        take: 5 // 限制并发数量
      })

      if (pendingTasks.length === 0) {
        Logger.info('暂无等待处理的任务')
        return
      }

      Logger.info(`开始批量处理 ${pendingTasks.length} 个等待任务`)

      // 并行处理任务
      const promises = pendingTasks.map(task => 
        this.processTask(task.id).catch(error => {
          Logger.error(`批量任务处理失败: ${task.id}, 错误: ${error}`)
        })
      )

      await Promise.all(promises)
      Logger.info('批量任务处理完成')

    } catch (error) {
      Logger.error(`批量处理任务失败: ${error}`)
      throw error
    }
  }

  /**
   * 清理过期文件
   */
  async cleanupExpiredFiles(): Promise<void> {
    try {
      const tempDir = '/tmp/yt-dlpservice'
      await this.videoDownloader.cleanupFiles(tempDir, 24) // 清理24小时前的文件
      Logger.info('过期文件清理完成')
    } catch (error) {
      Logger.error(`清理过期文件失败: ${error}`)
    }
  }

  /**
   * 检查视频下载器可用性
   */
  async checkVideoDownloaderAvailability(): Promise<boolean> {
    try {
      const status = await this.videoDownloader.checkAvailability()
      return status.available
    } catch (error) {
      Logger.error(`检查视频下载器失败: ${error}`)
      return false
    }
  }
} 