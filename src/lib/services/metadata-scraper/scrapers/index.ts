import { metadataScraperService } from '../index'
import { YouTubeScraper } from './youtube'
import { BilibiliScraper } from './bilibili'
import { XiaoyuzhouScraper } from './xiaoyuzhou'
import { ApplePodcastsScraper } from './applepodcasts'
import { Logger } from '~/lib/utils/logger'

/**
 * 初始化所有平台爬虫
 */
export function initializeScrapers(): void {
  try {
    // 注册YouTube爬虫
    metadataScraperService.registerScraper(new YouTubeScraper())
    
    // 注册Bilibili爬虫
    metadataScraperService.registerScraper(new BilibiliScraper())
    
    // 注册小宇宙爬虫
    metadataScraperService.registerScraper(new XiaoyuzhouScraper())
    
    // 注册Apple播客爬虫
    metadataScraperService.registerScraper(new ApplePodcastsScraper())
    
    Logger.info('MetadataScraperService: 所有平台爬虫初始化完成')
  } catch (error: any) {
    Logger.error(`MetadataScraperService: 爬虫初始化失败: ${error.message}`)
    throw error
  }
}

// 导出所有爬虫类
export { YouTubeScraper } from './youtube'
export { BilibiliScraper } from './bilibili'
export { XiaoyuzhouScraper } from './xiaoyuzhou'
export { ApplePodcastsScraper } from './applepodcasts'
export { BasePlatformScraper } from './base'