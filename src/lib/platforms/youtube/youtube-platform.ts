import { AbstractPlatform } from '../base/abstract-platform'
import { browserManager } from '~/lib/services/browser-manager'
import type { ContentInfo, DownloadConfig, PlatformValidation, ContentType } from '../base/platform-interface'
import { ContentInfoError, AuthenticationError } from '~/lib/utils/errors'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * YouTube平台实现
 */
export class YouTubePlatform extends AbstractPlatform {
  name = 'youtube'
  supportedDomains = ['youtube.com', 'www.youtube.com', 'youtu.be', 'm.youtube.com']
  supportedContentTypes: ContentType[] = ['video']
  requiresAuth = false // 可选认证

  constructor(ytDlpPath?: string) {
    super(ytDlpPath)
  }

  /**
   * YouTube URL验证逻辑
   */
  validateUrl(url: string): PlatformValidation {
    try {
      const urlObj = new URL(url)
      const hostname = urlObj.hostname.toLowerCase()
      
      // 检查域名
      const isYouTubeDomain = this.supportedDomains.some(domain => 
        hostname === domain || hostname.endsWith('.' + domain)
      )
      
      if (!isYouTubeDomain) {
        return {
          isSupported: false,
          confidence: 0,
          reason: `不是YouTube域名: ${hostname}`
        }
      }

      // 检查是否为有效的YouTube URL格式
      if (hostname.includes('youtu.be')) {
        // youtu.be短链接格式
        return {
          isSupported: true,
          confidence: 1.0,
          reason: 'YouTube短链接格式'
        }
      }

      const pathname = urlObj.pathname
      const searchParams = urlObj.searchParams

      // 检查常见的YouTube URL格式
      if (pathname.includes('/watch') && searchParams.has('v')) {
        return {
          isSupported: true,
          confidence: 1.0,
          reason: 'YouTube视频页面'
        }
      }

      if (pathname.includes('/embed/') || pathname.includes('/v/')) {
        return {
          isSupported: true,
          confidence: 0.9,
          reason: 'YouTube嵌入视频'
        }
      }

      // 可能是YouTube URL但格式不太确定
      return {
        isSupported: true,
        confidence: 0.7,
        reason: 'YouTube域名，格式可能有效'
      }

    } catch (error) {
      return {
        isSupported: false,
        confidence: 0,
        reason: `URL解析错误: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  /**
   * 获取YouTube视频信息
   */
  async getContentInfo(url: string): Promise<ContentInfo> {
    this.log('info', `获取视频信息: ${url}`)
    
    try {
      const command = this.buildYtDlpCommand('--no-warnings --dump-json --no-check-certificate --quiet')
      const { stdout } = await execAsync(`${command} "${url}"`)
      
      // 清理输出，提取JSON部分
      let cleanedOutput = stdout.trim()
      
      // 如果输出包含多行，尝试找到JSON行
      if (cleanedOutput.includes('\n')) {
        const lines = cleanedOutput.split('\n')
        // 查找以 { 开头的行（JSON对象）
        const jsonLine = lines.find(line => line.trim().startsWith('{'))
        if (jsonLine) {
          cleanedOutput = jsonLine.trim()
        }
      }
      
      // 检查是否为有效JSON格式
      if (!cleanedOutput.startsWith('{') || !cleanedOutput.endsWith('}')) {
        this.log('error', `yt-dlp输出格式异常: ${cleanedOutput.substring(0, 200)}...`)
        throw new Error(`yt-dlp输出格式异常，可能是网络错误或视频不可访问`)
      }
      
      const videoInfo = JSON.parse(cleanedOutput)
      
      return {
        id: videoInfo.id || '',
        title: videoInfo.title || '',
        duration: videoInfo.duration || 0,
        contentType: 'video',
        platform: this.name,
        thumbnail: videoInfo.thumbnail || '',
        uploader: videoInfo.uploader || '',
        upload_date: videoInfo.upload_date || '',
        view_count: videoInfo.view_count || 0,
        like_count: videoInfo.like_count || 0,
        description: videoInfo.description || '',
        formats: videoInfo.formats || []
      }
    } catch (error: any) {
      this.log('error', `获取视频信息失败: ${error.message}`)
      
      // 检查是否为YouTube认证错误
      if (this.isYouTubeAuthError(error.message)) {
        throw new AuthenticationError('youtube')
      }
      
      throw new ContentInfoError(`获取YouTube视频信息失败: ${error.message}`, error)
    }
  }

  /**
   * 添加YouTube特定的yt-dlp参数
   */
  async addPlatformSpecificArgs(command: string, url: string, useBrowserCookies: boolean = true): Promise<string> {
    let enhancedCommand = this.addCommonArgs(command)
    
    // 添加YouTube Cookie支持
    if (useBrowserCookies) {
      try {
        const cookiesFile = await browserManager.getCookiesForYtDlp()
        if (cookiesFile) {
          enhancedCommand += ` --cookies "${cookiesFile}"`
          this.log('info', '✅ 已添加YouTube浏览器Cookie支持')
        }
      } catch (error) {
        this.log('warn', '获取YouTube浏览器cookies失败，使用默认方式')
      }
    }
    
    return enhancedCommand
  }

  /**
   * 处理YouTube认证需求
   */
  async handleAuthRequired(): Promise<boolean> {
    try {
      this.log('info', '开始处理YouTube认证需求...')
      
      // 1. 初始化BrowserManager
      await browserManager.initialize()
      
      // 2. 检查当前登录状态
      const currentStatus = await browserManager.getLoginStatus()
      if (currentStatus.isLoggedIn) {
        this.log('info', '检测到已有登录状态，刷新cookies...')
        await browserManager.getCookiesForYtDlp()
        return true
      }
      
      // 3. 创建YouTube会话
      const session = await browserManager.createYouTubeSession()
      if (!session || !session.isLoggedIn) {
        this.log('info', '当前未登录，需要手动登录')
      }
      
      // 4. 提示用户登录
      this.log('info', '弹出浏览器窗口，请手动完成YouTube登录...')
      const loginSuccess = await browserManager.promptForLogin()
      
      if (loginSuccess) {
        this.log('info', 'YouTube登录成功，保存cookies...')
        await browserManager.getCookiesForYtDlp()
        return true
      } else {
        this.log('warn', 'YouTube登录失败或超时')
        return false
      }
    } catch (error) {
      this.log('error', `处理YouTube认证失败: ${error}`)
      return false
    }
  }



  /**
   * 检查是否为YouTube认证错误
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
} 