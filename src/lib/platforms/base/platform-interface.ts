/**
 * 内容类型定义
 */
export type ContentType = 'video' | 'audio' | 'podcast'

/**
 * 下载方法定义
 */
export type DownloadMethod = 'yt-dlp' | 'custom' | 'api'

/**
 * 内容信息接口
 */
export interface ContentInfo {
  id: string
  title: string
  duration: number
  contentType: ContentType
  platform: string
  thumbnail?: string
  uploader: string
  upload_date?: string
  view_count?: number
  like_count?: number
  description?: string
  formats?: any[]
}

/**
 * 下载配置接口
 */
export interface DownloadConfig {
  format: string
  outputTemplate: string
  audioOnly?: boolean
  quality?: string
  extractAudio?: boolean
  additionalArgs?: string[]
}

/**
 * 平台验证结果
 */
export interface PlatformValidation {
  isSupported: boolean
  confidence: number // 0-1, 匹配度
  reason?: string
}

/**
 * 平台接口 - 所有平台必须实现
 * 
 * 下载方法说明：
 * - downloadMethod 为 'ytdlp' (默认): 使用 yt-dlp 下载，需要实现 getContentInfo 和 getDownloadConfig
 * - downloadMethod 为 'custom': 使用 WebBasedDownloader，必须实现 getExtractor() 方法
 *   在 custom 模式下，ContentDownloader 会绕过 getContentInfo 和 getDownloadConfig，
 *   直接使用 WebBasedDownloader 和提供的 extractor
 */
export interface IPlatform {
  /** 平台名称 */
  name: string
  
  /** 支持的域名列表 */
  supportedDomains: string[]
  
  /** 支持的内容类型 */
  supportedContentTypes: ContentType[]
  
  /** 是否需要认证 */
  requiresAuth: boolean
  
  /** 下载方法 - ytdlp 使用 yt-dlp，custom 使用自定义下载器 */
  downloadMethod?: 'ytdlp' | 'custom'
  
  /**
   * 验证URL是否被此平台支持
   */
  validateUrl(url: string): PlatformValidation
  
  /**
   * 标准化URL
   */
  normalizeUrl(url: string): Promise<string>
  
  /**
   * 获取内容信息
   */
  getContentInfo(url: string): Promise<ContentInfo>
  
  /**
   * 获取下载配置
   */
  getDownloadConfig(url: string, downloadType: 'AUDIO_ONLY' | 'VIDEO_ONLY' | 'BOTH'): Promise<DownloadConfig>
  
  /**
   * 添加平台特定的yt-dlp参数
   */
  addPlatformSpecificArgs(command: string, url: string, useBrowserCookies?: boolean): Promise<string>
  
  /**
   * 获取自定义提取器 (仅在 downloadMethod 为 'custom' 时需要)
   */
  getExtractor?(): import('~/lib/downloaders/types').PlatformExtractor
  
  /**
   * 处理认证需求 (可选)
   */
  handleAuthRequired?(): Promise<boolean>
  
  /**
   * 平台特定的后处理 (可选)
   */
  postProcess?(filePath: string, contentInfo: ContentInfo): Promise<string>
} 