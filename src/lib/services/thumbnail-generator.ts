/**
 * Thumbnail Generator Service
 *
 * 为媒体文件生成缩略图
 * - 图片：下载后使用 Sharp 压缩为小尺寸 JPEG
 * - 视频（远程URL）：完整下载后使用 FFmpeg 提取第1秒帧，生成后删除临时文件
 * - 视频（本地文件）：使用 FFmpeg 从本地文件提取第1秒帧
 * - 音频：不生成缩略图
 *
 * 工作流程：
 * 1. 远程视频：下载完整文件 → 生成缩略图 → 删除临时文件
 * 2. 本地视频：直接从文件路径生成缩略图
 * 3. 异步队列处理，不阻塞主流程
 *
 * 限制：
 * - 最大下载大小：100MB（可配置）
 * - 超时时间：60秒
 * - Cloudflare保护的URL可能无法下载，会生成失败
 */

import sharp from 'sharp'
import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs/promises'
import path from 'path'
import { createLogger } from '~/lib/logger'
import crypto from 'crypto'
import axios from 'axios'
import { browserManager } from './browser-manager'

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

interface ThumbnailResult {
  thumbnailPath: string | null
  width?: number
  height?: number
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
 * 从 URL 下载文件到临时位置（仅用于图片，完整下载）
 */
async function downloadImageToTemp(url: string): Promise<string> {
  const tempDir = path.join(process.cwd(), 'data', 'temp')
  await fs.mkdir(tempDir, { recursive: true })

  const tempFileName = `temp_${crypto.randomBytes(8).toString('hex')}`
  const tempPath = path.join(tempDir, tempFileName)

  try {
    logger.info({ url }, 'Downloading image for thumbnail generation')
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000, // 30 秒超时（图片通常较小）
      maxContentLength: 50 * 1024 * 1024, // 50MB 最大
    })

    await fs.writeFile(tempPath, Buffer.from(response.data))
    logger.info({ tempPath }, 'Image downloaded successfully')
    return tempPath
  } catch (error) {
    logger.error({ error, url }, 'Failed to download image')
    throw new Error(`Failed to download image: ${error}`)
  }
}

/**
 * 为图片生成缩略图
 */
async function generateImageThumbnail(
  sourcePath: string,
  outputPath: string
): Promise<{ width: number; height: number }> {
  try {
    // Get original image metadata
    const metadata = await sharp(sourcePath).metadata()
    const width = metadata.width || 0
    const height = metadata.height || 0

    await sharp(sourcePath)
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: THUMBNAIL_QUALITY })
      .toFile(outputPath)

    logger.info({ sourcePath, outputPath, width, height }, 'Image thumbnail generated')
    return { width, height }
  } catch (error) {
    logger.error({ error, sourcePath }, 'Failed to generate image thumbnail')
    throw new Error(`Failed to generate image thumbnail: ${error}`)
  }
}

/**
 * 为视频生成缩略图（提取第1秒帧）
 * 支持本地文件路径
 * 返回视频的原始宽高
 */
async function generateVideoThumbnailFromPath(
  sourcePath: string,
  outputPath: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    // 首先获取视频元数据
    ffmpeg.ffprobe(sourcePath, (err, metadata) => {
      if (err) {
        logger.error({ error: err, sourcePath }, 'Failed to probe video metadata')
        reject(new Error(`Failed to probe video: ${err.message}`))
        return
      }

      // 提取视频流的宽高
      const videoStream = metadata.streams.find(s => s.codec_type === 'video')
      const width = videoStream?.width || 0
      const height = videoStream?.height || 0

      // 生成缩略图
      ffmpeg(sourcePath)
        .screenshots({
          timestamps: ['1'], // 第1秒
          filename: path.basename(outputPath),
          folder: path.dirname(outputPath),
          size: `${THUMBNAIL_SIZE}x?`, // 保持原始比例，宽度最大400px
        })
        .on('end', () => {
          logger.info({ sourcePath, outputPath, width, height }, 'Video thumbnail generated from path')
          resolve({ width, height })
        })
        .on('error', (error) => {
          logger.error({ error, sourcePath }, 'Failed to generate video thumbnail from path')
          reject(new Error(`Failed to generate video thumbnail: ${error.message}`))
        })
    })
  })
}

