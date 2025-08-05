import { AbstractPlatform } from '../base/abstract-platform'
import { browserManager } from '~/lib/services/browser-manager'
import type { ContentInfo, DownloadConfig, PlatformValidation, ContentType } from '../base/platform-interface'
import { ContentInfoError, AuthenticationError } from '~/lib/utils/errors'
import { exec } from 'child_process'
import { promisify } from 'util'
import { existsSync } from 'fs'

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
      const cookiePath = './data/cookies/youtube_cookies.txt';
      let cookieArg = '';
      
      if (existsSync(cookiePath)) {
        this.log('info', `✅ 使用YouTube Cookie文件获取视频信息`);
        cookieArg = `--cookies "${cookiePath}"`;
      } else {
        this.log('warn', `⚠️ YouTube Cookie文件不存在，将尝试无认证获取视频信息`);
      }
      
      const command = this.buildYtDlpCommand(`--no-warnings --dump-json --no-check-certificate --quiet ${cookieArg}`);
      const { stdout } = await execAsync(`${command} "${url}"`);
      
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
    let enhancedCommand = this.addCommonArgs(command);

    if (useBrowserCookies) {
      const cookiePath = './data/cookies/youtube_cookies.txt';
      
      if (existsSync(cookiePath)) {
        this.log('info', `✅ 使用YouTube Cookie文件进行认证，路径: ${cookiePath}`);
        // 添加从项目内Cookie文件获取Cookie的参数
        enhancedCommand += ` --cookies "${cookiePath}"`;
      } else {
        this.log('warn', `⚠️ YouTube Cookie文件不存在: ${cookiePath}`);
        this.log('warn', '请按照 data/cookies/README.md 中的说明配置Cookie文件');
        this.log('info', '将继续尝试下载，但可能会遇到认证问题');
      }
    } else {
      this.log('info', '未启用浏览器Cookie，可能无法下载需要登录的视频');
    }

    return enhancedCommand;
  }

  /**
   * 处理YouTube认证需求
   * 注意：自动登录功能已移除，请手动配置cookies文件或使用其他认证方式
   */
  async handleAuthRequired(): Promise<boolean> {
    this.log('warn', 'YouTube认证功能已简化，请手动配置cookies文件或使用其他认证方式')
    return false
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