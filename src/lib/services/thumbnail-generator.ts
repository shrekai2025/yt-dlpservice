/**
 * Thumbnail Generator Service
 *
 * 为媒体文件生成缩略图
 * - 图片：压缩为小尺寸 JPEG/WebP
 * - 视频：使用 FFmpeg 提取第1秒帧
 * - 音频：不生成缩略图
 */

import sharp from 'sharp'
import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs/promises'
import path from 'path'
import { createLogger } from '~/lib/logger'
import crypto from 'crypto'
import axios from 'axios'

const logger = createLogger({ module: 'thumbnail-generator' })

const THUMBNAIL_SIZE = 400 // 最大宽度/高度
const THUMBNAIL_QUALITY = 80 // JPEG 质量
const THUMBNAIL_DIR = 'data/media-thumbnails' // 缩略图存储目录

interface ThumbnailOptions {
  userId: string
  fileId: string
  sourceUrl?: string
  localPath?: string
  type: 'image' | 'video' | 'audio'
}

/**
 * 确保缩略图目录存在
 */
async function ensureThumbnailDir(userId: string): Promise<string> {
  const userDir = path.join(process.cwd(), THUMBNAIL_DIR, userId)
  await fs.mkdir(userDir, { recursive: true })
  return userDir
}

/**
 * 从 URL 下载文件到临时位置
 */
async function downloadToTemp(url: string): Promise<string> {
  const tempDir = path.join(process.cwd(), 'data', 'temp')
  await fs.mkdir(tempDir, { recursive: true })

  const tempFileName = `temp_${crypto.randomBytes(8).toString('hex')}`
  const tempPath = path.join(tempDir, tempFileName)

  try {
    logger.info({ url }, 'Downloading file for thumbnail generation')
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 60000, // 60 秒超时
      maxContentLength: 500 * 1024 * 1024, // 500MB 最大
    })

    await fs.writeFile(tempPath, Buffer.from(response.data))
    logger.info({ tempPath }, 'File downloaded successfully')
    return tempPath
  } catch (error) {
    logger.error({ error, url }, 'Failed to download file')
    throw new Error(`Failed to download file: ${error}`)
  }
}

/**
 * 为图片生成缩略图
 */
async function generateImageThumbnail(
  sourcePath: string,
  outputPath: string
): Promise<void> {
  try {
    await sharp(sourcePath)
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: THUMBNAIL_QUALITY })
      .toFile(outputPath)

    logger.info({ sourcePath, outputPath }, 'Image thumbnail generated')
  } catch (error) {
    logger.error({ error, sourcePath }, 'Failed to generate image thumbnail')
    throw new Error(`Failed to generate image thumbnail: ${error}`)
  }
}

/**
 * 为视频生成缩略图（提取第1秒帧）
 */
async function generateVideoThumbnail(
  sourcePath: string,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(sourcePath)
      .screenshots({
        timestamps: ['1'], // 第1秒
        filename: path.basename(outputPath),
        folder: path.dirname(outputPath),
        size: `${THUMBNAIL_SIZE}x?`, // 保持原始比例，宽度最大400px
      })
      .on('end', () => {
        logger.info({ sourcePath, outputPath }, 'Video thumbnail generated')
        resolve()
      })
      .on('error', (error) => {
        logger.error({ error, sourcePath }, 'Failed to generate video thumbnail')
        reject(new Error(`Failed to generate video thumbnail: ${error.message}`))
      })
  })
}

/**
 * 生成缩略图主函数
 *
 * @returns 缩略图相对路径（相对于项目根目录）
 */
export async function generateThumbnail(options: ThumbnailOptions): Promise<string | null> {
  const { userId, fileId, sourceUrl, localPath, type } = options

  // 音频不生成缩略图
  if (type === 'audio') {
    logger.info('Audio file, skipping thumbnail generation')
    return null
  }

  // 确保缩略图目录存在
  const userDir = await ensureThumbnailDir(userId)
  const thumbnailPath = path.join(userDir, `${fileId}.jpg`)
  const relativePath = path.relative(process.cwd(), thumbnailPath)

  let tempFilePath: string | null = null

  try {
    // 确定源文件路径
    let actualSourcePath: string
    if (sourceUrl) {
      // 从 URL 下载
      tempFilePath = await downloadToTemp(sourceUrl)
      actualSourcePath = tempFilePath
    } else if (localPath) {
      // 使用本地文件
      actualSourcePath = localPath
    } else {
      throw new Error('Neither sourceUrl nor localPath provided')
    }

    // 根据类型生成缩略图
    if (type === 'image') {
      await generateImageThumbnail(actualSourcePath, thumbnailPath)
    } else if (type === 'video') {
      await generateVideoThumbnail(actualSourcePath, thumbnailPath)
    }

    logger.info({ relativePath }, 'Thumbnail generated successfully')
    return relativePath
  } catch (error) {
    logger.error({ error, options }, 'Failed to generate thumbnail')
    // 不抛出错误，缩略图生成失败不应影响主流程
    return null
  } finally {
    // 清理临时文件
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath)
        logger.info({ tempFilePath }, 'Temp file cleaned up')
      } catch (error) {
        logger.warn({ error, tempFilePath }, 'Failed to clean up temp file')
      }
    }
  }
}

/**
 * 删除缩略图
 */
export async function deleteThumbnail(thumbnailPath: string): Promise<void> {
  try {
    const fullPath = path.join(process.cwd(), thumbnailPath)
    await fs.unlink(fullPath)
    logger.info({ thumbnailPath }, 'Thumbnail deleted')
  } catch (error) {
    logger.warn({ error, thumbnailPath }, 'Failed to delete thumbnail (may not exist)')
  }
}

/**
 * 异步队列：后台批量生成缩略图
 * 避免阻塞主流程
 */
interface ThumbnailJob {
  id: string
  options: ThumbnailOptions
  onComplete?: (thumbnailPath: string | null) => void
}

class ThumbnailQueue {
  private queue: ThumbnailJob[] = []
  private processing = false

  add(job: ThumbnailJob): void {
    this.queue.push(job)
    logger.info({ jobId: job.id, queueLength: this.queue.length }, 'Thumbnail job added to queue')

    // 如果当前没有在处理，立即开始处理
    if (!this.processing) {
      this.processNext()
    }
  }

  private async processNext(): Promise<void> {
    if (this.queue.length === 0) {
      this.processing = false
      return
    }

    this.processing = true
    const job = this.queue.shift()

    if (!job) {
      this.processing = false
      return
    }

    logger.info({ jobId: job.id }, 'Processing thumbnail job')

    try {
      const thumbnailPath = await generateThumbnail(job.options)
      if (job.onComplete) {
        job.onComplete(thumbnailPath)
      }
    } catch (error) {
      logger.error({ error, jobId: job.id }, 'Thumbnail job failed')
    }

    // 继续处理下一个任务（轻微延迟避免过载）
    setTimeout(() => this.processNext(), 100)
  }

  getQueueLength(): number {
    return this.queue.length
  }
}

// 导出全局队列实例
export const thumbnailQueue = new ThumbnailQueue()
