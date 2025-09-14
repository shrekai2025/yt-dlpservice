import { AbstractPlatform } from '~/lib/platforms/base/abstract-platform'
import { XiaoyuzhouExtractor } from './xiaoyuzhou-parser'
import type { ContentInfo, ContentType, PlatformValidation } from '~/lib/platforms/base/platform-interface'
import type { PlatformExtractor } from '~/lib/downloaders/types'

/**
 * 小宇宙平台实现
 */
export class XiaoyuzhouPlatform extends AbstractPlatform {
  name = 'xiaoyuzhou'
  supportedDomains = ['xiaoyuzhoufm.com', 'www.xiaoyuzhoufm.com']
  supportedContentTypes: ContentType[] = ['podcast', 'audio']
  requiresAuth = false
  
  // 标记为需要自定义下载器
  downloadMethod: 'ytdlp' | 'custom' = 'custom'
  
  private extractor: XiaoyuzhouExtractor
  
  constructor(ytDlpPath?: string) {
    super(ytDlpPath)
    this.extractor = new XiaoyuzhouExtractor()
  }
  
  /**
   * 获取提取器实例
   */
  getExtractor(): PlatformExtractor {
    return this.extractor
  }

  /**
   * 小宇宙URL验证逻辑
   * 只支持 /episode/ 类型的URL，不支持 /podcast/ 主页
   */
  validateUrl(url: string): PlatformValidation {
    try {
      const urlObj = new URL(url)
      const hostname = urlObj.hostname.toLowerCase()
      
      // 检查域名
      const isXiaoyuzhouDomain = this.supportedDomains.some(domain => 
        hostname === domain || hostname.endsWith('.' + domain)
      )
      
      if (!isXiaoyuzhouDomain) {
        return {
          isSupported: false,
          confidence: 0,
          reason: `不是小宇宙域名: ${hostname}`
        }
      }

      const pathname = urlObj.pathname
      
      // ✅ 支持的URL：/episode/ - 具体单集页面
      if (pathname.includes('/episode/')) {
        const episodeId = pathname.match(/\/episode\/([a-zA-Z0-9]+)/)?.[1]
        if (episodeId) {
          return {
            isSupported: true,
            confidence: 1.0,
            reason: `小宇宙单集页面: ${episodeId}`
          }
        }
      }
      
      // ❌ 不支持的URL：/podcast/ - 播客主页
      if (pathname.includes('/podcast/')) {
        return {
          isSupported: false,
          confidence: 0,
          reason: '小宇宙播客主页不支持下载，请使用具体单集链接 (格式: /episode/xxx)'
        }
      }
      
      // 其他路径也不支持
      return {
        isSupported: false,
        confidence: 0,
        reason: `不支持的小宇宙URL格式: ${pathname}，请使用单集链接 (格式: /episode/xxx)`
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
   * 标准化小宇宙URL
   */
  async normalizeUrl(url: string): Promise<string> {
    // 基础清理
    url = url.trim()
    
    // 移除查询参数（如果需要）
    try {
      const urlObj = new URL(url)
      // 保留路径，移除不必要的查询参数
      return `${urlObj.origin}${urlObj.pathname}`
    } catch {
      return url
    }
  }
  
  /**
   * 获取内容信息
   * 注意：这个方法在使用 custom 下载方式时不会被调用
   * ContentDownloader 会直接使用 WebBasedDownloader
   */
  async getContentInfo(url: string): Promise<ContentInfo> {
    // 这个方法主要用于兼容性，实际的元数据获取在 extractor 中
    return {
      id: this.extractEpisodeId(url),
      title: '小宇宙播客',
      thumbnail: '',
      duration: 0,
      contentType: 'podcast',
      platform: 'xiaoyuzhou',
      uploader: '小宇宙'
    }
  }
  
  /**
   * 从URL提取节目ID
   */
  private extractEpisodeId(url: string): string {
    try {
      const urlObj = new URL(url)
      const match = urlObj.pathname.match(/episode\/([^\/]+)/)
      return match && match[1] ? match[1] : 'unknown'
    } catch {
      return 'unknown'
    }
  }
  
  /**
   * 添加平台特定参数
   * 小宇宙不使用 yt-dlp，所以这个方法不会被调用
   */
  async addPlatformSpecificArgs(command: string, url: string, useBrowserCookies: boolean = true): Promise<string> {
    return command
  }
} 