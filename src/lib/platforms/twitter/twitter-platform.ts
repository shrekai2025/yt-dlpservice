import { AbstractPlatform } from '../base/abstract-platform'
import type { ContentInfo, DownloadConfig, PlatformValidation, ContentType } from '../base/platform-interface'
import { ContentInfoError } from '~/lib/utils/errors'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * Twitter/X平台实现
 * 支持推文中的视频、图片、GIF等媒体下载
 */
export class TwitterPlatform extends AbstractPlatform {
  name = 'twitter'
  supportedDomains = ['twitter.com', 'x.com', 'www.twitter.com', 'www.x.com', 'mobile.twitter.com', 'm.twitter.com']
  supportedContentTypes: ContentType[] = ['video', 'audio']
  requiresAuth = false // 部分内容可能需要登录

  constructor(ytDlpPath?: string) {
    super(ytDlpPath)
  }

  /**
   * Twitter URL验证逻辑
   */
  validateUrl(url: string): PlatformValidation {
    try {
      const urlObj = new URL(url)
      const hostname = urlObj.hostname.toLowerCase()

      // 检查域名
      const isTwitterDomain = this.supportedDomains.some(domain =>
        hostname === domain || hostname.endsWith('.' + domain)
      )

      if (!isTwitterDomain) {
        return {
          isSupported: false,
          confidence: 0,
          reason: `不是Twitter/X域名: ${hostname}`
        }
      }

      const pathname = urlObj.pathname

      // 检查是否为推文URL格式 /username/status/tweet_id
      if (pathname.includes('/status/')) {
        return {
          isSupported: true,
          confidence: 1.0,
          reason: 'Twitter推文URL'
        }
      }

      // 检查是否为用户空间 /i/spaces/
      if (pathname.includes('/i/spaces/')) {
        return {
          isSupported: true,
          confidence: 0.9,
          reason: 'Twitter Spaces URL'
        }
      }

      // Twitter域名但格式不确定
      return {
        isSupported: true,
        confidence: 0.6,
        reason: 'Twitter域名，可能包含媒体内容'
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
   * Twitter URL标准化
   * 将x.com统一转换为twitter.com (yt-dlp可能更好地支持twitter.com)
   */
  async normalizeUrl(url: string): Promise<string> {
    try {
      this.log('info', `标准化Twitter URL: ${url}`)

      // 将x.com替换为twitter.com
      const normalizedUrl = url
        .replace(/https?:\/\/(www\.|m\.|mobile\.)?x\.com/i, 'https://twitter.com')
        .replace(/https?:\/\/(m\.|mobile\.)twitter\.com/i, 'https://twitter.com')

      this.log('info', `标准化完成: ${normalizedUrl}`)
      return normalizedUrl
    } catch (error) {
      this.log('error', `URL标准化失败: ${error}`)
      return url // 标准化失败时返回原URL
    }
  }

  /**
   * 获取Twitter内容信息
   */
  async getContentInfo(url: string): Promise<ContentInfo> {
    try {
      this.log('info', `获取Twitter内容信息: ${url}`)

      // 使用yt-dlp获取信息
      const command = `${this.ytDlpPath} --dump-json --no-playlist "${url}"`
      this.log('debug', `执行命令: ${command}`)

      const { stdout, stderr } = await execAsync(command, {
        timeout: 60000, // 60秒超时
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      })

      if (stderr) {
        this.log('warn', `yt-dlp stderr: ${stderr}`)
      }

      const info = JSON.parse(stdout)

      // Twitter可能返回多个媒体项，我们取第一个或主要的
      const contentInfo: ContentInfo = {
        id: info.id || info.display_id || 'unknown',
        title: info.title || info.description || 'Twitter Post',
        duration: info.duration || 0,
        contentType: info.duration && info.duration > 0 ? 'video' : 'audio', // 根据时长判断
        platform: this.name,
        thumbnail: info.thumbnail,
        uploader: info.uploader || info.uploader_id || info.channel || 'Unknown',
        upload_date: info.upload_date,
        view_count: info.view_count,
        like_count: info.like_count,
        description: info.description,
        formats: info.formats
      }

      this.log('info', `Twitter内容信息获取成功: ${contentInfo.title}`)
      return contentInfo
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      const originalError = error instanceof Error ? error : undefined
      this.log('error', `获取Twitter内容信息失败: ${errorMessage}`)
      throw new ContentInfoError(
        `无法获取Twitter内容信息: ${errorMessage}`,
        originalError
      )
    }
  }

  /**
   * 获取Twitter下载配置
   */
  async getDownloadConfig(url: string, downloadType: 'AUDIO_ONLY' | 'VIDEO_ONLY' | 'BOTH'): Promise<DownloadConfig> {
    try {
      const contentInfo = await this.getContentInfo(url)

      // Twitter主要是视频内容，也可能有音频
      switch (downloadType) {
        case 'AUDIO_ONLY':
          return {
            format: 'bestaudio/best',
            outputTemplate: this.buildOutputTemplate(contentInfo.contentType, '_audio'),
            audioOnly: true,
            extractAudio: true,
            additionalArgs: [
              '--audio-format', 'mp3',
              '--audio-quality', '128K'
            ]
          }

        case 'VIDEO_ONLY':
          return {
            format: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            outputTemplate: this.buildOutputTemplate(contentInfo.contentType, '_video'),
            audioOnly: false,
            additionalArgs: [
              '--merge-output-format', 'mp4'
            ]
          }

        case 'BOTH':
          return {
            format: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            outputTemplate: this.buildOutputTemplate(contentInfo.contentType),
            audioOnly: false,
            additionalArgs: [
              '--merge-output-format', 'mp4',
              '--keep-video' // 保留视频文件，后续会单独提取音频
            ]
          }
      }
    } catch (error) {
      this.log('error', `获取Twitter下载配置失败: ${error}`)
      throw error
    }
  }

  /**
   * 添加Twitter特定的yt-dlp参数
   */
  async addPlatformSpecificArgs(command: string, url: string, useBrowserCookies: boolean = false): Promise<string> {
    let modifiedCommand = command

    // Twitter可能需要用户代理
    if (!command.includes('--user-agent')) {
      modifiedCommand += ' --user-agent "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"'
    }

    // 如果需要Cookie认证
    if (useBrowserCookies) {
      this.log('info', 'Twitter下载使用浏览器Cookies')
      // 可以从浏览器导入cookies，或使用cookies文件
      const cookiesPath = './data/cookies/twitter_cookies.txt'
      modifiedCommand += ` --cookies "${cookiesPath}"`
    }

    // 添加重试和超时参数
    if (!command.includes('--retries')) {
      modifiedCommand += ' --retries 3'
    }

    if (!command.includes('--socket-timeout')) {
      modifiedCommand += ' --socket-timeout 30'
    }

    // Twitter特定: 跳过不可用的片段
    modifiedCommand += ' --no-abort-on-error'

    this.log('debug', `添加Twitter特定参数: ${modifiedCommand}`)
    return modifiedCommand
  }
}
