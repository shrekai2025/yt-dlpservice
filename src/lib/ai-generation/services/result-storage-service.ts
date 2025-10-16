/**
 * Result Storage Service
 *
 * 统一管理AI生成结果的存储逻辑
 * 支持直接URL或自动上传到AWS S3
 */

import { s3Uploader } from '~/lib/services/s3-uploader'
import type { GenerationResult } from '../adapters/types'

export interface StorageConfig {
  uploadToS3: boolean
  s3PathPrefix?: string
}

export interface ProcessedResult {
  type: 'image' | 'video' | 'audio'
  url: string
  originalUrl?: string // 如果上传到S3，保留原始URL
  s3Key?: string // S3文件路径
}

export class ResultStorageService {
  /**
   * 处理生成结果
   * 根据配置决定是否上传到S3
   */
  async processResults(
    results: GenerationResult[],
    config: StorageConfig
  ): Promise<ProcessedResult[]> {
    if (!config.uploadToS3) {
      // 不上传S3，直接返回原始URL
      return results.map((r) => ({
        type: r.type,
        url: r.url,
      }))
    }

    // 上传到S3
    const processedResults: ProcessedResult[] = []

    for (const result of results) {
      try {
        const processed = await this.uploadResultToS3(result, config.s3PathPrefix)
        processedResults.push(processed)
      } catch (error) {
        console.error('[ResultStorageService] Failed to upload to S3, using original URL:', error)
        
        // 上传失败，回退到原始URL
        processedResults.push({
          type: result.type,
          url: result.url,
          originalUrl: result.url,
        })
      }
    }

    return processedResults
  }

  /**
   * 上传单个结果到S3
   */
  private async uploadResultToS3(
    result: GenerationResult,
    pathPrefix?: string
  ): Promise<ProcessedResult> {
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const fileExt = this.getFileExtension(result.url, result.type)
    
    // 构建S3路径
    const s3Key = pathPrefix
      ? `${pathPrefix}${timestamp}-${randomStr}.${fileExt}`
      : `ai-generation/${timestamp}-${randomStr}.${fileExt}`

    console.log(`[ResultStorageService] Uploading to S3: ${s3Key}`)

    // 下载文件
    const response = await fetch(result.url)
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`)
    }

    const buffer = await response.arrayBuffer()
    const contentType = this.getContentType(result.type)

    // 上传到AWS S3
    // 从s3Key中提取路径和文件名
    const lastSlashIndex = s3Key.lastIndexOf('/')
    const s3PathPrefix = lastSlashIndex > 0 ? s3Key.substring(0, lastSlashIndex) : 'ai-generation'
    const filename = lastSlashIndex > 0 ? s3Key.substring(lastSlashIndex + 1) : s3Key
    const customFilename = filename.replace(/\.[^.]+$/, '')

    const s3Url = await s3Uploader.uploadBuffer(
      Buffer.from(buffer),
      s3PathPrefix,
      contentType,
      customFilename
    )

    console.log(`[ResultStorageService] Uploaded to S3: ${s3Url}`)

    return {
      type: result.type,
      url: s3Url,
      originalUrl: result.url,
      s3Key,
    }
  }

  /**
   * 获取文件扩展名
   */
  private getFileExtension(url: string, type: string): string {
    // 尝试从URL提取扩展名
    const urlMatch = url.match(/\.([^./?#]+)(?:[?#]|$)/)
    if (urlMatch) {
      return urlMatch[1] ?? this.getDefaultExtension(type)
    }

    return this.getDefaultExtension(type)
  }

  /**
   * 获取默认扩展名
   */
  private getDefaultExtension(type: string): string {
    switch (type) {
      case 'image':
        return 'png'
      case 'video':
        return 'mp4'
      case 'audio':
        return 'mp3'
      default:
        return 'bin'
    }
  }

  /**
   * 获取Content-Type
   */
  private getContentType(type: string): string {
    switch (type) {
      case 'image':
        return 'image/png'
      case 'video':
        return 'video/mp4'
      case 'audio':
        return 'audio/mpeg'
      default:
        return 'application/octet-stream'
    }
  }

  /**
   * 批量删除S3文件（用于清理）
   */
  async deleteS3Results(s3Keys: string[]) {
    for (const key of s3Keys) {
      try {
        await s3Uploader.deleteFile(key)
        console.log('[ResultStorageService] Deleted S3 file:', key)
      } catch (error) {
        console.error('[ResultStorageService] Failed to delete S3 file:', key, error)
      }
    }
  }
}

export const resultStorageService = new ResultStorageService()

