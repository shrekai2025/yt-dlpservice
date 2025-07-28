import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import { Logger } from '~/lib/utils/logger'
import { ConfigManager } from '~/lib/utils/config'
import { browserManager } from './browser-manager'

const execAsync = promisify(exec)

export interface DownloadOptions {
  taskId: string
  outputDir?: string
  quality?: string
  useBrowserCookies?: boolean
}

export interface VideoInfo {
  title: string
  description?: string
  duration: number
  uploader?: string
  uploadDate?: string
  viewCount?: number
  thumbnail?: string
  formats?: Array<{
    formatId: string
    ext: string
    quality?: string | number
    filesize?: number
    url?: string
  }>
  originalData?: any
}

export class VideoDownloader {
  private static instance: VideoDownloader
  private ytDlpPath: string

  constructor() {
    // 自动检测 yt-dlp 路径 - 支持开发和生产环境
    this.ytDlpPath = this.detectYtDlpPath()
  }

  private detectYtDlpPath(): string {
    // 常见的 yt-dlp 安装路径
    const possiblePaths = [
      '/Users/uniteyoo/Library/Python/3.9/bin/yt-dlp', // macOS 开发环境
      '/home/ubuntu/.local/bin/yt-dlp', // Ubuntu 用户安装
      '/root/.local/bin/yt-dlp', // Ubuntu root 安装
      '/usr/local/bin/yt-dlp', // 系统级安装
      '/usr/bin/yt-dlp', // 包管理器安装
      'yt-dlp' // 系统 PATH 中
    ]

    // 如果是开发环境，使用硬编码的本地路径
    if (process.env.NODE_ENV === 'development') {
      return '/Users/uniteyoo/Library/Python/3.9/bin/yt-dlp'
    }

    // 生产环境自动检测
    for (const path of possiblePaths) {
      try {
        // 这里我们返回最可能的路径，实际检测在 checkAvailability 中进行
        if (path.includes('/home/ubuntu/') || path.includes('/.local/bin/')) {
          return path
        }
      } catch {
        continue
      }
    }

    // 默认返回用户本地安装路径
    return `${process.env.HOME}/.local/bin/yt-dlp`
  }

  static getInstance(): VideoDownloader {
    if (!VideoDownloader.instance) {
      VideoDownloader.instance = new VideoDownloader()
    }
    return VideoDownloader.instance
  }

