/**
 * AWS S3 Uploader Service
 *
 * 通用的AWS S3上传服务
 * 注意: 火山引擎TOS专门给豆包STT使用，不使用此服务
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import crypto from 'crypto'
import { createLogger } from '~/lib/logger'

const logger = createLogger({ module: 's3-uploader' })

interface S3Config {
  accessKeyId: string
  secretAccessKey: string
  region: string
  bucketName: string
}

/**
 * AWS S3 Uploader类
 */
class S3Uploader {
  private client: S3Client | null = null
  private config: S3Config | null = null
  private initialized = false

  /**
   * 初始化S3客户端
   */
  initialize(config: S3Config): void {
    if (this.initialized) {
      // 已经初始化过，跳过（不打印日志避免重复）
      return
    }

    this.config = config
    this.client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      // 网络优化配置
      requestHandler: {
        // 增加连接超时时间到60秒
        connectionTimeout: 60000,
        // 增加socket超时时间到120秒
        socketTimeout: 120000,
      },
      // 最大重试次数
      maxAttempts: 5,
    })
    this.initialized = true
    logger.info('AWS S3 uploader initialized with extended timeouts')
  }

  /**
   * 检查是否已配置
   */
  isConfigured(): boolean {
    return this.client !== null && this.config !== null
  }

  /**
   * 上传Buffer到S3
   */
  async uploadBuffer(
    buffer: Buffer,
    pathPrefix: string = 'uploads',
    contentType?: string,
    customFilename?: string
  ): Promise<string> {
    if (!this.client || !this.config) {
      throw new Error('S3 uploader not initialized. Call initialize() first.')
    }

    if (!contentType) {
      contentType = this.detectContentType(buffer)
    }

    const extension = this.getExtensionFromContentType(contentType)
    const filename = customFilename
      ? `${customFilename}.${extension}`
      : this.generateUniqueFilename(extension)
    const key = `${pathPrefix}/${filename}`

    try {
      const command = new PutObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })

      await this.client.send(command)

      const url = `https://${this.config.bucketName}.s3.${this.config.region}.amazonaws.com/${key}`
      logger.info({ url }, 'Successfully uploaded to AWS S3')
      return url
    } catch (error) {
      logger.error({ error }, 'Failed to upload to AWS S3')
      throw new Error(`S3 upload failed: ${error}`)
    }
  }

  /**
   * 从文件路径上传文件到S3 (带智能重试)
   */
  async uploadFile(
    filePath: string,
    pathPrefix: string = 'uploads',
    customFilename?: string
  ): Promise<string> {
    if (!this.client || !this.config) {
      throw new Error('S3 uploader not initialized. Call initialize() first.')
    }

    try {
      const fs = await import('fs/promises')
      const path = await import('path')

      // 读取文件
      const buffer = await fs.readFile(filePath)

      // 检测文件类型
      const contentType = this.detectContentType(buffer)

      // 使用原文件名或自定义文件名
      const originalFilename = path.basename(filePath, path.extname(filePath))
      const filename = customFilename || originalFilename

      logger.info({ filePath, filename, contentType }, 'Uploading file to S3')

      return await this.uploadBufferWithRetry(buffer, pathPrefix, contentType, filename)
    } catch (error) {
      logger.error({ error, filePath }, 'Failed to upload file to S3')
      throw new Error(`S3 file upload failed: ${error}`)
    }
  }

  /**
   * 带智能重试的Buffer上传 (指数退避策略)
   */
  private async uploadBufferWithRetry(
    buffer: Buffer,
    pathPrefix: string,
    contentType: string,
    customFilename?: string,
    maxRetries: number = 5
  ): Promise<string> {
    let lastError: any = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // 第一次尝试不延迟，后续使用指数退避
        if (attempt > 0) {
          const delayMs = this.calculateBackoffDelay(attempt)
          logger.info({ attempt, delayMs, maxRetries }, `S3上传重试中，等待 ${delayMs}ms...`)
          await this.sleep(delayMs)
        }

        logger.info({ attempt, maxRetries, fileSize: buffer.length }, 'S3上传尝试')

        // 调用原始上传方法
        const url = await this.uploadBuffer(buffer, pathPrefix, contentType, customFilename)

        if (attempt > 0) {
          logger.info({ attempt, url }, `S3上传成功 (重试${attempt}次后成功)`)
        }

        return url
      } catch (error: any) {
        lastError = error

        // 判断错误类型
        const isRetryable = this.isRetryableError(error)

        if (!isRetryable) {
          logger.error({ error, attempt }, 'S3上传遇到不可重试错误，立即失败')
          throw error
        }

        if (attempt < maxRetries) {
          logger.warn({ error: error.message, attempt, maxRetries }, `S3上传失败，将进行重试`)
        } else {
          logger.error({ error: error.message, totalAttempts: attempt + 1 }, 'S3上传失败，已达最大重试次数')
        }
      }
    }

    // 所有重试都失败
    throw new Error(`S3上传失败，已重试${maxRetries}次: ${lastError?.message || lastError}`)
  }

  /**
   * 计算指数退避延迟时间
   * 策略: baseDelay * (2 ^ attempt) + random jitter
   */
  private calculateBackoffDelay(attempt: number): number {
    const baseDelay = 2000 // 基础延迟2秒
    const maxDelay = 60000 // 最大延迟60秒

    // 指数增长: 2s, 4s, 8s, 16s, 32s, 60s (cap)
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1)

    // 添加随机抖动 (±25%) 避免多个请求同时重试
    const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5)

    const delay = Math.min(exponentialDelay + jitter, maxDelay)

    return Math.floor(delay)
  }

  /**
   * 判断错误是否可以重试
   */
  private isRetryableError(error: any): boolean {
    // AWS SDK错误代码
    const retryableErrorCodes = [
      'ETIMEDOUT',
      'ECONNRESET',
      'ECONNREFUSED',
      'EPIPE',
      'ENOTFOUND',
      'NetworkingError',
      'TimeoutError',
      'RequestTimeout',
      'RequestTimeoutException',
      'ThrottlingException',
      'TooManyRequestsException',
      'ServiceUnavailable',
      'SlowDown'
    ]

    const errorCode = error?.code || error?.$metadata?.httpStatusCode
    const errorName = error?.name
    const errorMessage = error?.message || ''

    // 检查错误代码
    if (errorCode && retryableErrorCodes.includes(errorCode)) {
      return true
    }

    // 检查错误名称
    if (errorName && retryableErrorCodes.includes(errorName)) {
      return true
    }

    // 检查HTTP状态码 (5xx服务器错误可重试, 408/429可重试)
    if (typeof errorCode === 'number') {
      if (errorCode === 408 || errorCode === 429 || (errorCode >= 500 && errorCode < 600)) {
        return true
      }
    }

    // 检查错误消息中的关键词
    const retryableKeywords = ['timeout', 'EPIPE', 'ECONNRESET', 'socket', 'network']
    if (retryableKeywords.some(keyword => errorMessage.toLowerCase().includes(keyword.toLowerCase()))) {
      return true
    }

    // 权限错误、文件不存在等不可重试
    const nonRetryableKeywords = ['credentials', 'access denied', 'not found', '403', '404', 'NoSuchKey']
    if (nonRetryableKeywords.some(keyword => errorMessage.toLowerCase().includes(keyword.toLowerCase()))) {
      return false
    }

    // 默认认为可以重试
    return true
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 从URL上传文件到S3
   */
  async uploadFromUrl(
    url: string,
    pathPrefix: string = 'uploads',
    customFilename?: string
  ): Promise<string> {
    const axios = await import('axios')
    const response = await axios.default.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000,
    })

    const buffer = Buffer.from(response.data)
    const contentType = response.headers['content-type'] as string | undefined

    return this.uploadBuffer(buffer, pathPrefix, contentType, customFilename)
  }

  /**
   * 删除S3文件
   */
  async deleteFile(s3Key: string): Promise<void> {
    if (!this.client || !this.config) {
      throw new Error('S3 uploader not initialized. Call initialize() first.')
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.config.bucketName,
        Key: s3Key,
      })

      await this.client.send(command)
      logger.info({ s3Key }, 'Successfully deleted from AWS S3')
    } catch (error) {
      logger.error({ error }, 'Failed to delete from AWS S3')
      throw new Error(`S3 delete failed: ${error}`)
    }
  }

  /**
   * 生成唯一文件名
   */
  private generateUniqueFilename(extension = 'bin'): string {
    const timestamp = Date.now()
    const randomStr = crypto.randomBytes(8).toString('hex')
    return `${timestamp}_${randomStr}.${extension}`
  }

  /**
   * 检测内容类型
   */
  private detectContentType(buffer: Buffer): string {
    // 检查文件头魔数
    if (buffer[0] === 0xff && buffer[1] === 0xd8) {
      return 'image/jpeg'
    }
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      return 'image/png'
    }
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
      return 'image/gif'
    }
    if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
      return 'image/webp'
    }
    // MP4视频
    if (buffer.length > 8 && buffer.slice(4, 8).toString() === 'ftyp') {
      return 'video/mp4'
    }
    return 'application/octet-stream'
  }

  /**
   * 从内容类型获取扩展名
   */
  private getExtensionFromContentType(contentType: string): string {
    const typeMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'video/mp4': 'mp4',
      'video/quicktime': 'mov',
      'audio/mpeg': 'mp3',
      'audio/wav': 'wav',
    }

    return typeMap[contentType] || contentType.split('/')[1] || 'bin'
  }
}

// 导出单例实例
export const s3Uploader = new S3Uploader()

// 从环境变量自动初始化AWS S3
if (
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY &&
  process.env.AWS_REGION &&
  process.env.AWS_S3_BUCKET
) {
  s3Uploader.initialize({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
    bucketName: process.env.AWS_S3_BUCKET,
  })
  logger.info('AWS S3 uploader initialized from environment variables')
} else {
  logger.warn(
    'AWS S3 uploader not configured. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, and AWS_S3_BUCKET environment variables.'
  )
}

