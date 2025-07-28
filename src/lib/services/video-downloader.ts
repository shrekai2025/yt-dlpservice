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
      
      // 对于不同平台使用更兼容的格式选择
      let audioFormat = format;
      if (url.includes("bilibili.com")) {
        // Bilibili 需要特殊处理 - 直接使用已知可用的音频格式ID
        audioFormat = "30280/30232/30216/bestaudio";
      }

      let command = `"${this.ytDlpPath}" --no-warnings -f "${audioFormat}" --extract-audio --audio-format mp3 --audio-quality "${quality}" -o "${outputTemplate}" --no-check-certificate`;
      
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
      
      // 尝试下载，如果失败则使用备用格式
      let stdout: string
      try {
        const result = await execAsync(command)
        stdout = result.stdout
        Logger.info(`主格式下载成功，输出: ${stdout.substring(0, 500)}...`)
      } catch (error) {
        Logger.error(`主格式下载失败，错误: ${error instanceof Error ? error.message : String(error)}`)
        if (url.includes('bilibili.com') && error instanceof Error) {
          Logger.warn('Bilibili 下载失败，尝试使用备用格式...')
          // 使用更通用的音频格式重试
          const fallbackCommand = `"${this.ytDlpPath}" --no-warnings -f "[ext=m4a]/[ext=mp3]/bestaudio" --extract-audio --audio-format mp3 -o "${outputTemplate}" --no-check-certificate "${url}"`
          Logger.info(`备用下载命令: ${fallbackCommand}`)
          try {
            const fallbackResult = await execAsync(fallbackCommand)
            stdout = fallbackResult.stdout
            Logger.info(`备用格式下载成功，输出: ${stdout.substring(0, 500)}...`)
          } catch (fallbackError) {
            Logger.error(`备用格式下载失败，错误: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`)
            Logger.warn('备用格式也失败，尝试最简单的方式...')
            // 最后的尝试：不指定格式，让 yt-dlp 自动选择最佳格式
            const simpleCommand = `"${this.ytDlpPath}" --no-warnings --extract-audio --audio-format mp3 -o "${outputTemplate}" --no-check-certificate "${url}"`
            Logger.info(`简单下载命令: ${simpleCommand}`)
            try {
              const simpleResult = await execAsync(simpleCommand)
              stdout = simpleResult.stdout
              Logger.info(`简单格式下载成功，输出: ${stdout.substring(0, 500)}...`)
            } catch (simpleError) {
              Logger.error(`简单格式下载失败，错误: ${simpleError instanceof Error ? simpleError.message : String(simpleError)}`)
              throw simpleError
            }
          }
        } else {
          throw error
        }
      }
      
      // 从输出中解析文件路径
      Logger.info(`yt-dlp 完整输出: ${stdout}`);
      const lines = stdout.split('\n');
      
      // 寻找下载完成的标志
      const downloadLine = lines.find(line => 
        line.includes('[download] Destination:') || 
        line.includes('[ExtractAudio] Destination:') ||
        line.includes('[download] 目标文件:') ||
        line.includes('has already been downloaded') ||
        line.includes('[ExtractAudio]') ||
        line.includes('[download]') && line.includes('%')
      );
      
      if (downloadLine) {
        Logger.info(`找到下载行: ${downloadLine}`);
        // 更新正则表达式以匹配更多情况
        const match = downloadLine.match(/(?:Destination:|目标文件:|downloaded to:)\s+(.+)/);
        if (match && match[1]) {
          let filePath = match[1].trim();
          // 确保文件是 mp3 格式
          if (filePath.endsWith('.m4a') || filePath.endsWith('.webm')) {
            filePath = filePath.replace(/\.[^.]+$/, '.mp3');
          }
          Logger.info(`音频下载完成: ${filePath}`);
          return filePath;
        }
      }
      
      // 如果没有找到标准的下载行，尝试查找输出目录中的文件
      try {
        const outputDir = path.dirname(outputTemplate);
        const files = await fs.readdir(outputDir);
        const audioFiles = files.filter(file => file.endsWith('.mp3') || file.endsWith('.m4a'));
        if (audioFiles.length > 0) {
          const filePath = path.join(outputDir, audioFiles[0] || '');
          Logger.info(`通过目录扫描找到音频文件: ${filePath}`);
          return filePath;
        }
      } catch (dirError) {
        Logger.warn(`扫描输出目录失败: ${dirError instanceof Error ? dirError.message : String(dirError)}`);
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