/**
 * 使用浏览器下载视频文件（用于绕过Cloudflare等保护）
 */
async function downloadVideoWithBrowser(url: string, maxBytes: number = 100 * 1024 * 1024): Promise<string> {
  const tempDir = path.join(process.cwd(), 'data', 'temp')
  await fs.mkdir(tempDir, { recursive: true })

  const tempFileName = `temp_video_${crypto.randomBytes(8).toString('hex')}.mp4`
  const tempPath = path.join(tempDir, tempFileName)

  let page = null

  try {
    logger.info({ url }, 'Downloading video using browser (Cloudflare bypass)')

    // 获取浏览器页面（禁用请求拦截，因为我们需要下载视频）
    page = await browserManager.getPage({
      headless: true,
      timeout: 60000,
      enableRequestInterception: false
    })

    // 监听响应，捕获视频数据
    let videoBuffer: Buffer | null = null

    page.on('response', async (response) => {
      const responseUrl = response.url()

      // 检查是否是我们要下载的视频
      if (responseUrl === url) {
        try {
          const contentType = response.headers()['content-type']

          if (contentType && contentType.includes('video')) {
            logger.info({ url, contentType }, 'Video response detected')

            const buffer = await response.buffer()

            if (buffer.length > maxBytes) {
              logger.warn({ size: buffer.length, maxBytes }, 'Video exceeds size limit')
              throw new Error(`Video size ${buffer.length} exceeds limit ${maxBytes}`)
            }

            videoBuffer = buffer
            logger.info({ size: buffer.length }, 'Video buffer captured')
          }
        } catch (error) {
          logger.error({ error }, 'Failed to capture video buffer')
        }
      }
    })

    // 访问视频URL
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 })

    // 等待一下确保视频加载完成
    await new Promise(resolve => setTimeout(resolve, 2000))

    if (!videoBuffer) {
      throw new Error('Failed to capture video data from browser')
    }

    // 保存到文件
    await fs.writeFile(tempPath, videoBuffer)

    const fileSize = (await fs.stat(tempPath)).size
    logger.info({ tempPath, fileSize }, 'Video downloaded successfully using browser')

    return tempPath
  } catch (error: any) {
    logger.error({
      errorMessage: error?.message,
      errorStack: error?.stack,
      url
    }, 'Failed to download video with browser')
    throw new Error(`Failed to download video with browser: ${error?.message || error}`)
  } finally {
    // 释放浏览器页面
    if (page) {
      await browserManager.releasePage(page)
    }
  }
}

/**
 * 完整下载视频文件到临时目录
 * 用于生成缩略图（生成后会删除临时文件）
 * 策略：先尝试直接下载，如果403则使用浏览器下载
 */
async function downloadVideoComplete(url: string, maxBytes: number = 100 * 1024 * 1024): Promise<string> {
  const tempDir = path.join(process.cwd(), 'data', 'temp')
  await fs.mkdir(tempDir, { recursive: true })

  const tempFileName = `temp_video_${crypto.randomBytes(8).toString('hex')}.mp4`
  const tempPath = path.join(tempDir, tempFileName)

  try {
    logger.info({ url, maxBytes }, 'Attempting direct download')

    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 60000, // 60秒超时
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
      },
      maxContentLength: maxBytes, // 限制最大文件大小
      maxRedirects: 5,
    })

    await fs.writeFile(tempPath, Buffer.from(response.data))

    const fileSize = (await fs.stat(tempPath)).size
    logger.info({ tempPath, fileSize }, 'Video downloaded directly')
    return tempPath
  } catch (error: any) {
    // 如果是403错误，尝试使用浏览器下载
    if (error?.response?.status === 403 || error?.message?.includes('403')) {
      logger.warn({ url }, 'Direct download got 403, trying browser download')
      return await downloadVideoWithBrowser(url, maxBytes)
    }

    logger.error({
      errorMessage: error?.message,
      errorStack: error?.stack,
      errorCode: error?.code,
      errorResponse: error?.response?.status,
      url
    }, 'Failed to download video')
    throw new Error(`Failed to download video: ${error?.message || error}`)
  }
}

