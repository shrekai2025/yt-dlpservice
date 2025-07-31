import { db } from '~/server/db'
import { Logger } from '~/lib/utils/logger'
import { contentDownloader } from './content-downloader'
import { doubaoVoiceService } from './doubao-voice'
import { cleanupManager } from './cleanup-manager'
import { audioCompressor } from './audio-compressor'
import { env } from '~/env'
import { ConfigManager } from '~/lib/utils/config'
import { GlobalInit } from '~/lib/utils/global-init'
import type { TaskStatus, DownloadType, CompressionPreset } from '~/types/task'
import type { CompressionOptions } from '~/types/compression'
import { formatFileSize, bytesToMB } from './audio-utils'
import * as fs from 'fs/promises'
import * as path from 'path'

export class TaskProcessor {

  /**
   * 处理单个任务
   */
  async processTask(taskId: string): Promise<void> {
    try {
      Logger.info(`🚀 开始处理任务: ${taskId}`)

      // 获取任务信息
      const task = await db.task.findUnique({
        where: { id: taskId }
      })

      if (!task) {
        throw new Error(`任务 ${taskId} 不存在`)
      }

      Logger.info(`📋 任务详情: ${taskId} - 状态:${task.status}, 平台:${task.platform}, 类型:${task.downloadType}, URL:${task.url}`)

      // 允许重新处理EXTRACTING和TRANSCRIBING状态的任务（可能是超时重试）
      if (!['PENDING', 'EXTRACTING', 'TRANSCRIBING'].includes(task.status)) {
        Logger.warn(`⏭️ 任务 ${taskId} 状态为 ${task.status}，跳过处理`)
        return
      }

      // 创建临时目录
      const tempDir = await ConfigManager.get('TEMP_DIR')
      await fs.mkdir(tempDir, { recursive: true })

      const outputDir = path.join(tempDir, taskId)
      await fs.mkdir(outputDir, { recursive: true })

      Logger.info(`任务 ${taskId} 输出目录: ${outputDir}`)

      // 只有PENDING状态的任务才需要更新为EXTRACTING
      if (task.status === 'PENDING') {
        Logger.info(`📥 开始下载内容: ${taskId}`)
        await this.updateTaskStatus(taskId, 'EXTRACTING')
      } else {
        Logger.info(`🔄 继续处理任务: ${taskId} (当前状态: ${task.status})`)
      }

      // 根据下载类型进行相应处理
      Logger.info(`🎯 下载配置: ${taskId} - 类型:${task.downloadType}, 输出目录:${outputDir}`)
      const downloadResult = await this.handleDownloadByType(task.url, task.downloadType, outputDir)
      Logger.info(`✅ 下载完成: ${taskId} - 视频:${downloadResult.videoPath ? '✓' : '✗'}, 音频:${downloadResult.audioPath ? '✓' : '✗'}`)

      // 更新任务的文件路径和元数据
      const updateData: any = {
        videoPath: downloadResult.videoPath,
        audioPath: downloadResult.audioPath
      }
      
      // 如果有元数据，更新额外信息
      if (downloadResult.metadata) {
        updateData.title = downloadResult.metadata.title
        updateData.platform = downloadResult.metadata.platform
        if (downloadResult.metadata.duration) {
          updateData.duration = downloadResult.metadata.duration
        }
        if (downloadResult.metadata.description) {
          updateData.description = downloadResult.metadata.description
        }
        if (downloadResult.metadata.coverUrl) {
          updateData.thumbnail = downloadResult.metadata.coverUrl
        }
      }
      
      await db.task.update({
        where: { id: taskId },
        data: updateData
      })

      Logger.info(`任务 ${taskId} 提取完成，类型: ${this.getDownloadTypeDisplayName(task.downloadType)}`)

      // 处理音频压缩（如果需要）
      let audioPathForTranscription = downloadResult.audioPath
      if (task.compressionPreset && task.compressionPreset !== 'none' && audioPathForTranscription) {
        audioPathForTranscription = await this.processAudioCompression(taskId, audioPathForTranscription, task.compressionPreset as CompressionPreset)
      }

      // 处理音频转录（所有类型都需要转录）
      Logger.info(`🎵 准备音频转录: ${taskId}`)

      // 如果是视频下载，需要从视频中提取音频
      if (task.downloadType === 'VIDEO_ONLY' && downloadResult.videoPath) {
        // TODO: 实现视频转音频功能
        // audioPathForTranscription = await this.extractAudioFromVideo(downloadResult.videoPath)
        Logger.warn(`⚠️ 视频转音频功能尚未实现，任务 ${taskId} 暂时跳过转录`)
        await this.updateTaskStatus(taskId, 'COMPLETED')
        return
      }

      // 如果没有音频文件，标记为失败
      if (!audioPathForTranscription) {
        Logger.error(`❌ 未找到音频文件: ${taskId}`)
        throw new Error('未能获取到音频文件用于转录')
      }

      Logger.info(`🎯 音频文件路径: ${taskId} - ${audioPathForTranscription}`)
      
      // 检查音频文件是否存在
      try {
        const stats = await fs.stat(audioPathForTranscription)
        Logger.info(`📊 音频文件信息: ${taskId} - 大小:${(stats.size / 1024 / 1024).toFixed(2)}MB`)
      } catch (error) {
        Logger.error(`❌ 音频文件不存在: ${taskId} - ${audioPathForTranscription}`)
        throw new Error(`音频文件不存在: ${audioPathForTranscription}`)
      }

      // 开始转录流程
      Logger.info(`🎤 开始音频转录: ${taskId}`)
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
    metadata?: any
  }> {
    Logger.info(`📥 开始下载内容 - 类型: ${downloadType}, URL: ${url}`)
    Logger.info(`📁 输出目录: ${outputDir}`)
    
    const startTime = Date.now()
    
    try {
      const result = await contentDownloader.downloadContent(url, {
        outputDir: outputDir,
        downloadType: downloadType
      })
      
      const duration = Date.now() - startTime
      Logger.info(`⏱️ 下载完成 - 耗时: ${duration}ms`)
      Logger.info(`📄 下载结果: 视频=${result.videoPath || 'null'}, 音频=${result.audioPath || 'null'}`)
      
      return {
        videoPath: result.videoPath || null,
        audioPath: result.audioPath || null,
        metadata: result.metadata
      }
    } catch (error: any) {
      const duration = Date.now() - startTime
      Logger.error(`❌ 下载失败 - 耗时: ${duration}ms, 错误: ${error.message}`)
      throw error
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
   * 处理音频压缩
   */
  private async processAudioCompression(taskId: string, audioPath: string, preset: CompressionPreset): Promise<string> {
    try {
      Logger.info(`🗜️ 开始音频压缩: ${taskId}, 预设: ${preset}`)
      
      // 更新状态为压缩中（我们可以复用 EXTRACTING 状态或添加新状态）
      await this.updateTaskStatus(taskId, 'EXTRACTING')
      
      // 获取原始文件信息
      const originalStats = await fs.stat(audioPath)
      const originalSize = originalStats.size
      const originalSizeMB = bytesToMB(originalSize)
      
      Logger.info(`📊 原始音频文件: ${formatFileSize(originalSize)} (${originalSizeMB.toFixed(2)}MB)`)
      
      // 生成压缩后的文件路径
      const dir = path.dirname(audioPath)
      const ext = path.extname(audioPath)
      const basename = path.basename(audioPath, ext)
      const compressedPath = path.join(dir, `${basename}_compressed${ext}`)
      
      // 配置压缩选项
      const compressionOptions: CompressionOptions = {
        preset,
        inputPath: audioPath,
        outputPath: compressedPath,
        maxSizeMB: 80, // 豆包API限制
        skipIfSmaller: true
      }
      
      // 执行压缩
      const result = await audioCompressor.compressAudio(compressionOptions)
      
      if (!result.success) {
        Logger.warn(`⚠️ 音频压缩失败，使用原文件: ${result.error}`)
        return audioPath
      }
      
      if (result.skipped) {
        Logger.info(`⏭️ 跳过压缩: ${result.skipReason}`)
        return audioPath
      }
      
      // 压缩成功，更新数据库记录
      await db.task.update({
        where: { id: taskId },
        data: {
          originalFileSize: result.originalSize,
          compressedFileSize: result.compressedSize,
          compressionRatio: result.compressionRatio,
          compressionDuration: result.duration,
          compressionPreset: preset
        }
      })
      
      const compressedSizeMB = result.compressedSize ? bytesToMB(result.compressedSize) : 0
      Logger.info(`✅ 音频压缩完成: ${taskId}`)
      Logger.info(`  📉 大小变化: ${formatFileSize(result.originalSize)} → ${formatFileSize(result.compressedSize || 0)}`)
      Logger.info(`  📊 压缩比例: ${result.compressionRatio ? (result.compressionRatio * 100).toFixed(1) : '0'}%`)
      Logger.info(`  ⏱️ 压缩耗时: ${((result.duration || 0) / 1000).toFixed(1)}s`)
      
      // 删除原文件，使用压缩后的文件
      try {
        await fs.unlink(audioPath)
        Logger.debug(`🗑️ 已删除原始音频文件: ${audioPath}`)
      } catch (error) {
        Logger.warn(`清理原始文件失败: ${error}`)
      }
      
      return result.compressedPath || audioPath
      
    } catch (error: any) {
      Logger.error(`❌ 音频压缩处理失败: ${taskId}, 错误: ${error.message}`)
      Logger.warn(`⚠️ 使用原始音频文件继续处理`)
      return audioPath
    }
  }

  /**
   * 处理音频转录
   */
  private async processAudioTranscription(taskId: string, audioPath: string): Promise<void> {
    try {
      Logger.info(`🎤 开始音频转录处理: ${taskId}, 文件: ${audioPath}`)
      
      // 更新状态为转录中
      await this.updateTaskStatus(taskId, 'TRANSCRIBING')
      Logger.info(`📝 任务状态已更新为转录中: ${taskId}`)
      
      // 从配置中获取语音服务提供商
      Logger.info(`🔧 获取语音服务配置: ${taskId}`)
      let provider: string;
      try {
        provider = await ConfigManager.get('voice_service_provider');
      } catch {
        // 如果配置不存在，使用环境变量或默认值
        provider = env.VOICE_SERVICE_PROVIDER;
      }
      
      Logger.info(`🚀 使用语音服务提供商: ${taskId} - ${provider}`)
      
      let transcription = ''
      
      if (provider === 'doubao') {
        // 使用豆包语音API
        Logger.info(`🎯 调用豆包语音API: ${taskId}`)
        transcription = await this.processWithDoubaoVoice(audioPath)
      } else if (provider === 'tingwu') {
        // 使用通义听悟API（保留原有逻辑）
        Logger.info(`🎯 调用通义听悟API: ${taskId}`)
        transcription = await this.processWithTingwuAPI(audioPath)
      } else {
        Logger.error(`❌ 不支持的语音服务提供商: ${taskId} - ${provider}`)
        throw new Error(`不支持的语音服务提供商: ${provider}`)
      }
      
      Logger.info(`✅ 语音转录成功: ${taskId} - 文本长度: ${transcription.length}字符`)
      
      // 豆包API成功返回，更新任务转录结果并标记为完成
      await db.task.update({
        where: { id: taskId },
        data: {
          transcription: transcription,
          status: 'COMPLETED'
        }
      })
      
      // 删除重复日志 - 豆包服务中已输出详细转录完成信息
      Logger.info(`🎉 任务 ${taskId} 转录处理完成`)
      
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
      Logger.info(`🔍 检查豆包语音服务状态 - 文件: ${audioPath}`)
      
      // 检查服务状态
      const status = await doubaoVoiceService.checkServiceStatus()
      Logger.info(`🟢 豆包服务状态: 可用=${status.available}, 消息=${status.message}`)
      
      if (!status.available) {
        Logger.error(`❌ 豆包语音服务不可用: ${status.message}`)
        throw new Error(`豆包语音服务不可用: ${status.message}`)
      }
      
      Logger.info(`🎤 开始调用豆包语音识别API - 文件: ${audioPath}`)
      
      // 进行语音识别
      const startTime = Date.now()
      const transcription = await doubaoVoiceService.speechToText(audioPath)
      const duration = Date.now() - startTime
      
      Logger.info(`⏱️ 豆包API调用完成 - 耗时: ${duration}ms`)
      
      if (!transcription || transcription.trim().length === 0) {
        Logger.error(`❌ 豆包语音识别结果为空`)
        throw new Error('语音识别结果为空')
      }
      
      // 删除重复日志 - 豆包服务中已输出详细识别成功信息
      Logger.debug(`✅ 豆包语音识别成功 - 文本长度: ${transcription.length}字符`)
      
      return transcription
      
    } catch (error: any) {
      Logger.error(`❌ 豆包语音转录失败: ${error.message}`)
      Logger.error(`🔧 错误详情: ${error.stack || 'No stack trace'}`)
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
    // 尝试获取任务处理器启动权限
    if (!GlobalInit.tryInitializeTaskProcessor()) {
      // 如果没有获取到权限，等待其他实例完成启动
      await GlobalInit.waitForTaskProcessor()
      return
    }
    
    try {
      Logger.info('任务处理器启动')
      GlobalInit.setTaskProcessorInitialized()
      
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
      }, 10000) // 每10秒检查一次
    } catch (error) {
      GlobalInit.setTaskProcessorInitializationFailed()
      throw error
    }
  }

  /**
   * 处理待处理的任务
   */
  private async processPendingTasks(): Promise<void> {
    // 查找需要处理的任务（包括PENDING和EXTRACTING状态）
    const pendingTasks = await db.task.findMany({
      where: { 
        status: { 
          in: ['PENDING', 'EXTRACTING', 'TRANSCRIBING'] 
        } 
      },
      orderBy: { createdAt: 'asc' },
      take: env.MAX_CONCURRENT_TASKS
    })

    Logger.debug(`定期检查任务 - 总任务数: ${pendingTasks.length}`)
    
    if (pendingTasks.length === 0) {
      return
    }

    // 按状态分组统计
    const statusCounts = pendingTasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    Logger.info(`发现待处理任务: ${Object.entries(statusCounts).map(([status, count]) => `${status}:${count}`).join(', ')}`)

    // 只处理真正需要处理的任务
    const tasksToProcess = pendingTasks.filter(task => {
      // PENDING任务总是需要处理
      if (task.status === 'PENDING') {
        Logger.debug(`任务 ${task.id} 状态为PENDING，将被处理`)
        return true
      }
      
      // EXTRACTING和TRANSCRIBING任务检查是否超时（防止卡住）
      const now = new Date()
      const taskAge = now.getTime() - new Date(task.updatedAt).getTime()
      const timeoutMs = 10 * 60 * 1000 // 10分钟超时
      
      if (taskAge > timeoutMs) {
        Logger.warn(`任务 ${task.id} 状态 ${task.status} 超时 ${Math.round(taskAge/1000)}秒，重新处理`)
        return true
      }
      
      Logger.debug(`任务 ${task.id} 状态 ${task.status} 运行中 ${Math.round(taskAge/1000)}秒，暂不处理（10分钟后超时重试）`)
      return false
    })

    if (tasksToProcess.length === 0) {
      Logger.debug('没有需要处理的任务')
      return
    }

    Logger.info(`开始处理 ${tasksToProcess.length} 个任务`)

    // 并发处理任务
    const promises = tasksToProcess.map(task => 
      this.processTask(task.id).catch((error: any) => {
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