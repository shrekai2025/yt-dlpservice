import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import { Logger } from '~/lib/utils/logger'
import { ConfigManager } from '~/lib/utils/config'
import type { VideoInfo, DownloadOptions, DownloadType } from '~/types/task'
import { browserManager } from './browser-manager'

const execAsync = promisify(exec)

export class VideoDownloader {
  private configManager: ConfigManager
  private ytDlpPath: string = 'yt-dlp'

  constructor() {
    this.configManager = new ConfigManager()
    this.detectYtDlpPath()
  }

  /**
   * 检测 yt-dlp 路径
   */
  private async detectYtDlpPath(): Promise<void> {
    const possiblePaths = [
      'yt-dlp', // 系统 PATH 中的 yt-dlp
      '/usr/local/bin/yt-dlp', // 全局安装
      '/usr/bin/yt-dlp', // Ubuntu 系统包安装
      '/home/ubuntu/.local/bin/yt-dlp', // Ubuntu 用户本地安装
      process.env.HOME + '/.local/bin/yt-dlp', // 动态用户本地路径
      '/opt/homebrew/bin/yt-dlp', // macOS Homebrew
      '/usr/local/opt/yt-dlp/bin/yt-dlp' // 其他可能位置
    ]

    for (const testPath of possiblePaths) {
      try {
        await execAsync(`"${testPath}" --version`)
        this.ytDlpPath = testPath
        Logger.info(`使用 yt-dlp 路径: ${this.ytDlpPath}`)
        return
      } catch (error) {
        continue
      }
    }

    Logger.warn('未找到 yt-dlp，使用默认路径')
  }

  /**
   * 检查下载器可用性
   */
  async checkAvailability(): Promise<{ available: boolean; version?: string; path: string }> {
    try {
      const { stdout } = await execAsync(`"${this.ytDlpPath}" --version`)
      const version = stdout.trim()
      return { available: true, version, path: this.ytDlpPath }
    } catch (error) {
      return { available: false, path: this.ytDlpPath }
    }
  }

  /**
   * 获取视频信息
   */
  async getVideoInfo(url: string, useBrowserCookies: boolean = true): Promise<VideoInfo> {
    try {
      const tempDir = '/tmp/yt-dlpservice'
      await fs.mkdir(tempDir, { recursive: true })

      let command = `"${this.ytDlpPath}" --dump-json --no-warnings`
      
      // 如果是 YouTube URL 且启用浏览器 cookies
      if ((url.includes('youtube.com') || url.includes('youtu.be')) && useBrowserCookies) {
        try {
          const cookiesFile = await browserManager.getCookiesForYtDlp()
          if (cookiesFile) {
            command += ` --cookies "${cookiesFile}"`
          }
        } catch (error) {
          Logger.warn('获取浏览器 cookies 失败，使用默认方式')
        }
      }
      
      command += ` --ffmpeg-location ffmpeg "${url}"`

      Logger.info(`获取视频信息: ${command}`)
      const { stdout } = await execAsync(command)
      
      const videoData = JSON.parse(stdout)
      
      return {
        title: videoData.title || 'Unknown Title',
        duration: videoData.duration || 0,
        uploader: videoData.uploader || 'Unknown',
        formats: videoData.formats?.map((format: any) => ({
          format_id: format.format_id,
          ext: format.ext,
          resolution: format.resolution,
          filesize: format.filesize
        })) || [],
        originalData: videoData
      }
    } catch (error) {
      if (error instanceof Error && this.isYouTubeAuthError(error.message)) {
        Logger.warn('检测到 YouTube 需要登录认证')
        if ((url.includes('youtube.com') || url.includes('youtu.be')) && useBrowserCookies) {
          const loginSuccess = await this.handleYouTubeAuthRequired()
          if (loginSuccess) {
            Logger.info('登录成功，重试获取视频信息...')
            return await this.getVideoInfo(url, false) // 递归调用，但禁用浏览器 cookies 避免无限循环
          }
        }
        throw new Error('YouTube 视频需要登录认证，请确保已在专用浏览器中登录')
      }
      throw error
    }
  }

