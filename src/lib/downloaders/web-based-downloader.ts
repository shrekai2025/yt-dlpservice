import { Logger } from '~/lib/utils/logger'
import { DownloadError, ContentInfoError } from '~/lib/utils/errors'
import { browserManager } from '~/lib/services/browser-manager'
import type { 
  PlatformExtractor, 
  ParsedContent, 
  DownloadResult, 
  WebDownloaderOptions,
  DownloadType 
} from './types'
import type { Page } from 'puppeteer'
import axios from 'axios'
import * as fs from 'fs/promises'
import * as path from 'path'

/**
 * 通用网页解析下载器
 * 用于不依赖 yt-dlp 的平台下载
 */
export class WebBasedDownloader {
  private static instance: WebBasedDownloader

  private constructor() {}

  public static getInstance(): WebBasedDownloader {
    if (!WebBasedDownloader.instance) {
      WebBasedDownloader.instance = new WebBasedDownloader()
    }
    return WebBasedDownloader.instance
  }

  /**
   * 下载内容
   */
  async downloadContent(
    url: string,
    extractor: PlatformExtractor,
    downloadType: DownloadType,
    options: WebDownloaderOptions
  ): Promise<DownloadResult> {
    const { outputDir, timeout = 180000, headless = true } = options
    
    let page: Page | null = null
    
    try {
      // 确保输出目录存在
      await fs.mkdir(outputDir, { recursive: true })
      
      // 从 BrowserManager 获取页面
      page = await browserManager.getPage({ headless, timeout })
      
      // 访问页面
      Logger.info(`WebBasedDownloader: 正在访问页面 ${url}`)
      await page.goto(url, { waitUntil: 'networkidle2' })
      
      // 等待一定时间确保页面加载完成
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)))
      
      // 使用提取器解析内容
      Logger.info('WebBasedDownloader: 开始解析页面内容')
      const parsedContent = await extractor.extractFromPage(page, url)
      
      // 根据下载类型下载文件
      const downloadResult = await this.downloadFiles(parsedContent, downloadType, outputDir)
      
      // 返回结果
      return {
        ...downloadResult,
        metadata: parsedContent.metadata
      }
    } catch (error: any) {
      Logger.error(`WebBasedDownloader: 下载失败 - ${error.message}`)
      throw new DownloadError(`下载失败: ${error.message}`, error)
    } finally {
      // 释放页面
      if (page) {
        await browserManager.releasePage(page)
      }
    }
  }

  /**
   * 下载文件
   */
  private async downloadFiles(
    parsedContent: ParsedContent,
    downloadType: DownloadType,
    outputDir: string
  ): Promise<{ videoPath?: string; audioPath?: string }> {
    const result: { videoPath?: string; audioPath?: string } = {}
    
    // 根据下载类型决定下载什么
    if (downloadType === 'AUDIO_ONLY' || downloadType === 'BOTH') {
      if (parsedContent.audioUrls && parsedContent.audioUrls.length > 0) {
        const audioUrl = parsedContent.audioUrls[0]
        if (audioUrl) {
          const audioPath = await this.downloadFile(
            audioUrl,
            outputDir,
            `${parsedContent.metadata.platform}_audio`,
            this.getFileExtensionFromUrl(audioUrl) || 'mp3'
          )
          result.audioPath = audioPath
        }
      }
    }
    
    if (downloadType === 'VIDEO_ONLY' || downloadType === 'BOTH') {
      if (parsedContent.videoUrls && parsedContent.videoUrls.length > 0) {
        const videoUrl = parsedContent.videoUrls[0]
        if (videoUrl) {
          const videoPath = await this.downloadFile(
            videoUrl,
            outputDir,
            `${parsedContent.metadata.platform}_video`,
            this.getFileExtensionFromUrl(videoUrl) || 'mp4'
          )
          result.videoPath = videoPath
        }
      }
    }
    
    // 验证下载结果
    if (downloadType === 'AUDIO_ONLY' && !result.audioPath) {
      throw new DownloadError('未能下载音频文件')
    }
    
    if (downloadType === 'VIDEO_ONLY' && !result.videoPath) {
      throw new DownloadError('未能下载视频文件')
    }
    
    return result
  }

  /**
   * 下载单个文件
   */
  private async downloadFile(
    url: string,
    outputDir: string,
    filePrefix: string,
    extension: string
  ): Promise<string> {
    try {
      // 生成文件名
      const timestamp = Date.now()
      const filename = `${filePrefix}_${timestamp}.${extension}`
      const filepath = path.join(outputDir, filename)
      
      Logger.info(`WebBasedDownloader: 正在下载文件 ${url} 到 ${filepath}`)
      
      // 下载文件
      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream',
        timeout: 300000, // 5分钟超时
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      })
      
      // 创建写入流
      const writer = await fs.open(filepath, 'w')
      const stream = writer.createWriteStream()
      
      // 管道数据
      response.data.pipe(stream)
      
      // 等待下载完成
      await new Promise<void>((resolve, reject) => {
        stream.on('finish', () => resolve())
        stream.on('error', reject)
      })
      
      await writer.close()
      
      Logger.info(`WebBasedDownloader: 文件下载完成 ${filepath}`)
      return filepath
    } catch (error: any) {
      Logger.error(`WebBasedDownloader: 文件下载失败 - ${error.message}`)
      throw new DownloadError(`文件下载失败: ${error.message}`, error)
    }
  }

  /**
   * 从URL获取文件扩展名
   */
  private getFileExtensionFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url)
      const pathname = urlObj.pathname
      const match = pathname.match(/\.([a-zA-Z0-9]+)(\?|$)/)
      return match && match[1] ? match[1] : null
    } catch {
      return null
    }
  }

  /**
   * 获取内容信息
   */
  async getContentInfo(
    url: string,
    extractor: PlatformExtractor,
    options: { timeout?: number; headless?: boolean } = {}
  ): Promise<ParsedContent['metadata']> {
    const { timeout = 180000, headless = true } = options
    
    let page: Page | null = null
    
    try {
      // 从 BrowserManager 获取页面
      page = await browserManager.getPage({ headless, timeout })
      
      // 访问页面
      Logger.info(`WebBasedDownloader: 正在获取内容信息 ${url}`)
      await page.goto(url, { waitUntil: 'networkidle2' })
      
      // 等待页面加载
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)))
      
      // 解析内容
      const parsedContent = await extractor.extractFromPage(page, url)
      
      return parsedContent.metadata
    } catch (error: any) {
      Logger.error(`WebBasedDownloader: 获取内容信息失败 - ${error.message}`)
      throw new ContentInfoError(`获取内容信息失败: ${error.message}`, error)
    } finally {
      // 释放页面
      if (page) {
        await browserManager.releasePage(page)
      }
    }
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    await browserManager.cleanup()
  }
}

export const webBasedDownloader = WebBasedDownloader.getInstance() 