/**
 * 从远程URL生成视频缩略图
 * 策略：完整下载视频文件后生成缩略图，然后删除临时文件
 * 返回视频的原始宽高
 */
async function generateVideoThumbnailFromUrl(
  sourceUrl: string,
  outputPath: string
): Promise<{ width: number; height: number }> {
  let tempFilePath: string | null = null

  try {
    // 完整下载视频文件
    tempFilePath = await downloadVideoComplete(sourceUrl)

    // 从下载的文件生成缩略图（返回宽高）
    const dimensions = await generateVideoThumbnailFromPath(tempFilePath, outputPath)

    logger.info({ sourceUrl, outputPath, width: dimensions.width, height: dimensions.height }, 'Video thumbnail generated successfully from downloaded file')
    return dimensions
  } catch (error: any) {
    logger.error({
      errorMessage: error?.message,
      errorStack: error?.stack,
      errorCode: error?.code,
      sourceUrl
    }, 'Failed to generate video thumbnail from URL')
    throw error
  } finally {
    // 清理临时文件
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath)
        logger.info({ tempFilePath }, 'Temp video file cleaned up')
      } catch (cleanupError) {
        logger.warn({ error: cleanupError, tempFilePath }, 'Failed to clean up temp video file')
      }
    }
  }
}

/**
 * 生成缩略图主函数
 *
 * @returns 缩略图相对路径（相对于项目根目录）
 */
export async function generateThumbnail(options: ThumbnailOptions): Promise<ThumbnailResult> {
  const { userId, fileId, sourceUrl, localPath, type } = options

  // 音频不生成缩略图
  if (type === 'audio') {
    logger.info('Audio file, skipping thumbnail generation')
    return { thumbnailPath: null }
  }

  // 确保缩略图目录存在
  const userDir = await ensureThumbnailDir(userId)
  const thumbnailPath = path.join(userDir, `${fileId}.jpg`)
  const relativePath = path.relative(process.cwd(), thumbnailPath)

  let tempFilePath: string | null = null
  let width: number | undefined
  let height: number | undefined

  try {
    if (type === 'image') {
      // 图片处理：需要下载到临时文件
      if (sourceUrl) {
        tempFilePath = await downloadImageToTemp(sourceUrl)
        const dimensions = await generateImageThumbnail(tempFilePath, thumbnailPath)
        width = dimensions.width
        height = dimensions.height
      } else if (localPath) {
        const dimensions = await generateImageThumbnail(localPath, thumbnailPath)
        width = dimensions.width
        height = dimensions.height
      } else {
        throw new Error('Neither sourceUrl nor localPath provided')
      }
    } else if (type === 'video') {
      // 视频处理：区分URL和本地文件
      if (sourceUrl) {
        // 远程视频：使用流式处理，直接从URL生成缩略图（不完整下载）
        logger.info({ sourceUrl }, 'Using streaming mode for remote video thumbnail')
        const dimensions = await generateVideoThumbnailFromUrl(sourceUrl, thumbnailPath)
        width = dimensions.width
        height = dimensions.height
      } else if (localPath) {
        // 本地视频：直接从文件路径生成缩略图
        const dimensions = await generateVideoThumbnailFromPath(localPath, thumbnailPath)
        width = dimensions.width
        height = dimensions.height
      } else {
        throw new Error('Neither sourceUrl nor localPath provided')
      }
    }

    logger.info({ relativePath, type, hasUrl: !!sourceUrl, width, height }, 'Thumbnail generated successfully')
    return { thumbnailPath: relativePath, width, height }
  } catch (error: any) {
    logger.error({
      errorMessage: error?.message,
      errorStack: error?.stack,
      errorCode: error?.code,
      options
    }, 'Failed to generate thumbnail')
    // 不抛出错误，缩略图生成失败不应影响主流程
    return { thumbnailPath: null }
  } finally {
    // 清理临时文件（仅图片会产生临时文件）
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
  onComplete?: (result: ThumbnailResult) => void
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
      const result = await generateThumbnail(job.options)
      if (job.onComplete) {
        job.onComplete(result)
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
