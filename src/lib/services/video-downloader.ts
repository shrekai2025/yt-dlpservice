import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import { Logger } from '~/lib/utils/logger'
import { ConfigManager } from '~/lib/utils/config'
import type { VideoInfo, DownloadOptions, DownloadType } from '~/types/task'
import { browserManager } from './browser-manager'

const execAsync = promisify(exec)

class VideoDownloader {
  private static instance: VideoDownloader;
  private configManager: ConfigManager
  private ytDlpPath: string = 'yt-dlp'
  private ffmpegPath: string = 'ffmpeg' // 添加ffmpeg路径属性
  private isInitialized: boolean = false
  private initPromise: Promise<void> | null = null
  private isInitializing: boolean = false; // 新增属性，用于控制初始化状态

  private constructor() {
    this.configManager = new ConfigManager()
    // 启动初始化
    this.initPromise = this.initialize()
  }

  /**
   * 初始化方法
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitializing = true;
    try {
      Logger.info('开始初始化VideoDownloader...');
      await this.detectYtDlpPath();
      
      // 检测FFmpeg路径
      this.ffmpegPath = await this.detectFFmpegPath();
      
      Logger.info('✅ VideoDownloader初始化完成');
      this.isInitialized = true;
    } catch (error: any) {
      Logger.error(`VideoDownloader初始化失败: ${error.message}`);
      this.isInitialized = false;
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * 确保初始化完成
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized && this.initPromise) {
      await this.initPromise
    }
  }

  public static getInstance(): VideoDownloader {
    if (!VideoDownloader.instance) {
      VideoDownloader.instance = new VideoDownloader();
    }
    return VideoDownloader.instance;
  }

  /**
   * 构建 yt-dlp 命令
   */
  private buildYtDlpCommand(args: string): string {
    if (this.ytDlpPath.includes('python3 -m')) {
      return `${this.ytDlpPath} ${args}`
    } else {
      return `"${this.ytDlpPath}" ${args}`
    }
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
      '/usr/local/opt/yt-dlp/bin/yt-dlp', // 其他可能位置
      // macOS 用户 Python 安装目录
      '/Users/' + process.env.USER + '/Library/Python/3.9/bin/yt-dlp',
      '/Users/' + process.env.USER + '/Library/Python/3.8/bin/yt-dlp',
      '/Users/' + process.env.USER + '/Library/Python/3.10/bin/yt-dlp',
      '/Users/' + process.env.USER + '/Library/Python/3.11/bin/yt-dlp',
      '/Users/' + process.env.USER + '/Library/Python/3.12/bin/yt-dlp',
      'python3 -m yt_dlp' // Python 模块方式调用
    ]

    Logger.info('开始检测 yt-dlp 路径...');

    for (const testPath of possiblePaths) {
      try {
        Logger.debug(`测试路径: ${testPath}`);
        
        if (testPath.includes('python3 -m')) {
          // 对于 Python 模块调用方式，需要特殊处理
          await execAsync(`${testPath} --version`)
          this.ytDlpPath = testPath
          Logger.info(`✅ 使用 yt-dlp 路径: ${this.ytDlpPath}`)
          return
        } else {
          await execAsync(`"${testPath}" --version`)
          this.ytDlpPath = testPath
          Logger.info(`✅ 使用 yt-dlp 路径: ${this.ytDlpPath}`)
          return
        }
      } catch (error) {
        Logger.debug(`路径 ${testPath} 不可用: ${error}`);
        continue
      }
    }

