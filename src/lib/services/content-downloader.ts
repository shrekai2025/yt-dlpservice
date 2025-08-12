import { platformRegistry } from '~/lib/platforms'
import { Logger } from '~/lib/utils/logger'
import { ConfigManager } from '~/lib/utils/config'
import { GlobalInit } from '~/lib/utils/global-init'
import { youtubeAuthService } from './youtube-auth'
import { 
  PlatformError,
  PlatformNotSupportedError, 
  DownloadError, 
  ContentInfoError,
  ConfigurationError 
} from '~/lib/utils/errors'
import type { ContentInfo, DownloadConfig, IPlatform } from '~/lib/platforms'
import type { DownloadOptions } from '~/types/task'
import { webBasedDownloader } from '~/lib/downloaders'
import type { ContentMetadata } from '~/lib/downloaders/types'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'

const execAsync = promisify(exec)

/**
 * 通用内容下载器
 * 使用平台插件化架构
 */
class ContentDownloader {
  private static instance: ContentDownloader
  private configManager: ConfigManager
  private ytDlpPath: string = 'yt-dlp'
  private ffmpegPath: string = 'ffmpeg'
  private isInitialized: boolean = false
  private initPromise: Promise<void> | null = null

  private constructor() {
    this.configManager = new ConfigManager()
    // 移除自动初始化，改为按需初始化
    // this.initPromise = this.initialize()
  }

  public static getInstance(): ContentDownloader {
    if (!ContentDownloader.instance) {
      ContentDownloader.instance = new ContentDownloader()
    }
    return ContentDownloader.instance
  }

  /**
   * 初始化下载器
   */
  private async initialize(): Promise<void> {
    // 尝试获取初始化权限
    if (!GlobalInit.tryInitializeContentDownloader()) {
      // 如果没有获取到权限，等待其他实例完成初始化
      await GlobalInit.waitForContentDownloader()
      return
    }
    
    if (this.isInitialized) return

    try {
      Logger.info('开始初始化ContentDownloader...')
      
      // 检测yt-dlp路径
      await this.detectYtDlpPath()
      
      // 检测FFmpeg路径
      this.ffmpegPath = await this.detectFFmpegPath()
      
      Logger.info('✅ ContentDownloader初始化完成')
      this.isInitialized = true
      GlobalInit.setContentDownloaderInitialized({
        ytDlpPath: this.ytDlpPath,
        ffmpegPath: this.ffmpegPath
      })
      
      // 初始化完成后立即初始化平台插件
      const { initializePlatforms } = await import('~/lib/platforms')
      initializePlatforms(this.ytDlpPath)
      Logger.info('✅ 平台插件已同步初始化')
    } catch (error: any) {
      GlobalInit.setContentDownloaderInitializationFailed()
      Logger.error(`ContentDownloader初始化失败: ${error.message}`)
      throw error
    }
  }

  /**
   * 确保初始化完成
   */
  private async ensureInitialized(): Promise<void> {
    if (GlobalInit.isContentDownloaderInitialized()) {
      // 如果全局已初始化，但实例状态不同步，需要同步状态
      if (!this.isInitialized) {
        const savedData = GlobalInit.getContentDownloaderData()
        if (savedData && savedData.ytDlpPath) {
          this.isInitialized = true
          this.ytDlpPath = savedData.ytDlpPath
          this.ffmpegPath = savedData.ffmpegPath || 'ffmpeg'
        }
      }
      return
    }
    
    if (!this.isInitialized) {
      if (!this.initPromise) {
        this.initPromise = this.initialize()
      }
      await this.initPromise
    }
  }

  /**
   * 获取检测到的yt-dlp路径
   */
  async getYtDlpPath(): Promise<string> {
    await this.ensureInitialized()
    return this.ytDlpPath
  }

