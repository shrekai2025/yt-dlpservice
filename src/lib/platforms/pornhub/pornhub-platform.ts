import { AbstractPlatform } from '../base/abstract-platform'
import type { ContentInfo, DownloadConfig, PlatformValidation, ContentType } from '../base/platform-interface'
import { ContentInfoError } from '~/lib/utils/errors'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * PornHub平台实现
 */
export class PornHubPlatform extends AbstractPlatform {
  name = 'pornhub'
  supportedDomains = ['pornhub.com', 'www.pornhub.com']
  supportedContentTypes: ContentType[] = ['video']
  requiresAuth = false

  constructor(ytDlpPath?: string) {
    super(ytDlpPath)
  }

  /**
   * PornHub URL验证逻辑
   */
  validateUrl(url: string): PlatformValidation {
    try {
      const urlObj = new URL(url)
      const hostname = urlObj.hostname.toLowerCase()

      // 检查域名
      const isPornHubDomain = this.supportedDomains.some(domain =>
        hostname === domain || hostname.endsWith('.' + domain)
      )

      if (!isPornHubDomain) {
        return {
          isSupported: false,
          confidence: 0,
          reason: `不是PornHub域名: ${hostname}`
        }
      }

      const pathname = urlObj.pathname

      // 检查常见的PornHub URL格式
      if (pathname.includes('/view_video.php')) {
        return {
          isSupported: true,
          confidence: 1.0,
          reason: 'PornHub视频页面 (view_video.php)'
        }
      }

      if (pathname.includes('/embed/')) {
        return {
          isSupported: true,
          confidence: 0.9,
          reason: 'PornHub嵌入视频'
        }
      }

      // /video/show 格式
      if (pathname.match(/\/video\/show\/title\/[\w-]+/)) {
        return {
          isSupported: true,
          confidence: 0.95,
          reason: 'PornHub视频页面 (show格式)'
        }
      }

      // 可能是PornHub URL但格式不太确定
      return {
        isSupported: true,
        confidence: 0.7,
        reason: 'PornHub域名，格式可能有效'
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
   * 获取PornHub视频信息
   */
  async getContentInfo(url: string): Promise<ContentInfo> {
    this.log('info', `获取视频信息: ${url}`)

    try {
      // 使用yt-dlp获取视频信息
      const command = this.buildYtDlpCommand(`-J --no-warnings "${url}"`)
      this.log('debug', `执行命令: ${command}`)

      const { stdout } = await execAsync(command, { maxBuffer: 10 * 1024 * 1024 })
      const info = JSON.parse(stdout)

      const contentInfo: ContentInfo = {
        id: info.id || Date.now().toString(),
        title: info.title || 'Unknown Title',
        duration: info.duration || 0,
        contentType: 'video',
        platform: this.name,
        thumbnail: info.thumbnail,
        uploader: info.uploader || info.channel || 'Unknown',
        description: info.description,
        upload_date: info.upload_date,
        view_count: info.view_count,
        like_count: info.like_count
      }

      this.log('info', `✅ 获取视频信息成功: ${contentInfo.title}`)
      return contentInfo

    } catch (error: any) {
      this.log('error', `获取视频信息失败: ${error.message}`)
      throw new ContentInfoError(`获取PornHub视频信息失败: ${error.message}`, error)
    }
  }

  /**
   * 获取下载配置
   */
  async getDownloadConfig(url: string, downloadType: 'AUDIO_ONLY' | 'VIDEO_ONLY' | 'BOTH'): Promise<DownloadConfig> {
    // PornHub是纯视频内容，使用父类的默认配置
    return super.getDownloadConfig(url, downloadType)
  }

  /**
   * 添加平台特定参数
   */
  async addPlatformSpecificArgs(command: string, url: string, useBrowserCookies: boolean = true): Promise<string> {
    // PornHub通常不需要特殊认证，使用通用参数即可
    let finalCommand = this.addCommonArgs(command)

    // 添加年龄验证绕过（某些地区需要）
    finalCommand += ' --age-limit 99'

    return finalCommand
  }

  /**
   * 标准化URL
   */
  async normalizeUrl(url: string): Promise<string> {
    // 基础清理
    let normalized = url.trim()

    // 移除查询参数中的跟踪参数
    try {
      const urlObj = new URL(normalized)
      // 保留必要的参数，移除跟踪参数
      const paramsToKeep = ['viewkey', 'video_id']
      const newParams = new URLSearchParams()

      for (const param of paramsToKeep) {
        if (urlObj.searchParams.has(param)) {
          newParams.set(param, urlObj.searchParams.get(param)!)
        }
      }

      urlObj.search = newParams.toString()
      normalized = urlObj.toString()
    } catch (error) {
      this.log('warn', `URL标准化失败，使用原始URL: ${error}`)
    }

    return normalized
  }
}
