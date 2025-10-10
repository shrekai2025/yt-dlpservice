/**
 * S3 Uploader Service
 *
 * Handles uploading files to AWS S3
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { generateUniqueFilename, detectImageFormat } from './image-utils'
import { createLogger } from '~/lib/logger'

const logger = createLogger({ module: 's3-uploader' })

interface S3Config {
  accessKeyId: string
  secretAccessKey: string
  region: string
  bucketName: string
}

class S3Uploader {
  private client: S3Client | null = null
  private config: S3Config | null = null

  /**
   * Initialize S3 client with configuration
   */
  initialize(config: S3Config): void {
    this.config = config
    this.client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    })
  }

  /**
   * Check if S3 uploader is configured
   */
  isConfigured(): boolean {
    return this.client !== null && this.config !== null
  }

  /**
   * Upload buffer to S3
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

    // Detect file format if content type not provided
    if (!contentType) {
      const format = detectImageFormat(buffer)
      contentType = `image/${format}`
    }

    // Generate filename
    const extension = contentType.split('/')[1] || 'bin'
    const filename = customFilename
      ? `${customFilename}.${extension}`
      : generateUniqueFilename(extension)
    const key = `${pathPrefix}/${filename}`

    try {
      const command = new PutObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })

      await this.client.send(command)

      // Return public URL
      const url = `https://${this.config.bucketName}.s3.${this.config.region}.amazonaws.com/${key}`
      logger.info({ url }, 'Successfully uploaded to S3')
      return url
    } catch (error) {
      logger.error({ error }, 'Failed to upload to S3')
      throw new Error(`S3 upload failed: ${error}`)
    }
  }

  /**
   * Upload file from URL to S3
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
   * Delete file from S3
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
      logger.info({ s3Key }, 'Successfully deleted from S3')
    } catch (error) {
      logger.error({ error }, 'Failed to delete from S3')
      throw new Error(`S3 delete failed: ${error}`)
    }
  }
}

// Export singleton instance
export const s3Uploader = new S3Uploader()

// Initialize from environment variables if available
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
  logger.info('S3 uploader initialized from environment variables')
} else {
  logger.warn(
    'S3 uploader not configured. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, and AWS_S3_BUCKET environment variables.'
  )
}