  /**
   * 获取内容信息
   */
  async getContentInfo(url: string): Promise<ContentInfo> {
    await this.ensureInitialized()
    
    try {
      // 查找对应的平台
      const platform = await platformRegistry.findPlatformForUrl(url)
      
      // 检查是否使用自定义下载器
      if (platform.downloadMethod === 'custom' && platform.getExtractor) {
        const extractor = platform.getExtractor()
        const metadata = await webBasedDownloader.getContentInfo(url, extractor)
        
        // 转换为 ContentInfo 格式
        return this.convertMetadataToContentInfo(metadata, platform.name)
      }
      
      // 使用 yt-dlp 获取内容信息
      const contentInfo = await platform.getContentInfo(url)
      
      Logger.info(`✅ 获取内容信息成功: ${contentInfo.title} (${contentInfo.platform})`)
      return contentInfo
    } catch (error: any) {
      // 区分错误类型
      if (error.message?.includes('没有找到支持该URL的平台')) {
        throw new PlatformNotSupportedError(url)
      }
      
      Logger.error(`获取内容信息失败: ${error.message}`)
      throw new ContentInfoError(`获取内容信息失败: ${error.message}`, error)
    }
  }

  /**
   * 下载内容
   */
  async downloadContent(url: string, options: DownloadOptions): Promise<{ videoPath?: string; audioPath?: string; metadata?: ContentMetadata }> {
    await this.ensureInitialized()
    
    try {
      // 查找对应的平台
      const platform = await platformRegistry.findPlatformForUrl(url)
      
      // 标准化URL
      const normalizedUrl = await platform.normalizeUrl(url)
      
      // 检查是否使用自定义下载器
      if (platform.downloadMethod === 'custom' && platform.getExtractor) {
        const extractor = platform.getExtractor()
        const result = await webBasedDownloader.downloadContent(
          normalizedUrl,
          extractor,
          options.downloadType,
          {
            outputDir: options.outputDir,
            timeout: 180000,
            headless: true
          }
        )
        
        return {
          videoPath: result.videoPath,
          audioPath: result.audioPath,
          metadata: result.metadata
        }
      }
      
      // 使用 yt-dlp 下载
      const downloadConfig = await platform.getDownloadConfig(normalizedUrl, options.downloadType)
      
      // 执行下载
      return await this.executeDownload(platform, normalizedUrl, downloadConfig, options)
    } catch (error: any) {
      // 如果是我们定义的错误类型，直接抛出
      if (error instanceof PlatformError) {
        throw error
      }
      
      Logger.error(`下载内容失败: ${error.message}`)
      throw new DownloadError(`下载内容失败: ${error.message}`, error)
    }
  }

