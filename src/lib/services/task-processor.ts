import { db } from '~/server/db'
import { Logger } from '~/lib/utils/logger'
import { videoDownloader } from './video-downloader'
import { doubaoVoiceService } from './doubao-voice'
import { cleanupManager } from './cleanup-manager'
import { env } from '~/env'
import { ConfigManager } from '~/lib/utils/config'
import type { TaskStatus, DownloadType } from '~/types/task'
import * as fs from 'fs/promises'
import * as path from 'path'

export class TaskProcessor {

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

      // 更新状态为提取中（包括下载和音频提取过程）
      await this.updateTaskStatus(taskId, 'EXTRACTING')

      // 根据下载类型进行相应处理
      const downloadResult = await this.handleDownloadByType(task.url, task.downloadType, outputDir)

      // 更新任务的文件路径
      await db.task.update({
        where: { id: taskId },
        data: {
          videoPath: downloadResult.videoPath,
          audioPath: downloadResult.audioPath
        }
      })

      Logger.info(`任务 ${taskId} 提取完成，类型: ${this.getDownloadTypeDisplayName(task.downloadType)}`)

      // 处理音频转录（所有类型都需要转录）
      let audioPathForTranscription = downloadResult.audioPath

      // 如果是视频下载，需要从视频中提取音频
      if (task.downloadType === 'VIDEO_ONLY' && downloadResult.videoPath) {
        // TODO: 实现视频转音频功能
        // audioPathForTranscription = await this.extractAudioFromVideo(downloadResult.videoPath)
        Logger.warn(`视频转音频功能尚未实现，任务 ${taskId} 暂时跳过转录`)
        await this.updateTaskStatus(taskId, 'COMPLETED')
        return
      }

      // 如果没有音频文件，标记为失败
      if (!audioPathForTranscription) {
        throw new Error('未能获取到音频文件用于转录')
      }

      // 开始转录流程
      await this.processAudioTranscription(taskId, audioPathForTranscription)

