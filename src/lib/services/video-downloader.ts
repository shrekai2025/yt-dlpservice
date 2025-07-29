import { db } from '~/server/db'
import { Logger } from '~/lib/utils/logger'
import { browserManager } from './browser-manager'
import { urlNormalizer } from './url-normalizer'
import { ConfigManager } from '~/lib/utils/config'
import type { VideoInfo, DownloadOptions } from '~/types/task'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'

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
      // 标准化URL（特别是B站URL）
      const normalizedUrl = await this.normalizeUrlIfNeeded(url)
      
      let command = this.buildYtDlpCommand('--no-warnings --dump-json --no-check-certificate')
      
      // 添加平台特定的请求头和Cookie支持
      command = await this.addPlatformSpecificOptions(command, normalizedUrl, useBrowserCookies)
      
      command += ` "${normalizedUrl}"`

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

      // 标准化URL（特别是B站URL）
      const normalizedUrl = await this.normalizeUrlIfNeeded(url)

      const outputTemplate = path.join(outputDir, '%(id)s_video.%(ext)s')
      
      let command = this.buildYtDlpCommand(`--no-warnings -f "${format}[height<=${quality}]" -o "${outputTemplate}"`)
      
      // 只有当FFmpeg路径不是默认的'ffmpeg'时才添加--ffmpeg-location参数
      if (this.ffmpegPath && this.ffmpegPath !== 'ffmpeg') {
        command += ` --ffmpeg-location "${this.ffmpegPath}"`;
        Logger.debug(`使用自定义FFmpeg路径: ${this.ffmpegPath}`);
      }
      
      // 添加平台特定的请求头和Cookie支持
      command = await this.addPlatformSpecificOptions(command, normalizedUrl, useBrowserCookies)
      
      command += ` "${normalizedUrl}"`

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

      // 标准化URL（特别是B站URL）
      const normalizedUrl = await this.normalizeUrlIfNeeded(url)

      // 修改输出模板，确保音频文件始终以.mp3结尾
      const outputTemplate = path.join(outputDir, '%(id)s_audio.mp3')
      
      // 对于不同平台使用更兼容的格式选择
      let audioFormat = format;
      // 移除B站特定的音频格式ID，统一使用bestaudio
      // if (normalizedUrl.includes("bilibili.com")) {
      //   audioFormat = "30280/30232/30216/bestaudio";
      // }

      // 构建命令：明确指定要提取音频并转换为mp3格式，降低质量确保豆包API兼容性
      let command = this.buildYtDlpCommand(`--no-warnings -f "${audioFormat}" --extract-audio --audio-format mp3 --audio-quality "5" -o "${outputTemplate}" --no-check-certificate`);
      
      // 添加FFmpeg参数来标准化音频格式，确保豆包API兼容
      const ffmpegArgs = [
        '-ar 16000',      // 采样率降至16kHz（豆包API标准）
        '-ac 1',          // 单声道（豆包API推荐）
        '-ab 32k',        // 比特率32kbps（降低质量）
        '-f mp3'          // 强制MP3格式
      ].join(' ');
      
      command += ` --postprocessor-args "ffmpeg:${ffmpegArgs}"`;
      
      Logger.info(`🎵 音频质量配置: 16kHz, 单声道, 32kbps MP3 (豆包API优化)`);
      
      // 只有当FFmpeg路径不是默认的'ffmpeg'时才添加--ffmpeg-location参数
      if (this.ffmpegPath && this.ffmpegPath !== 'ffmpeg') {
        command += ` --ffmpeg-location "${this.ffmpegPath}"`;
        Logger.debug(`使用自定义FFmpeg路径: ${this.ffmpegPath}`);
      }
      
      // 添加平台特定的请求头和Cookie支持
      command = await this.addPlatformSpecificOptions(command, normalizedUrl, useBrowserCookies)
      
      command += ` "${normalizedUrl}"`

      Logger.info(`下载音频: ${command}`)
      
      // 尝试下载，如果失败则使用备用格式
      let stdout: string
      try {
        const result = await execAsync(command)
        stdout = result.stdout
        Logger.info(`主格式下载成功...`)
      } catch (error) {
        Logger.error(`主格式下载失败...`)
        // 备用逻辑不再需要，因为已经使用了bestaudio
        // if (normalizedUrl.includes('bilibili.com') && error instanceof Error) { ... }
        throw error
      }
      
      // 直接返回预期的mp3文件路径，因为我们在输出模板中已经指定了.mp3扩展名
      Logger.info(`yt-dlp 完整输出: ${stdout}`);
      
      // 先尝试查找输出目录中的实际文件，而不是依赖不稳定的路径解析
      Logger.info(`查找输出目录中的音频文件: ${outputDir}`);
      
      try {
        const files = await fs.readdir(outputDir)
        Logger.info(`输出目录文件列表: ${files.join(', ')}`);
        
        // 优先查找mp3文件
        const mp3Files = files.filter(file => 
          file.includes('_audio') && file.endsWith('.mp3')
        )
        
        if (mp3Files.length > 0 && mp3Files[0]) {
          const audioPath = path.join(outputDir, mp3Files[0])
          Logger.info(`找到mp3音频文件: ${audioPath}`)
          // 验证文件确实存在
          await fs.access(audioPath, fs.constants.F_OK);
          return audioPath
        }
        
        // 如果没有mp3文件，查找其他音频文件并重命名为mp3
        const audioFiles = files.filter(file => 
          file.includes('_audio') && (file.endsWith('.m4a') || file.endsWith('.wav') || file.endsWith('.webm'))
        )
        
        if (audioFiles.length > 0 && audioFiles[0]) {
          const originalPath = path.join(outputDir, audioFiles[0])
          const mp3Path = originalPath.replace(/\.(m4a|wav|webm)$/, '.mp3')
          
          Logger.warn(`找到非mp3音频文件: ${originalPath}，重命名为: ${mp3Path}`)
          await fs.rename(originalPath, mp3Path)
          // 验证重命名后的文件存在
          await fs.access(mp3Path, fs.constants.F_OK);
          return mp3Path
        }
        
        // 如果还是没找到，尝试从yt-dlp输出中解析路径
        Logger.warn(`目录中未找到音频文件，尝试从yt-dlp输出解析路径...`);
        const expectedPath = outputTemplate.replace('%(id)s', this.extractVideoId(stdout) || 'unknown');
        
        try {
          await fs.access(expectedPath, fs.constants.F_OK);
          Logger.info(`通过输出解析找到音频文件: ${expectedPath}`);
          return expectedPath;
        } catch (parseError) {
          Logger.error(`解析路径也不存在: ${expectedPath}`);
          throw new Error('无法找到下载的音频文件');
        }
        
      } catch (dirError) {
        Logger.error(`读取输出目录失败: ${dirError}`);
        throw new Error(`读取输出目录失败: ${dirError}`);
      }
      
    } catch (error: any) {
      Logger.error(`下载音频失败: ${error.message}`)
      throw new Error(`下载音频失败: ${error.message}`)
    }
  }

  /**
   * 标准化URL（如果需要）
   */
  private async normalizeUrlIfNeeded(url: string): Promise<string> {
    // 如果是B站URL，进行标准化处理
    if (urlNormalizer.isBilibiliUrl(url)) {
      return await urlNormalizer.normalizeUrl(url)
    }
    
    // 其他平台URL直接返回
    return url
  }
  
  /**
   * 添加平台特定的选项（请求头、Cookie等）
   */
  private async addPlatformSpecificOptions(command: string, url: string, useBrowserCookies: boolean): Promise<string> {
    let enhancedCommand = command
    
    // B站特定处理
    if (urlNormalizer.isBilibiliUrl(url)) {
      enhancedCommand = await this.addBilibiliOptions(enhancedCommand, useBrowserCookies)
    }
    // YouTube特定处理
    else if (url.includes('youtube.com') || url.includes('youtu.be')) {
      enhancedCommand = await this.addYouTubeOptions(enhancedCommand, useBrowserCookies)
    }
    
    return enhancedCommand
  }
  
  /**
   * 添加B站专用选项
   */
  private async addBilibiliOptions(command: string, useBrowserCookies: boolean): Promise<string> {
    let enhancedCommand = command
    
    // 添加B站专用请求头 - 优化版本
    const bilibiliHeaders = [
      'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer: https://www.bilibili.com/'
    ]
    
    for (const header of bilibiliHeaders) {
      enhancedCommand += ` --add-header "${header}"`
    }
    
    // 恢复B站专用的extractor参数，优先使用API获取信息
    enhancedCommand += ' --extractor-args "bilibili:video_info_prefer_api_over_html=true"'
    
    // 添加B站Cookie支持
    if (useBrowserCookies) {
      try {
        const cookiesFile = await browserManager.getCookiesForYtDlp()
        if (cookiesFile) {
          enhancedCommand += ` --cookies "${cookiesFile}"`
          Logger.info('✅ 已添加B站浏览器Cookie支持')
        }
      } catch (error) {
        Logger.warn('获取B站浏览器cookies失败，使用默认方式')
      }
    }
    
    Logger.info('🎯 已添加B站专用请求头和选项')
    return enhancedCommand
  }
  
  /**
   * 添加YouTube专用选项
   */
  private async addYouTubeOptions(command: string, useBrowserCookies: boolean): Promise<string> {
    let enhancedCommand = command
    
    // YouTube Cookie支持（保持原有逻辑）
    if (useBrowserCookies) {
      try {
        const cookiesFile = await browserManager.getCookiesForYtDlp()
        if (cookiesFile) {
          enhancedCommand += ` --cookies "${cookiesFile}"`
        }
      } catch (error) {
        Logger.warn('获取YouTube浏览器cookies失败，使用默认方式')
      }
    }
    
    return enhancedCommand
  }

  /**
   * 从yt-dlp输出中提取视频ID
   */
  private extractVideoId(output: string): string | null {
    const lines = output.split('\n');
    
    // 尝试多种方式提取视频ID
    for (const line of lines) {
      // 方式1: 从下载目标路径提取
      if (line.includes('[download] Destination:')) {
        Logger.debug(`尝试从下载目标提取ID: ${line}`);
        const match = line.match(/\/([^\/]+)_audio\./);
        if (match && match[1]) {
          Logger.debug(`从下载目标提取到ID: ${match[1]}`);
          return match[1];
        }
      }
      
      // 方式2: 从已下载文件提取
      if (line.includes('has already been downloaded')) {
        Logger.debug(`尝试从已下载文件提取ID: ${line}`);
        const match = line.match(/([^\/\s]+)_audio\.mp3/);
        if (match && match[1]) {
          Logger.debug(`从已下载文件提取到ID: ${match[1]}`);
          return match[1];
        }
      }
      
      // 方式3: 从ExtractAudio输出提取
      if (line.includes('[ExtractAudio]')) {
        Logger.debug(`尝试从ExtractAudio提取ID: ${line}`);
        const match = line.match(/([^\/\s]+)_audio\.mp3/);
        if (match && match[1]) {
          Logger.debug(`从ExtractAudio提取到ID: ${match[1]}`);
          return match[1];
        }
      }
      
      // 方式4: 从视频信息行提取B站视频ID
      if (line.includes('BV') && line.includes('bilibili')) {
        Logger.debug(`尝试从视频信息提取B站ID: ${line}`);
        const match = line.match(/(BV[a-zA-Z0-9]+)/);
        if (match && match[1]) {
          Logger.debug(`从视频信息提取到B站ID: ${match[1]}`);
          return match[1];
        }
      }
    }
    
    Logger.warn(`无法从yt-dlp输出中提取视频ID`);
    Logger.debug(`完整输出用于调试: ${output}`);
    return null;
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