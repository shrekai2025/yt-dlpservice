import { Logger } from '~/lib/utils/logger'
import type { 
  IPlatformScraper, 
  ScraperOptions, 
  ScrapingResult,
  ScraperConfig 
} from './types'
import type { Platform } from '~/types/task'

/**
 * 元数据爬虫服务
 */
export class MetadataScraperService {
  private static instance: MetadataScraperService
  private scrapers: Map<Platform, IPlatformScraper> = new Map()
  private config: ScraperConfig
  
  private constructor() {
    this.config = {
      defaultTimeout: 120000, // 120秒
      defaultWaitTime: 30000, // 30秒
      defaultCommentLimits: {
        maxTopLevel: 100,
        maxTotal: 300
      }
    }
  }
  
  public static getInstance(): MetadataScraperService {
    if (!MetadataScraperService.instance) {
      MetadataScraperService.instance = new MetadataScraperService()
    }
    return MetadataScraperService.instance
  }
  
  /**
   * 注册平台爬虫
   */
  registerScraper(scraper: IPlatformScraper): void {
    this.scrapers.set(scraper.platform, scraper)
    Logger.info(`MetadataScraperService: 注册 ${scraper.platform} 爬虫`)
  }
  
  /**
   * 根据URL查找对应的爬虫
   */
  private findScraperForUrl(url: string): IPlatformScraper | null {
    for (const scraper of this.scrapers.values()) {
      if (scraper.canHandle(url)) {
        return scraper
      }
    }
    return null
  }
  
  /**
   * 爬取元数据
   */
  async scrapeMetadata(url: string, options: ScraperOptions = {}): Promise<ScrapingResult> {
    try {
      const scraper = this.findScraperForUrl(url)
      
      if (!scraper) {
        Logger.warn(`MetadataScraperService: 未找到支持URL的爬虫: ${url}`)
        return {
          success: false,
          error: '不支持的平台URL'
        }
      }
      
      // 合并默认配置
      const mergedOptions: ScraperOptions = {
        timeout: this.config.defaultTimeout,
        waitTime: this.config.defaultWaitTime,
        maxTopLevelComments: this.config.defaultCommentLimits.maxTopLevel,
        maxTotalComments: this.config.defaultCommentLimits.maxTotal,
        ...options
      }
      
      Logger.info(`MetadataScraperService: 使用 ${scraper.platform} 爬虫处理: ${url}`)
      return await scraper.scrapeMetadata(url, mergedOptions)
      
    } catch (error: any) {
      Logger.error(`MetadataScraperService: 爬取失败: ${error.message}`)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 爬取元数据并整合yt-dlp数据
   */
  async scrapeMetadataWithBaseData(url: string, baseMetadata: any, options: ScraperOptions = {}): Promise<ScrapingResult> {
    try {
      const scraper = this.findScraperForUrl(url)
      
      if (!scraper) {
        Logger.warn(`MetadataScraperService: 未找到支持URL的爬虫: ${url}`)
        return {
          success: false,
          error: '不支持的平台URL'
        }
      }
      
      // 合并默认配置
      const mergedOptions: ScraperOptions = {
        timeout: this.config.defaultTimeout,
        waitTime: this.config.defaultWaitTime,
        maxTopLevelComments: this.config.defaultCommentLimits.maxTopLevel,
        maxTotalComments: this.config.defaultCommentLimits.maxTotal,
        ...options
      }
      
      Logger.info(`MetadataScraperService: 使用 ${scraper.platform} 爬虫处理: ${url} (整合yt-dlp数据)`)
      
      // 爬取额外的元数据（主要是评论和一些yt-dlp无法获取的数据）
      const result = await scraper.scrapeMetadata(url, mergedOptions)
      
      if (result.success && result.data) {
        // 整合yt-dlp的数据到爬虫结果中
        const enrichedData = this.enrichMetadataWithBaseData(result.data, baseMetadata)
        
        return {
          success: true,
          data: enrichedData,
          commentCount: result.commentCount,
          duration: result.duration
        }
      }
      
      return result
      
    } catch (error: any) {
      Logger.error(`MetadataScraperService: 爬取失败: ${error.message}`)
      return {
        success: false,
        error: error.message
      }
    }
  }
  
  /**
   * 整合yt-dlp基础数据到爬虫结果中
   */
  private enrichMetadataWithBaseData(scrapedData: PlatformExtraMetadata, baseMetadata: any): PlatformExtraMetadata {
    // 优先使用yt-dlp的数据，如果爬虫没有获取到相应数据
    const enriched = { ...scrapedData }
    
    // 更新基础信息（优先使用yt-dlp的精确数据）
    if (baseMetadata.title && (!enriched.title || enriched.title === 'Unknown Title')) {
      enriched.title = baseMetadata.title
    }
    
    if (baseMetadata.uploader && (!enriched.author || enriched.author === 'Unknown Author')) {
      enriched.author = baseMetadata.uploader
    }
    
    if (baseMetadata.duration && (!enriched.duration || enriched.duration === 0)) {
      enriched.duration = baseMetadata.duration
    }
    
    if (baseMetadata.upload_date && !enriched.publishDate) {
      // 格式化日期：20241201 -> 2024-12-01
      const dateStr = baseMetadata.upload_date.toString()
      if (dateStr.length === 8) {
        const year = dateStr.substring(0, 4)
        const month = dateStr.substring(4, 6)
        const day = dateStr.substring(6, 8)
        enriched.publishDate = `${year}-${month}-${day}`
      } else {
        enriched.publishDate = baseMetadata.upload_date
      }
    }
    
    if (baseMetadata.description && !enriched.description) {
      enriched.description = baseMetadata.description
    }
    
    if (baseMetadata.thumbnail && !enriched.authorAvatar) {
      enriched.authorAvatar = baseMetadata.thumbnail
    }
    
    // 整合平台特定数据（优先使用yt-dlp的精确数据）
    if (enriched.platformData) {
      // YouTube平台
      if (baseMetadata.view_count !== undefined && 
          (!enriched.platformData.viewCount || enriched.platformData.viewCount === 0)) {
        enriched.platformData.viewCount = baseMetadata.view_count
      }
      
      if (baseMetadata.like_count !== undefined && 
          (!enriched.platformData.likeCount || enriched.platformData.likeCount === 0)) {
        enriched.platformData.likeCount = baseMetadata.like_count
      }
      
      // Bilibili平台也类似
      if ('playCount' in enriched.platformData) {
        if (baseMetadata.view_count !== undefined && 
            (!enriched.platformData.playCount || enriched.platformData.playCount === 0)) {
          enriched.platformData.playCount = baseMetadata.view_count
        }
      }
    }
    
    Logger.info(`MetadataScraperService: 已整合yt-dlp数据 - 标题: ${enriched.title}, 时长: ${enriched.duration}s`)
    
    return enriched
  }

  /**
   * 检查是否支持指定URL
   */
  isSupported(url: string): boolean {
    return this.findScraperForUrl(url) !== null
  }
  
  /**
   * 获取所有已注册的平台
   */
  getSupportedPlatforms(): Platform[] {
    return Array.from(this.scrapers.keys())
  }
  
  /**
   * 更新配置
   */
  updateConfig(config: Partial<ScraperConfig>): void {
    this.config = { ...this.config, ...config }
    Logger.info('MetadataScraperService: 配置已更新')
  }
}

// 导出单例实例
export const metadataScraperService = MetadataScraperService.getInstance()