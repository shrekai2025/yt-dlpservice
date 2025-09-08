import { AbstractPlatform } from '~/lib/platforms/base/abstract-platform'
import { ApplePodcastsExtractor } from './applepodcasts-parser'
import type { ContentInfo, ContentType, PlatformValidation } from '~/lib/platforms/base/platform-interface'
import type { PlatformExtractor } from '~/lib/downloaders/types'

/**
 * Apple播客平台实现
 */
export class ApplePodcastsPlatform extends AbstractPlatform {
  name = 'applepodcasts'
  supportedDomains = ['podcasts.apple.com']
  supportedContentTypes: ContentType[] = ['podcast', 'audio']
  requiresAuth = false
  
  // 标记为需要自定义下载器
  downloadMethod: 'ytdlp' | 'custom' = 'custom'
  
  private extractor: ApplePodcastsExtractor
  
  constructor(ytDlpPath?: string) {
    super(ytDlpPath)
    this.extractor = new ApplePodcastsExtractor()
  }

  /**
   * Apple播客URL验证逻辑
   * URL格式: https://podcasts.apple.com/hk/podcast/a16z-podcast/id842818711?l=en-GB&i=1000725270034
   */
  validateUrl(url: string): PlatformValidation {
    try {
      const urlObj = new URL(url)
      
      // 检查域名
      if (urlObj.hostname !== 'podcasts.apple.com') {
        return { isSupported: false, confidence: 0, reason: '不是Apple播客域名' }
      }

      // 检查URL格式
      const pathPattern = /^\/[a-z]{2}\/podcast\/.+\/id\d+$/
      if (!pathPattern.test(urlObj.pathname)) {
        return { isSupported: false, confidence: 0.3, reason: 'URL格式不完整，可能不是单集链接' }
      }

      // 检查是否包含单集ID
      const hasEpisodeId = urlObj.searchParams.has('i')
      if (!hasEpisodeId) {
        return { isSupported: false, confidence: 0.5, reason: '缺少单集ID参数(i=)，可能是播客主页' }
      }

      // 验证ID格式
      const podcastIdMatch = urlObj.pathname.match(/id(\d+)$/)
      const episodeId = urlObj.searchParams.get('i')
      
      if (!podcastIdMatch) {
        return { isSupported: false, confidence: 0.2, reason: '播客ID格式不正确' }
      }

      if (!episodeId || !/^\d+$/.test(episodeId)) {
        return { isSupported: false, confidence: 0.4, reason: '单集ID格式不正确' }
      }

      return { isSupported: true, confidence: 1.0, reason: '有效的Apple播客单集URL' }
    } catch (error) {
      return { isSupported: false, confidence: 0, reason: `URL解析失败: ${error}` }
    }
  }

  /**
   * 标准化URL
   * 确保URL格式统一
   */
  async normalizeUrl(url: string): Promise<string> {
    try {
      const urlObj = new URL(url)
      
      // 确保使用HTTPS
      urlObj.protocol = 'https:'
      
      // 规范化域名
      urlObj.hostname = 'podcasts.apple.com'
      
      return urlObj.toString()
    } catch (error) {
      throw new Error(`URL标准化失败: ${error}`)
    }
  }

  /**
   * 获取内容信息
   * 注意：在custom模式下，此方法不会被ContentDownloader调用
   */
  async getContentInfo(url: string): Promise<ContentInfo> {
    const urlObj = new URL(url)
    const podcastIdMatch = urlObj.pathname.match(/id(\d+)$/)
    const episodeId = urlObj.searchParams.get('i')
    const region = urlObj.pathname.match(/^\/([a-z]{2})\//)?.[1] || 'us'

    return {
      id: episodeId || `${podcastIdMatch?.[1] || 'unknown'}_${Date.now()}`,
      title: `Apple播客单集 ${episodeId || ''}`,
      duration: 0, // 将在解析时获取
      contentType: 'podcast',
      platform: 'applepodcasts',
      uploader: 'Apple播客',
      upload_date: '', // 将在解析时获取
      description: '',
      thumbnail: '',
    }
  }

  /**
   * 获取下载配置
   * 注意：在custom模式下，此方法不会被ContentDownloader调用
   */
  async getDownloadConfig(url: string, downloadType: 'AUDIO_ONLY' | 'VIDEO_ONLY' | 'BOTH') {
    // Apple播客只支持音频下载
    if (downloadType === 'VIDEO_ONLY') {
      throw new Error('Apple播客不支持视频下载')
    }

    const contentInfo = await this.getContentInfo(url)

    return {
      url: url,
      outputTemplate: `%(title)s.%(ext)s`,
      format: 'best[ext=m4a]/best[ext=mp3]/best', // 优先选择较小的音频格式
      additionalArgs: [
        '--extract-flat', 'false',
        '--no-playlist',
        '--prefer-free-formats',
        '--audio-quality', '5', // 选择较低音质以获得更小文件
      ],
      metadata: {
        title: contentInfo.title,
        uploader: contentInfo.uploader,
        platform: 'applepodcasts'
      }
    }
  }

  /**
   * 添加平台特定的yt-dlp参数
   * 注意：在custom模式下，此方法不会被调用
   */
  async addPlatformSpecificArgs(command: string, url: string, useBrowserCookies?: boolean): Promise<string> {
    let enhancedCommand = command
    
    // 添加音频质量参数，选择最小文件
    enhancedCommand += ' --audio-quality 5'
    enhancedCommand += ' --prefer-free-formats'
    
    return enhancedCommand
  }

  /**
   * 获取提取器实例
   */
  getExtractor(): PlatformExtractor {
    return this.extractor
  }

  /**
   * 处理认证需求
   * Apple播客公开内容无需认证
   */
  async handleAuthRequired(): Promise<boolean> {
    // 暂时不支持需要登录的内容
    return false
  }

  /**
   * 平台特定的后处理
   * 可用于添加元数据、转换格式等
   */
  async postProcess(filePath: string, contentInfo: ContentInfo): Promise<string> {
    // 暂时不需要特殊后处理
    return filePath
  }
}