  /**
   * 执行下载
   */
  private async executeDownload(
    platform: IPlatform,
    url: string,
    config: DownloadConfig,
    options: DownloadOptions
  ): Promise<{ videoPath?: string; audioPath?: string; metadata?: ContentMetadata }> {
    const { outputDir } = options
    
    // 确保输出目录存在
    await fs.mkdir(outputDir, { recursive: true })
    
    // 在下载前获取内容信息，用于回填元数据（避免等待异步爬虫）
    let preFetchedMetadata: ContentMetadata | undefined
    try {
      const contentInfo = await platform.getContentInfo(url)
      preFetchedMetadata = {
        title: contentInfo.title,
        description: contentInfo.description,
        duration: contentInfo.duration,
        coverUrl: contentInfo.thumbnail,
        platform: contentInfo.platform,
        // 附加原始字段，供后续 extraMetadata 映射使用
        uploader: contentInfo.uploader,
        upload_date: contentInfo.upload_date,
        view_count: contentInfo.view_count,
        like_count: contentInfo.like_count,
        thumbnail: contentInfo.thumbnail
      }
    } catch (e) {
      Logger.warn(`预取内容信息失败，将继续下载流程: ${e instanceof Error ? e.message : String(e)}`)
    }

    // 构建基础命令
    let command = this.buildYtDlpCommand(`-f "${config.format}" -o "${path.join(outputDir, config.outputTemplate)}"`)
    
    // 添加音频提取参数
    if (config.extractAudio) {
      command += ' --extract-audio'
      if (config.additionalArgs) {
        for (const arg of config.additionalArgs) {
          command += ` ${arg}`
        }
      }
    }
    
    // 添加FFmpeg路径
    if (this.ffmpegPath && this.ffmpegPath !== 'ffmpeg') {
      command += ` --ffmpeg-location "${this.ffmpegPath}"`
    }
    
    // 如果是YouTube URL，添加Cookie支持
    if (platform.name === 'youtube') {
      const hasCookies = await youtubeAuthService.ensureValidCookies()
      if (hasCookies) {
        const cookieFilePath = youtubeAuthService.getCookieFilePath()
        command += ` --cookies "${cookieFilePath}"`
        Logger.info(`🍪 使用YouTube Cookie进行下载: ${cookieFilePath}`)
      }
    }
    
    // 添加平台特定参数
    command = await platform.addPlatformSpecificArgs(command, url, true)
    
    // 添加URL
    command += ` "${url}"`
    
    Logger.info(`执行下载命令: ${command}`)
    
    // 执行下载
    // 对于某些URL，yt-dlp可能输出很长的JSON或日志，这里提高缓冲区并禁用playlist
    const safeCommand = command + ' --no-playlist'
    const { stdout } = await execAsync(safeCommand, { maxBuffer: 50 * 1024 * 1024 })
    Logger.info(`下载完成: ${stdout}`)
    
    // 解析下载结果
    const paths = await this.parseDownloadResult(stdout, outputDir, config)
    return { ...paths, ...(preFetchedMetadata ? { metadata: preFetchedMetadata } : {}) }
  }

  /**
   * 解析下载结果
   */
  private async parseDownloadResult(
    output: string,
    outputDir: string,
    config: DownloadConfig
  ): Promise<{ videoPath?: string; audioPath?: string }> {
    const result: { videoPath?: string; audioPath?: string } = {}
    
    try {
      // 读取输出目录，查找生成的文件
      const files = await fs.readdir(outputDir)
      Logger.debug(`输出目录文件列表: ${files.join(', ')}`)
      
      if (config.audioOnly || config.extractAudio) {
        // 查找音频文件
        const audioFile = files.find(file => 
          file.includes('_audio') && (file.endsWith('.mp3') || file.endsWith('.m4a') || file.endsWith('.wav'))
        )
        if (audioFile) {
          result.audioPath = path.join(outputDir, audioFile)
          Logger.info(`找到音频文件: ${result.audioPath}`)
        }
      } else {
        // 查找视频文件
        const videoFile = files.find(file => 
          file.includes('_video') && (file.endsWith('.mp4') || file.endsWith('.webm') || file.endsWith('.mkv'))
        )
        if (videoFile) {
          result.videoPath = path.join(outputDir, videoFile)
          Logger.info(`找到视频文件: ${result.videoPath}`)
        }
      }
      
      return result
    } catch (error) {
      Logger.error(`解析下载结果失败: ${error}`)
      throw new DownloadError(`解析下载结果失败: ${error}`, error instanceof Error ? error : undefined)
    }
  }

  /**
   * 检查可用性
   */
  async checkAvailability(): Promise<{ available: boolean; version?: string; path: string }> {
    await this.ensureInitialized()
    
    try {
      const { stdout } = await execAsync(this.buildYtDlpCommand('--version'))
      const version = stdout.trim()
      return { available: true, version, path: this.ytDlpPath }
    } catch (error) {
      return { available: false, path: this.ytDlpPath }
    }
  }

  /**
   * 构建yt-dlp命令的基础部分
   */
  private buildYtDlpCommand(args: string): string {
    if (this.ytDlpPath.includes('python3 -m')) {
      return `${this.ytDlpPath} ${args}`
    } else {
      return `${this.ytDlpPath} ${args}`
    }
  }