  /**
   * 根据下载类型下载内容
   */
  async downloadContent(url: string, options: DownloadOptions): Promise<{ videoPath?: string; audioPath?: string }> {
    const { outputDir, downloadType } = options
    
    // 确保输出目录存在
    await fs.mkdir(outputDir, { recursive: true })
    
    const result: { videoPath?: string; audioPath?: string } = {}
    
    switch (downloadType) {
      case 'AUDIO_ONLY':
        result.audioPath = await this.downloadAudio(url, options)
        break
      case 'VIDEO_ONLY':
        result.videoPath = await this.downloadVideo(url, options)
        break
      case 'BOTH':
        // 并行下载视频和音频
        const [videoPath, audioPath] = await Promise.all([
          this.downloadVideo(url, options),
          this.downloadAudio(url, options)
        ])
        result.videoPath = videoPath
        result.audioPath = audioPath
        break
      default:
        throw new Error(`不支持的下载类型: ${downloadType}`)
    }
    
    return result
  }

  /**
   * 下载视频文件
   */
  async downloadVideo(url: string, options: DownloadOptions, useBrowserCookies: boolean = true): Promise<string> {
    try {
      const { outputDir, format = 'best', quality = 'best' } = options
      await fs.mkdir(outputDir, { recursive: true })

      const outputTemplate = path.join(outputDir, '%(id)s_video.%(ext)s')
      
      let command = `"${this.ytDlpPath}" --no-warnings -f "${format}[height<=${quality}]" -o "${outputTemplate}"`
      
      // 如果是 YouTube URL 且启用浏览器 cookies
      if ((url.includes('youtube.com') || url.includes('youtu.be')) && useBrowserCookies) {
        try {
          const cookiesFile = await browserManager.getCookiesForYtDlp()
          if (cookiesFile) {
            command += ` --cookies "${cookiesFile}"`
          }
        } catch (error) {
          Logger.warn('获取浏览器 cookies 失败，使用默认方式')
        }
      }
      
      command += ` --ffmpeg-location ffmpeg "${url}"`

      Logger.info(`下载视频: ${command}`)
      const { stdout } = await execAsync(command)
      
      // 从输出中解析文件路径
      const lines = stdout.split('\n')
      const downloadLine = lines.find(line => 
        line.includes('[download] Destination:') || 
        line.includes('[download] 目标文件:') ||
        line.includes('has already been downloaded')
      )
      
      if (downloadLine) {
        const match = downloadLine.match(/(?:Destination:|目标文件:|downloaded)\s+(.+)/)
        if (match && match[1]) {
          const filePath = match[1].trim()
          Logger.info(`视频下载完成: ${filePath}`)
          return filePath
        }
      }
      
      throw new Error('无法确定下载的视频文件路径')
    } catch (error) {
      if (error instanceof Error && this.isYouTubeAuthError(error.message)) {
        Logger.warn('检测到 YouTube 需要登录认证')
        if ((url.includes('youtube.com') || url.includes('youtu.be')) && useBrowserCookies) {
          const loginSuccess = await this.handleYouTubeAuthRequired()
          if (loginSuccess) {
            Logger.info('登录成功，重试下载视频...')
            return await this.downloadVideo(url, options, false)
          }
        }
        throw new Error('YouTube 视频需要登录认证，请确保已在专用浏览器中登录')
      }
      throw error
    }
  }

