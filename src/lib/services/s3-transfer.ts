/**
 * S3转存服务
 * 负责将下载的媒体文件异步转存到AWS S3
 */

import { db } from '~/server/db'
import { Logger } from '~/lib/utils/logger'
import { s3Uploader } from './s3-uploader'
import * as fs from 'fs/promises'
import * as path from 'path'

export class S3TransferService {
  private static instance: S3TransferService

  private constructor() {}

  public static getInstance(): S3TransferService {
    if (!S3TransferService.instance) {
      S3TransferService.instance = new S3TransferService()
    }
    return S3TransferService.instance
  }

  /**
   * 异步转存文件到S3（不阻塞主流程）
   * @param taskId 任务ID
   * @param filePath 要上传的文件路径（视频或音频）
   */
  async transferToS3Async(taskId: string, filePath: string | null): Promise<void> {
    // 异步执行，不阻塞主流程
    setImmediate(async () => {
      try {
        await this.transferToS3(taskId, filePath)
      } catch (error) {
        Logger.error(`S3转存异步任务失败 (task: ${taskId}): ${error}`)
      }
    })
  }

  /**
   * 转存文件到S3
   * @param taskId 任务ID
   * @param filePath 要上传的文件路径
   */
  async transferToS3(taskId: string, filePath: string | null): Promise<void> {
    try {
      // 检查文件路径是否有效
      if (!filePath) {
        await this.updateTransferStatus(taskId, 'failed', '文件路径为空')
        return
      }

      // 检查文件是否存在
      try {
        await fs.access(filePath)
      } catch {
        await this.updateTransferStatus(taskId, 'failed', '文件不存在')
        return
      }

      // 检查S3是否已配置
      if (!s3Uploader.isConfigured()) {
        await this.updateTransferStatus(taskId, 'failed', 'S3未配置，请设置AWS环境变量')
        Logger.warn(`S3转存跳过 (task: ${taskId}): S3未配置`)
        return
      }

      Logger.info(`开始S3转存 (task: ${taskId}): ${filePath}`)

      // 更新状态为uploading
      await this.updateTransferStatus(taskId, 'uploading', '正在上传到S3...')

      // 获取文件信息用于生成友好的文件名
      const task = await db.task.findUnique({
        where: { id: taskId },
        select: {
          title: true,
          platform: true,
          s3TransferFileType: true,
          originalVideoPath: true,
          originalAudioPath: true,
          videoPath: true,
          audioPath: true
        }
      })

      // 根据用户选择决定上传哪个文件
      let actualFilePath = filePath
      if (task?.s3TransferFileType === 'original') {
        // 用户选择上传原文件,尝试找到原始文件路径
        const originalPath = task.originalVideoPath || task.originalAudioPath
        if (originalPath) {
          // 检查原始文件是否存在
          try {
            await fs.access(originalPath)
            actualFilePath = originalPath
            Logger.info(`使用原始文件进行S3转存: ${originalPath}`)
          } catch {
            Logger.warn(`原始文件不存在,使用当前文件: ${filePath}`)
          }
        } else {
          Logger.warn(`未找到原始文件路径,使用当前文件: ${filePath}`)
        }
      }

      // 生成自定义文件名（包含任务ID和标题）
      const filename = path.basename(actualFilePath, path.extname(actualFilePath))
      const customFilename = task?.title
        ? `${taskId}_${this.sanitizeFilename(task.title)}`
        : `${taskId}_${filename}`

      // 获取文件大小和扩展名
      const stats = await fs.stat(actualFilePath)
      const fileSize = stats.size
      const fileExtension = path.extname(actualFilePath)

      // 上传到S3
      const pathPrefix = `media/${task?.platform || 'unknown'}`
      const s3Url = await s3Uploader.uploadFile(
        actualFilePath,
        pathPrefix,
        customFilename
      )

      // 生成S3 Key
      const s3Key = `${pathPrefix}/${customFilename}${fileExtension}`

      // 检测MIME类型
      const mimeType = this.getMimeTypeFromExtension(fileExtension)

      // 更新Task表状态
      await db.task.update({
        where: { id: taskId },
        data: {
          s3Url,
          s3TransferStatus: 'completed',
          s3TransferProgress: '转存成功',
          s3TransferredAt: new Date()
        }
      })

      // 创建StorageFile记录
      await db.storageFile.create({
        data: {
          fileName: task?.title || filename,
          storedName: `${customFilename}${fileExtension}`,
          s3Url,
          s3Key,
          fileSize,
          mimeType,
          pathPrefix
        }
      })

      Logger.info(`S3转存成功 (task: ${taskId}): ${s3Url}`)

      // 如果上传的是原文件,清理它(因为已经上传到S3了)
      if (task?.s3TransferFileType === 'original' && actualFilePath !== filePath) {
        try {
          await fs.unlink(actualFilePath)
          Logger.info(`🗑️ S3转存完成,已删除原始文件: ${actualFilePath}`)
        } catch (error) {
          Logger.warn(`清理原始文件失败: ${error}`)
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      Logger.error(`S3转存失败 (task: ${taskId}): ${errorMessage}`)

      await this.updateTransferStatus(taskId, 'failed', `转存失败: ${errorMessage}`)
    }
  }

  /**
   * 更新转存状态
   */
  private async updateTransferStatus(
    taskId: string,
    status: string,
    progress: string
  ): Promise<void> {
    try {
      await db.task.update({
        where: { id: taskId },
        data: {
          s3TransferStatus: status,
          s3TransferProgress: progress,
          ...(status === 'completed' && { s3TransferredAt: new Date() })
        }
      })
    } catch (error) {
      Logger.error(`更新S3转存状态失败 (task: ${taskId}): ${error}`)
    }
  }

  /**
   * 清理文件名中的特殊字符
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_') // 替换非法字符
      .replace(/\s+/g, '_') // 空格替换为下划线
      .substring(0, 100) // 限制长度
  }

  /**
   * 根据文件扩展名获取MIME类型
   */
  private getMimeTypeFromExtension(extension: string): string {
    const ext = extension.toLowerCase().replace('.', '')
    const mimeTypes: Record<string, string> = {
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'mkv': 'video/x-matroska',
      'avi': 'video/x-msvideo',
      'mov': 'video/quicktime',
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'm4a': 'audio/mp4',
      'ogg': 'audio/ogg',
      'flac': 'audio/flac',
      'opus': 'audio/opus'
    }
    return mimeTypes[ext] || 'application/octet-stream'
  }

  /**
   * 批量转存任务（用于后台任务）
   */
  async batchTransfer(limit: number = 10): Promise<void> {
    try {
      // 查找待转存的任务
      const tasks = await db.task.findMany({
        where: {
          s3TransferStatus: 'pending',
          status: 'COMPLETED' // 只转存已完成的任务
        },
        take: limit,
        select: {
          id: true,
          videoPath: true,
          audioPath: true,
          downloadType: true
        }
      })

      Logger.info(`批量S3转存: 找到 ${tasks.length} 个待转存任务`)

      for (const task of tasks) {
        // 优先转存视频，如果没有视频则转存音频
        const filePath = task.videoPath || task.audioPath
        if (filePath) {
          await this.transferToS3Async(task.id, filePath)
        } else {
          await this.updateTransferStatus(task.id, 'failed', '无可用文件路径')
        }
      }
    } catch (error) {
      Logger.error(`批量S3转存失败: ${error}`)
    }
  }
}

// 导出单例
export const s3TransferService = S3TransferService.getInstance()
