import type { Page } from 'puppeteer'
import type { PlatformExtraMetadata, Platform } from '~/types/task'

/**
 * 爬虫配置选项
 */
export interface ScraperOptions {
  /** 超时时间（毫秒），默认120秒 */
  timeout?: number
  /** 是否无头模式，默认true */
  headless?: boolean
  /** 等待时间（毫秒），默认30秒 */
  waitTime?: number
  /** 一级评论上限，默认100 */
  maxTopLevelComments?: number
  /** 总评论上限（含回复），默认300 */
  maxTotalComments?: number
}

/**
 * 爬虫结果
 */
export interface ScrapingResult {
  success: boolean
  data?: PlatformExtraMetadata
  error?: string
  /** 实际获取的评论数量 */
  commentCount?: number
  /** 耗时（毫秒） */
  duration?: number
}

/**
 * 平台爬虫接口
 */
export interface IPlatformScraper {
  /** 平台名称 */
  platform: Platform
  
  /** 支持的域名 */
  supportedDomains: string[]
  
  /**
   * 验证URL是否支持
   */
  canHandle(url: string): boolean
  
  /**
   * 爬取元数据
   */
  scrapeMetadata(url: string, options?: ScraperOptions): Promise<ScrapingResult>
  
  /**
   * 从页面提取数据（内部方法）
   */
  extractFromPage(page: Page, url: string, options: ScraperOptions): Promise<PlatformExtraMetadata>
}

/**
 * 爬虫工厂配置
 */
export interface ScraperConfig {
  /** 默认超时时间 */
  defaultTimeout: number
  /** 默认等待时间 */
  defaultWaitTime: number
  /** 默认评论限制 */
  defaultCommentLimits: {
    maxTopLevel: number
    maxTotal: number
  }
}