  /**
   * 下载音频文件
   */
  async downloadAudio(url: string, options: DownloadOptions, useBrowserCookies: boolean = true): Promise<string> {
    try {
      const { outputDir, format = 'bestaudio', quality = 'best' } = options
      await fs.mkdir(outputDir, { recursive: true })

      const outputTemplate = path.join(outputDir, '%(id)s_audio.%(ext)s')
      
      // 对于 Bilibili，使用更兼容的格式选择
      let audioFormat = format
      if (url.includes('bilibili.com')) {
        audioFormat = 'bestaudio/best'
      }
      
      let command = `"${this.ytDlpPath}" --no-warnings -f "${audioFormat}" --extract-audio --audio-format mp3 --audio-quality "${quality}" -o "${outputTemplate}"`
      
      // 如果是 YouTube URL 且启用浏览器 cookies
      if ((url.includes('youtube.com') || url.includes('youtu.be')) && useBrowserCookies) {
        try {
          const cookiesFile = await browserManager.getCookiesForYtDlp()
          if (cookiesFile) {
            command += ` --cookies "${cookiesFile}"`
          }
        } catch (error) {
          Logger.warn('获取浏览器 cookies 失败，使用默认方式')
        }
      }
      
      command += ` --ffmpeg-location ffmpeg "${url}"`

      Logger.info(`下载音频: ${command}`)
      const { stdout } = await execAsync(command)
      
      // 从输出中解析文件路径
      const lines = stdout.split('\n')
      const downloadLine = lines.find(line => 
        line.includes('[download] Destination:') || 
        line.includes('[download] 目标文件:') ||
        line.includes('has already been downloaded') ||
        line.includes('[ExtractAudio]')
      )
      
             if (downloadLine) {
         const match = downloadLine.match(/(?:Destination:|目标文件:|downloaded|to)\s+(.+)/)
         if (match && match[1]) {
           let filePath = match[1].trim()
           // 如果是音频提取，文件可能是 .mp3 格式
           if (downloadLine.includes('[ExtractAudio]')) {
             filePath = filePath.replace(/\.[^.]+$/, '.mp3')
           }
           Logger.info(`音频下载完成: ${filePath}`)
           return filePath
         }
       }
      
      throw new Error('无法确定下载的音频文件路径')
    } catch (error) {
      if (error instanceof Error && this.isYouTubeAuthError(error.message)) {
        Logger.warn('检测到 YouTube 需要登录认证')
        if ((url.includes('youtube.com') || url.includes('youtu.be')) && useBrowserCookies) {
          const loginSuccess = await this.handleYouTubeAuthRequired()
          if (loginSuccess) {
            Logger.info('登录成功，重试下载音频...')
            return await this.downloadAudio(url, options, false)
          }
        }
        throw new Error('YouTube 视频需要登录认证，请确保已在专用浏览器中登录')
      }
      throw error
    }
  }

  /**
   * 检查是否为 YouTube 认证错误
   */
  private isYouTubeAuthError(errorMessage: string): boolean {
    const authErrors = [
      'Sign in to confirm you\'re not a bot',
      'This video is unavailable',
      'Private video',
      'Members-only content',
      'Video unavailable',
      'HTTP Error 403'
    ]
    return authErrors.some(authError => errorMessage.includes(authError))
  }

  /**
   * 处理 YouTube 认证需求
   */
  private async handleYouTubeAuthRequired(): Promise<boolean> {
    try {
      Logger.info('开始处理 YouTube 认证需求...')
      
      // 1. 初始化 BrowserManager
      await browserManager.initialize()
      
      // 2. 检查当前登录状态
      const currentStatus = await browserManager.getLoginStatus()
      if (currentStatus.isLoggedIn) {
        Logger.info('检测到已有登录状态，刷新 cookies...')
        await browserManager.getCookiesForYtDlp()
        return true
      }
      
             // 3. 创建 YouTube 会话
       const session = await browserManager.createYouTubeSession()
       if (!session || !session.isLoggedIn) {
         Logger.info('当前未登录，需要手动登录')
       }
      
      // 4. 提示用户登录
      Logger.info('弹出浏览器窗口，请手动完成 YouTube 登录...')
      const loginSuccess = await browserManager.promptForLogin()
      
      if (loginSuccess) {
        Logger.info('YouTube 登录成功，保存 cookies...')
        await browserManager.getCookiesForYtDlp()
        return true
      } else {
        Logger.warn('YouTube 登录失败或超时')
        return false
      }
    } catch (error) {
      Logger.error(`处理 YouTube 认证失败: ${error}`)
      return false
    }
  }

  /**
   * 清理文件
   */
  async cleanupFiles(directory: string, olderThanHours: number = 24): Promise<void> {
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
} 