  async getVideoInfo(url: string, useBrowserCookies = true): Promise<VideoInfo> {
    try {
      Logger.info(`Getting video info for: ${url}`)

      // 构建基础命令
      let command = `"${this.ytDlpPath}" --dump-json --no-download --no-warnings --ffmpeg-location /opt/homebrew/bin/ffmpeg`

      // 如果是 YouTube URL 且启用浏览器 cookies
      if ((url.includes('youtube.com') || url.includes('youtu.be')) && useBrowserCookies) {
        try {
          // 确保 BrowserManager 已初始化
          await browserManager.initialize()
          
          // 检查登录状态
          const loginStatus = await browserManager.getLoginStatus()
          
          if (loginStatus.isLoggedIn) {
            // 获取 cookies 文件
            const cookiesFile = await browserManager.getCookiesForYtDlp()
            command += ` --cookies "${cookiesFile}"`
            Logger.info('使用专用浏览器的 YouTube cookies')
          } else {
            Logger.warn('专用浏览器未登录，将尝试不使用 cookies')
          }
        } catch (error) {
          Logger.warn(`Failed to get browser cookies: ${error}`)
          Logger.info('继续使用无 cookies 模式')
        }
      }

      command += ` "${url}"`

      const { stdout } = await execAsync(command)
      const videoData = JSON.parse(stdout)

      const videoInfo: VideoInfo = {
        title: videoData.title || 'Unknown Title',
        description: videoData.description,
        duration: videoData.duration || 0,
        uploader: videoData.uploader,
        uploadDate: videoData.upload_date,
        viewCount: videoData.view_count,
        thumbnail: videoData.thumbnail,
        formats: videoData.formats?.map((format: any) => ({
          formatId: format.format_id,
          ext: format.ext,
          quality: format.quality || format.height,
          filesize: format.filesize,
          url: format.url
        })),
        originalData: videoData
      }

      return videoInfo

    } catch (error) {
      Logger.error(`Failed to get video info: ${error}`)
      
      // 检查是否是 YouTube 认证错误
      if (error instanceof Error && this.isYouTubeAuthError(error.message)) {
        Logger.warn('检测到 YouTube 需要登录认证')
        
        // 如果是 YouTube URL，尝试自动登录
        if ((url.includes('youtube.com') || url.includes('youtu.be')) && useBrowserCookies) {
          const loginSuccess = await this.handleYouTubeAuthRequired()
          
          if (loginSuccess) {
            Logger.info('登录成功，重试获取视频信息...')
            // 递归调用，但不再尝试浏览器登录以避免无限循环
            return await this.getVideoInfo(url, false)
          }
        }
        
        // 返回需要认证的基础信息
        return {
          title: 'YouTube Video (Authentication Required)',
          description: 'This YouTube video requires authentication. Please complete login in the browser.',
          duration: 0,
          uploader: 'YouTube',
          uploadDate: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
          viewCount: 0,
          thumbnail: '',
          formats: [],
          originalData: { url, error: 'Authentication required', authAttempted: true }
        }
      }
      
      throw new Error(`Failed to get video info: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 检查是否是 YouTube 认证错误
   */
  private isYouTubeAuthError(errorMessage: string): boolean {
    const authErrors = [
      'Sign in to confirm you\'re not a bot',
      'Sign in to confirm',
      'This video is unavailable',
      'Private video',
      'Join this channel to get access',
      'Video unavailable',
      'Members-only content',
      'This video requires payment'
    ]
    
    return authErrors.some(authError => errorMessage.includes(authError))
  }

  /**
   * 处理 YouTube 需要认证的情况
   */
  private async handleYouTubeAuthRequired(): Promise<boolean> {
    try {
      Logger.info('🚀 自动启动 YouTube 登录流程...')
      
      // 初始化浏览器管理器
      await browserManager.initialize()
      
      // 检查当前登录状态
      const currentStatus = await browserManager.getLoginStatus()
      if (currentStatus.isLoggedIn) {
        Logger.info('检测到已有登录状态，刷新登录信息...')
        return await browserManager.refreshLogin()
      }
      
      // 创建新的登录会话
      Logger.info('创建新的 YouTube 登录会话...')
      const session = await browserManager.createYouTubeSession()
      
      if (session.isLoggedIn) {
        Logger.info('检测到已有的登录状态')
        return true
      }
      
      // 启动登录流程
      Logger.info('🌐 正在打开专用浏览器，请在其中完成 YouTube 登录...')
      const loginResult = await browserManager.promptForLogin()
      
      if (loginResult) {
        Logger.info('✅ YouTube 登录成功！登录状态已保存')
        return true
      } else {
        Logger.warn('❌ YouTube 登录失败或超时')
        return false
      }
      
    } catch (error) {
      Logger.error(`自动登录失败: ${error}`)
      return false
    }
  }

  async downloadVideo(url: string, options: DownloadOptions): Promise<string> {
    try {
      const config = await ConfigManager.getTyped()
      const outputDir = options.outputDir || config.tempDir

      // 确保输出目录存在
      await fs.mkdir(outputDir, { recursive: true })

      Logger.info(`Starting video download: ${url}`)

      // 构建yt-dlp命令
      const outputTemplate = path.join(outputDir, `${options.taskId}.%(ext)s`)
      let command = [
        `"${this.ytDlpPath}"`,
        '--no-warnings',
        '--no-playlist',
        '--write-info-json',
        '--write-thumbnail',
        '--ffmpeg-location /opt/homebrew/bin/ffmpeg'
      ]

      // 如果是 YouTube URL 且启用浏览器 cookies
      if ((url.includes('youtube.com') || url.includes('youtu.be')) && options.useBrowserCookies !== false) {
        try {
          await browserManager.initialize()
          const loginStatus = await browserManager.getLoginStatus()
          
          if (loginStatus.isLoggedIn) {
            const cookiesFile = await browserManager.getCookiesForYtDlp()
            command.push(`--cookies "${cookiesFile}"`)
            Logger.info('使用专用浏览器的 YouTube cookies 进行下载')
          }
        } catch (error) {
          Logger.warn(`Failed to get browser cookies for download: ${error}`)
        }
      }

      command.push(`--output "${outputTemplate}"`)
      command.push(`"${url}"`)

      const finalCommand = command.join(' ')
      Logger.info(`Executing command: ${finalCommand}`)

      const { stdout, stderr } = await execAsync(finalCommand, {
        timeout: 30 * 60 * 1000, // 30分钟超时
      })

      if (stderr && !stderr.includes('WARNING')) {
        Logger.warn(`yt-dlp stderr: ${stderr}`)
      }

      Logger.info(`yt-dlp stdout: ${stdout}`)

      // 查找下载的视频文件
      const files = await fs.readdir(outputDir)
      const videoFiles = files.filter(file => 
        file.startsWith(options.taskId) && 
        !file.endsWith('.info.json') && 
        !file.endsWith('.webp') &&
        !file.endsWith('.jpg') &&
        !file.endsWith('.png')
      )

      if (videoFiles.length === 0) {
        throw new Error('No video file found after download')
      }

      const videoFile = path.join(outputDir, videoFiles[0]!)
      Logger.info(`Video downloaded successfully: ${videoFile}`)
      return videoFile

    } catch (error) {
      Logger.error(`Video download failed: ${error}`)
      
      // 检查是否是认证错误，如果是则尝试自动登录
      if (error instanceof Error && this.isYouTubeAuthError(error.message)) {
        Logger.warn('下载时检测到 YouTube 认证错误，尝试自动登录...')
        
        if ((url.includes('youtube.com') || url.includes('youtu.be')) && options.useBrowserCookies !== false) {
          const loginSuccess = await this.handleYouTubeAuthRequired()
          
          if (loginSuccess) {
            Logger.info('登录成功，重试下载...')
            // 递归调用，但禁用浏览器 cookies 以避免无限循环
            return await this.downloadVideo(url, { ...options, useBrowserCookies: false })
          }
        }
      }
      
      throw new Error(`Video download failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async downloadAudio(url: string, options: DownloadOptions): Promise<string> {
    try {
      const config = await ConfigManager.getTyped()
      const outputDir = options.outputDir || config.tempDir

      // 确保输出目录存在
      await fs.mkdir(outputDir, { recursive: true })

      Logger.info(`Starting audio download: ${url}`)

      // 构建yt-dlp命令（仅音频）
      const outputTemplate = path.join(outputDir, `${options.taskId}_audio.%(ext)s`)
      let command = [
        `"${this.ytDlpPath}"`,
        '--extract-audio',
        `--audio-format ${config.audioFormat}`,
        `--audio-quality ${config.audioBitrate}`,
        '--no-playlist',
        '--write-info-json',
        '--ffmpeg-location /opt/homebrew/bin/ffmpeg'
      ]

      // 如果是 YouTube URL 且启用浏览器 cookies
      if ((url.includes('youtube.com') || url.includes('youtu.be')) && options.useBrowserCookies !== false) {
        try {
          await browserManager.initialize()
          const loginStatus = await browserManager.getLoginStatus()
          
          if (loginStatus.isLoggedIn) {
            const cookiesFile = await browserManager.getCookiesForYtDlp()
            command.push(`--cookies "${cookiesFile}"`)
            Logger.info('使用专用浏览器的 YouTube cookies 进行音频下载')
          }
        } catch (error) {
          Logger.warn(`Failed to get browser cookies for audio download: ${error}`)
        }
      }

      command.push(`--output "${outputTemplate}"`)
      command.push(`"${url}"`)

      const finalCommand = command.join(' ')
      Logger.info(`Executing audio command: ${finalCommand}`)

      const { stdout, stderr } = await execAsync(finalCommand, {
        timeout: 30 * 60 * 1000, // 30分钟超时
      })

      if (stderr && !stderr.includes('WARNING')) {
        Logger.warn(`yt-dlp stderr: ${stderr}`)
      }

      Logger.info(`yt-dlp stdout: ${stdout}`)

      // 查找下载的音频文件
      const files = await fs.readdir(outputDir)
      const audioFiles = files.filter(file => 
        file.startsWith(`${options.taskId}_audio`) && 
        !file.endsWith('.info.json')
      )

      if (audioFiles.length === 0) {
        throw new Error('No audio file found after download')
      }

      const audioFile = path.join(outputDir, audioFiles[0]!)
      Logger.info(`Audio downloaded successfully: ${audioFile}`)
      return audioFile

    } catch (error) {
      Logger.error(`Audio download failed: ${error}`)
      
      // 检查是否是认证错误，如果是则尝试自动登录
      if (error instanceof Error && this.isYouTubeAuthError(error.message)) {
        Logger.warn('音频下载时检测到 YouTube 认证错误，尝试自动登录...')
        
        if ((url.includes('youtube.com') || url.includes('youtu.be')) && options.useBrowserCookies !== false) {
          const loginSuccess = await this.handleYouTubeAuthRequired()
          
          if (loginSuccess) {
            Logger.info('登录成功，重试音频下载...')
            // 递归调用，但禁用浏览器 cookies 以避免无限循环
            return await this.downloadAudio(url, { ...options, useBrowserCookies: false })
          }
        }
      }
      
      throw new Error(`Audio download failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getSupportedPlatforms(): Promise<string[]> {
    try {
      const { stdout } = await execAsync(`"${this.ytDlpPath}" --list-extractors`)
      const extractors = stdout.split('\n').filter(line => line.trim())
      return extractors.slice(0, 10) // 返回前10个作为示例
    } catch (error) {
      Logger.error(`Failed to get supported platforms: ${error}`)
      return ['youtube', 'bilibili'] // 默认支持的平台
    }
  }

  async checkAvailability(): Promise<{ available: boolean; version?: string; path: string }> {
    try {
      const { stdout } = await execAsync(`"${this.ytDlpPath}" --version`)
      return {
        available: true,
        version: stdout.trim(),
        path: this.ytDlpPath
      }
    } catch (error) {
      Logger.error(`yt-dlp not available: ${error}`)
      return {
        available: false,
        path: this.ytDlpPath
      }
    }
  }

  async cleanupFiles(directory: string, olderThanHours: number = 1): Promise<void> {
    try {
      const files = await fs.readdir(directory)
      const now = Date.now()
      const maxAge = olderThanHours * 60 * 60 * 1000

      for (const file of files) {
        const filePath = path.join(directory, file)
        const stats = await fs.stat(filePath)
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath)
          Logger.info(`Cleaned up old file: ${file}`)
        }
      }
    } catch (error) {
      Logger.error(`Failed to cleanup files: ${error}`)
    }
  }
} 