    Logger.error('❌ 未找到 yt-dlp，使用默认路径。请安装 yt-dlp：pip3 install yt-dlp')
  }

  /**
   * 检测FFmpeg路径
   */
  private async detectFFmpegPath(): Promise<string> {
    const possiblePaths = [
      'ffmpeg', // 系统PATH中的ffmpeg
      '/usr/bin/ffmpeg',
      '/usr/local/bin/ffmpeg',
      '/opt/homebrew/bin/ffmpeg', // macOS Homebrew
      '/snap/bin/ffmpeg', // Ubuntu snap
      'C:\\ffmpeg\\bin\\ffmpeg.exe', // Windows
    ];

    for (const testPath of possiblePaths) {
      try {
        Logger.debug(`测试FFmpeg路径: ${testPath}`);
        await execAsync(`"${testPath}" -version`);
        Logger.info(`✅ 使用FFmpeg路径: ${testPath}`);
        return testPath;
      } catch (error) {
        Logger.debug(`FFmpeg路径 ${testPath} 不可用`);
        continue;
      }
    }

    Logger.warn('⚠️ 未找到FFmpeg，使用默认路径 ffmpeg');
    return 'ffmpeg'; // 默认使用系统PATH中的ffmpeg
  }

  /**
   * 检查下载器可用性
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
   * 获取视频信息
   */
  async getVideoInfo(url: string, useBrowserCookies: boolean = true): Promise<VideoInfo> {
    await this.ensureInitialized()
    
    try {
      let command = this.buildYtDlpCommand('--no-warnings --dump-json --no-check-certificate')
      
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
      
      command += ` "${url}"`

      Logger.info(`获取视频信息: ${command}`)
      const { stdout } = await execAsync(command)
      
      const videoInfo = JSON.parse(stdout)
      
      return {
        id: videoInfo.id || '',
        title: videoInfo.title || '',
        duration: videoInfo.duration || 0,
        thumbnail: videoInfo.thumbnail || '',
        uploader: videoInfo.uploader || '',
        upload_date: videoInfo.upload_date || '',
        view_count: videoInfo.view_count || 0,
        like_count: videoInfo.like_count || 0,
        description: videoInfo.description || '',
        formats: videoInfo.formats || []
      }
    } catch (error: any) {
      Logger.error(`获取视频信息失败: ${error.message}`)
      throw new Error(`获取视频信息失败: ${error.message}`)
    }
  }

  /**
   * 根据下载类型下载内容
   */
  async downloadContent(url: string, options: DownloadOptions): Promise<{ videoPath?: string; audioPath?: string }> {
    await this.ensureInitialized()
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
    await this.ensureInitialized()
    try {
      const { outputDir, format = 'best', quality = 'best' } = options
      await fs.mkdir(outputDir, { recursive: true })

      const outputTemplate = path.join(outputDir, '%(id)s_video.%(ext)s')
      
      let command = this.buildYtDlpCommand(`--no-warnings -f "${format}[height<=${quality}]" -o "${outputTemplate}"`)
      
      // 只有当FFmpeg路径不是默认的'ffmpeg'时才添加--ffmpeg-location参数
      if (this.ffmpegPath && this.ffmpegPath !== 'ffmpeg') {
        command += ` --ffmpeg-location "${this.ffmpegPath}"`;
        Logger.debug(`使用自定义FFmpeg路径: ${this.ffmpegPath}`);
      }
      
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
      
      command += ` "${url}"`

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
    } catch (error: any) {
      Logger.error(`下载视频失败: ${error.message}`)
      throw new Error(`下载视频失败: ${error.message}`)
    }
  }

  /**
   * 下载音频文件
   */
  async downloadAudio(url: string, options: DownloadOptions, useBrowserCookies: boolean = true): Promise<string> {
    await this.ensureInitialized()
    try {
      const { outputDir, format = 'bestaudio', quality = 'best' } = options
      await fs.mkdir(outputDir, { recursive: true })

      const outputTemplate = path.join(outputDir, '%(id)s_audio.%(ext)s')
      
      // 对于不同平台使用更兼容的格式选择
      let audioFormat = format;
      if (url.includes("bilibili.com")) {
        // Bilibili 需要特殊处理 - 使用更通用的格式选择
        audioFormat = "bestaudio[ext=m4a]/bestaudio[ext=mp3]/bestaudio";
      }

      let command = this.buildYtDlpCommand(`--no-warnings -f "${audioFormat}" --extract-audio --audio-format mp3 --audio-quality "${quality}" -o "${outputTemplate}" --no-check-certificate`);
      
      // 只有当FFmpeg路径不是默认的'ffmpeg'时才添加--ffmpeg-location参数
      if (this.ffmpegPath && this.ffmpegPath !== 'ffmpeg') {
        command += ` --ffmpeg-location "${this.ffmpegPath}"`;
        Logger.debug(`使用自定义FFmpeg路径: ${this.ffmpegPath}`);
      }
      
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
      
      command += ` "${url}"`

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
          // 使用更通用的音频格式重试，不指定特定的格式ID
          let fallbackCommand = this.buildYtDlpCommand(`--no-warnings -f "bestaudio" --extract-audio --audio-format mp3 -o "${outputTemplate}" --no-check-certificate`);
          
          // 添加FFmpeg路径（如果需要）
          if (this.ffmpegPath && this.ffmpegPath !== 'ffmpeg') {
            fallbackCommand += ` --ffmpeg-location "${this.ffmpegPath}"`;
          }
          
          fallbackCommand += ` "${url}"`;
          
          Logger.info(`备用下载命令: ${fallbackCommand}`)
          try {
            const fallbackResult = await execAsync(fallbackCommand)
            stdout = fallbackResult.stdout
            Logger.info(`备用格式下载成功，输出: ${stdout.substring(0, 500)}...`)
          } catch (fallbackError) {
            Logger.error(`备用格式也下载失败: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`)
            
            // 最后尝试：直接下载视频然后提取音频
            Logger.warn('尝试下载视频文件并提取音频...')
            let videoCommand = this.buildYtDlpCommand(`--no-warnings -f "best[height<=720]" -o "${outputTemplate.replace('_audio', '_video')}" --no-check-certificate`);
            
            if (this.ffmpegPath && this.ffmpegPath !== 'ffmpeg') {
              videoCommand += ` --ffmpeg-location "${this.ffmpegPath}"`;
            }
            
            videoCommand += ` "${url}"`;
            
            Logger.info(`视频下载命令: ${videoCommand}`)
            const videoResult = await execAsync(videoCommand)
            
            // TODO: 这里需要实现视频转音频的逻辑
            Logger.info('视频下载成功，但需要实现视频转音频功能')
            throw new Error('需要实现视频转音频功能，当前版本暂不支持')
          }
        } else {
          throw error
        }
      }
      
      // 从输出中解析文件路径
      const lines = stdout.split('\n')
      const downloadLine = lines.find(line => 
        line.includes('[download] Destination:') || 
        line.includes('[download] 目标文件:') ||
        line.includes('has already been downloaded') ||
        line.includes('[ExtractAudio]') ||
        line.includes('Deleting original file')
      )
      
      if (downloadLine) {
        // 尝试多种匹配模式
        const patterns = [
          /(?:Destination:|目标文件:)\s+(.+)/,
          /has already been downloaded.*?(\/.+)/,
          /\[ExtractAudio\] Destination:\s+(.+)/,
          /Deleting original file\s+(.+)/
        ]
        
        for (const pattern of patterns) {
          const match = downloadLine.match(pattern)
          if (match && match[1]) {
            const filePath = match[1].trim()
            // 如果是音频提取，路径可能需要调整
            const audioPath = filePath.replace(/\.(mp4|webm|mkv)$/, '.mp3')
            Logger.info(`音频下载完成: ${audioPath}`)
            return audioPath
          }
        }
      }
      
      // 如果无法从输出解析路径，尝试查找输出目录中的文件
      Logger.warn('无法从yt-dlp输出解析文件路径，尝试查找输出目录...')
      const files = await fs.readdir(outputDir)
      const audioFiles = files.filter(file => 
        file.includes('_audio') && (file.endsWith('.mp3') || file.endsWith('.m4a') || file.endsWith('.wav'))
      )
      
      if (audioFiles.length > 0 && audioFiles[0]) {
        const audioPath = path.join(outputDir, audioFiles[0])
        Logger.info(`找到音频文件: ${audioPath}`)
        return audioPath
      }
      
      throw new Error('无法确定下载的音频文件路径')
    } catch (error: any) {
      Logger.error(`下载音频失败: ${error.message}`)
      throw new Error(`下载音频失败: ${error.message}`)
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
}

export const videoDownloader = VideoDownloader.getInstance(); 