  /**
   * 检测yt-dlp路径
   */
  private async detectYtDlpPath(): Promise<void> {
    const possiblePaths = [
      'yt-dlp',
      '/usr/local/bin/yt-dlp',
      '/usr/bin/yt-dlp',
      '/home/ubuntu/.local/bin/yt-dlp',
      process.env.HOME + '/.local/bin/yt-dlp',
      '/opt/homebrew/bin/yt-dlp',
      '/usr/local/opt/yt-dlp/bin/yt-dlp',
      '/Users/' + process.env.USER + '/Library/Python/3.9/bin/yt-dlp',
      '/Users/' + process.env.USER + '/Library/Python/3.8/bin/yt-dlp',
      '/Users/' + process.env.USER + '/Library/Python/3.10/bin/yt-dlp',
      '/Users/' + process.env.USER + '/Library/Python/3.11/bin/yt-dlp',
      '/Users/' + process.env.USER + '/Library/Python/3.12/bin/yt-dlp',
      'python3 -m yt_dlp'
    ]

    Logger.info('开始检测yt-dlp路径...')

    for (const testPath of possiblePaths) {
      try {
        Logger.debug(`测试路径: ${testPath}`)
        
        if (testPath.includes('python3 -m')) {
          await execAsync(`${testPath} --version`)
          this.ytDlpPath = testPath
          Logger.info(`✅ 使用yt-dlp路径: ${this.ytDlpPath}`)
          return
        } else {
          await execAsync(`"${testPath}" --version`)
          this.ytDlpPath = testPath
          Logger.info(`✅ 使用yt-dlp路径: ${this.ytDlpPath}`)
          return
        }
      } catch (error) {
        Logger.debug(`路径 ${testPath} 不可用`)
        continue
      }
    }

    Logger.error('❌ 未找到yt-dlp，使用默认路径')
  }

  /**
   * 检测FFmpeg路径
   */
  private async detectFFmpegPath(): Promise<string> {
    const possiblePaths = [
      'ffmpeg',
      '/usr/bin/ffmpeg',
      '/usr/local/bin/ffmpeg',
      '/opt/homebrew/bin/ffmpeg',
      '/snap/bin/ffmpeg',
      'C:\\ffmpeg\\bin\\ffmpeg.exe',
    ]

    for (const testPath of possiblePaths) {
      try {
        Logger.debug(`测试FFmpeg路径: ${testPath}`)
        await execAsync(`"${testPath}" -version`)
        Logger.info(`✅ 使用FFmpeg路径: ${testPath}`)
        return testPath
      } catch (error) {
        Logger.debug(`FFmpeg路径 ${testPath} 不可用`)
        continue
      }
    }

    Logger.warn('⚠️ 未找到FFmpeg，使用默认路径 ffmpeg')
    return 'ffmpeg'
  }

  /**
   * 清理文件
   */
  async cleanupFiles(directory: string, olderThanHours: number = 24): Promise<void> {
    await this.ensureInitialized()
    try {
      const files = await fs.readdir(directory)
      const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000)
      
      for (const file of files) {
        const filePath = path.join(directory, file)
        const stat = await fs.stat(filePath)
        
        if (stat.mtime.getTime() < cutoffTime) {
          await fs.unlink(filePath)
          Logger.info(`清理过期文件: ${filePath}`)
        }
      }
    } catch (error) {
      Logger.error(`清理文件失败: ${error}`)
    }
  }
  
  /**
   * 将元数据转换为 ContentInfo
   */
  private convertMetadataToContentInfo(metadata: ContentMetadata, platformName: string): ContentInfo {
    return {
      id: Date.now().toString(),
      title: metadata.title,
      duration: metadata.duration || 0,
      contentType: metadata.platform === 'xiaoyuzhou' ? 'podcast' : 'video',
      platform: metadata.platform,
      thumbnail: metadata.coverUrl,
      uploader: platformName,
      description: metadata.description
    }
  }
}

export const contentDownloader = ContentDownloader.getInstance() 