      // 转录完成后，延迟清理临时文件
      try {
        setTimeout(async () => {
          await this.cleanupTaskFiles(taskId, outputDir)
        }, 5 * 60 * 1000) // 5分钟后清理
      } catch (error) {
        Logger.warn(`任务 ${taskId} 清理失败: ${error}`)
      }

    } catch (error: any) {
      Logger.error(`任务处理失败: ${taskId}, 错误: ${error.message}`)
      
      // 更新任务状态为失败，并记录错误信息
      await db.task.update({
        where: { id: taskId },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
          retryCount: { increment: 1 }
        }
      })
      
      throw error
    }
  }



  /**
   * 根据下载类型处理下载
   */
  private async handleDownloadByType(url: string, downloadType: DownloadType, outputDir: string): Promise<{
    videoPath: string | null
    audioPath: string | null
  }> {
    switch (downloadType) {
      case 'AUDIO_ONLY':
        Logger.info('开始下载音频文件')
        const audioPath = await videoDownloader.downloadAudio(url, {
          outputDir: outputDir,
          format: 'bestaudio',
          downloadType: 'AUDIO_ONLY'
        })
        return { videoPath: null, audioPath: audioPath }
        
      case 'VIDEO_ONLY':
        Logger.info('开始下载视频文件（用于音频提取）')
        const videoPath = await videoDownloader.downloadVideo(url, {
          outputDir: outputDir,
          quality: 'best',
          downloadType: 'VIDEO_ONLY'
        })
        return { videoPath: videoPath, audioPath: null }
        
      case 'BOTH':
        Logger.info('开始下载视频和音频文件')
        const videoResult = await videoDownloader.downloadVideo(url, {
          outputDir: outputDir,
          quality: 'best',
          downloadType: 'BOTH'
        })
        const audioResult = await videoDownloader.downloadAudio(url, {
          outputDir: outputDir,
          format: 'bestaudio',
          downloadType: 'BOTH'
        })
        return { videoPath: videoResult, audioPath: audioResult }
        
      default:
        throw new Error(`不支持的下载类型: ${downloadType}`)
    }
  }

  /**
   * 确定下一个状态
   */
  private determineNextStatus(downloadType: DownloadType): TaskStatus {
    // 所有类型都需要进行音频提取和转录，所以下一步都是EXTRACTING
    return 'EXTRACTING'
  }

  /**
   * 获取下载类型显示名称
   */
  private getDownloadTypeDisplayName(downloadType: DownloadType): string {
    const typeMap: Record<DownloadType, string> = {
      'AUDIO_ONLY': '仅音频',
      'VIDEO_ONLY': '仅视频（用于音频提取）',
      'BOTH': '视频+音频'
    }
    return typeMap[downloadType] || downloadType
  }

  /**
   * 处理音频转录
   */
  private async processAudioTranscription(taskId: string, audioPath: string): Promise<void> {
    try {
      Logger.info(`开始音频转录: ${taskId}, 文件: ${audioPath}`)
      
      // 更新状态为转录中
      await this.updateTaskStatus(taskId, 'TRANSCRIBING')
      
      // 从配置中获取语音服务提供商
      let provider: string;
      try {
        provider = await ConfigManager.get('voice_service_provider');
      } catch {
        // 如果配置不存在，使用环境变量或默认值
        provider = env.VOICE_SERVICE_PROVIDER;
      }
      
      Logger.info(`使用语音服务提供商: ${provider}`)
      
      let transcription = ''
      
      if (provider === 'doubao') {
        // 使用豆包语音API
        transcription = await this.processWithDoubaoVoice(audioPath)
      } else if (provider === 'tingwu') {
        // 使用通义听悟API（保留原有逻辑）
        transcription = await this.processWithTingwuAPI(audioPath)
      } else {
        throw new Error(`不支持的语音服务提供商: ${provider}`)
      }
      
      // 豆包API成功返回，更新任务转录结果并标记为完成
      await db.task.update({
        where: { id: taskId },
        data: {
          transcription: transcription,
          status: 'COMPLETED'
        }
      })
      
      Logger.info(`音频转录完成: ${taskId}, 转录文本长度: ${transcription.length}`)
      
    } catch (error: any) {
      Logger.error(`音频转录失败: ${taskId}, 错误: ${error.message}`)
      // 豆包API失败，直接标记任务为失败
      throw error
    }
  }

  /**
   * 使用豆包语音API进行转录
   */
  private async processWithDoubaoVoice(audioPath: string): Promise<string> {
    try {
      // 检查服务状态
      const status = await doubaoVoiceService.checkServiceStatus()
      if (!status.available) {
        throw new Error(`豆包语音服务不可用: ${status.message}`)
      }
      
      // 进行语音识别
      const transcription = await doubaoVoiceService.speechToText(audioPath)
      
      if (!transcription || transcription.trim().length === 0) {
        throw new Error('语音识别结果为空')
      }
      
      return transcription
      
    } catch (error: any) {
      Logger.error(`豆包语音转录失败: ${error.message}`)
      throw error
    }
  }

  /**
   * 使用通义听悟API进行转录（保留原有功能）
   */
  private async processWithTingwuAPI(audioPath: string): Promise<string> {
    try {
      Logger.info('使用通义听悟API进行转录')
      
      // TODO: 集成通义语音转文字API
      // 目前暂时跳过转录，直接返回占位符文本
      Logger.warn('通义听悟API功能暂未实现，返回占位符文本')
      
      return `[通义听悟转录结果占位符] 音频文件: ${path.basename(audioPath)}`
      
    } catch (error: any) {
      Logger.error(`通义听悟转录失败: ${error.message}`)
      throw error
    }
  }

  /**
   * 更新任务状态
   */
  private async updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
    await db.task.update({
      where: { id: taskId },
      data: { 
        status: status,
        updatedAt: new Date()
      }
    })
    Logger.info(`任务 ${taskId} 状态更新为: ${status}`)
  }

  /**
   * 清理任务相关文件
   */
  private async cleanupTaskFiles(taskId: string, outputDir: string): Promise<void> {
    try {
      Logger.info(`开始清理任务 ${taskId} 的临时文件: ${outputDir}`)
      
      // 检查目录是否存在
      try {
        await fs.access(outputDir)
      } catch {
        Logger.debug(`任务目录已不存在: ${outputDir}`)
        return
      }

      // 删除整个任务目录
      try {
        await fs.rm(outputDir, { recursive: true, force: true })
        Logger.info(`成功清理任务目录: ${outputDir}`)
      } catch (error) {
        Logger.warn(`清理任务目录失败: ${outputDir}, 错误: ${error}`)
      }

    } catch (error) {
      Logger.error(`清理任务 ${taskId} 文件失败: ${error}`)
    }
  }

  /**
   * 启动任务处理器
   */
  async start(): Promise<void> {
    Logger.info('任务处理器启动')
    
    // 启动自动文件清理服务
    try {
      await cleanupManager.startAutoCleanup()
      Logger.info('自动文件清理服务已启动')
    } catch (error) {
      Logger.error(`启动自动文件清理失败: ${error}`)
    }
    
    // 定期检查待处理任务
    setInterval(async () => {
      try {
        await this.processPendingTasks()
      } catch (error: any) {
        Logger.error(`任务处理器执行失败: ${error.message}`)
      }
    }, 5000) // 每5秒检查一次
  }

  /**
   * 处理待处理的任务
   */
  private async processPendingTasks(): Promise<void> {
    const pendingTasks = await db.task.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take: env.MAX_CONCURRENT_TASKS
    })

    if (pendingTasks.length === 0) {
      return
    }

    Logger.info(`发现 ${pendingTasks.length} 个待处理任务`)

    // 并发处理任务
    const promises = pendingTasks.map(task => 
      this.processTask(task.id).catch(error => {
        Logger.error(`任务 ${task.id} 处理失败: ${error.message}`)
      })
    )

    await Promise.all(promises)
  }

  // TODO: 实现视频转音频功能
  /**
   * 从视频文件中提取音频
   */
  private async extractAudioFromVideo(videoPath: string): Promise<string> {
    // TODO: 使用 FFmpeg 从视频文件中提取音频
    // 1. 检查FFmpeg是否可用
    // 2. 使用FFmpeg命令提取音频: ffmpeg -i input.mp4 -vn -acodec libmp3lame -ar 44100 -ac 2 -ab 192k output.mp3
    // 3. 返回提取的音频文件路径
    // 4. 可选：删除原视频文件以节省空间
    
    throw new Error('视频转音频功能尚未实现')
  }
} 