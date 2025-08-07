import type { Page } from 'puppeteer'
import { Logger } from '~/lib/utils/logger'
import { browserManager } from '~/lib/services/browser-manager'
import type { 
  IPlatformScraper, 
  ScraperOptions, 
  ScrapingResult 
} from '../types'
import type { PlatformExtraMetadata, Platform } from '~/types/task'

/**
 * 平台爬虫基类
 */
export abstract class BasePlatformScraper implements IPlatformScraper {
  abstract platform: Platform
  abstract supportedDomains: string[]
  
  /**
   * 默认配置
   */
  protected getDefaultOptions(): Required<ScraperOptions> {
    return {
      timeout: 120000, // 120秒
      headless: true,
      waitTime: 30000, // 30秒
      maxTopLevelComments: 100,
      maxTotalComments: 300
    }
  }
  
  /**
   * 验证URL是否支持
   */
  canHandle(url: string): boolean {
    try {
      const urlObj = new URL(url)
      const hostname = urlObj.hostname.toLowerCase()
      
      return this.supportedDomains.some(domain => 
        hostname === domain || hostname.endsWith('.' + domain)
      )
    } catch {
      return false
    }
  }
  
  /**
   * 爬取元数据
   */
  async scrapeMetadata(url: string, options: ScraperOptions = {}): Promise<ScrapingResult> {
    const startTime = Date.now()
    const mergedOptions = { ...this.getDefaultOptions(), ...options }
    
    let page: Page | null = null
    
    try {
      Logger.info(`[${this.platform}] 开始爬取元数据: ${url}`)
      
      // 获取浏览器页面
      page = await browserManager.getPage({ 
        headless: mergedOptions.headless, 
        timeout: mergedOptions.timeout 
      })
      
      // 设置请求拦截以优化性能（测试时禁用以避免问题）
      // await this.setupRequestInterception(page)
      
      // 访问页面
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: mergedOptions.timeout 
      })
      
      // 等待指定时间让页面完全加载
      Logger.info(`[${this.platform}] 等待 ${mergedOptions.waitTime / 1000} 秒页面加载...`)
      await this.safeWaitForTimeout(page, mergedOptions.waitTime)
      
      // 提取数据
      const data = await this.extractFromPage(page, url, mergedOptions)
      
      const duration = Date.now() - startTime
      Logger.info(`[${this.platform}] 爬取完成，耗时: ${duration}ms，评论数: ${data.comments?.length || 0}`)
      
      return {
        success: true,
        data,
        commentCount: data.comments?.length || 0,
        duration
      }
      
    } catch (error: any) {
      const duration = Date.now() - startTime
      Logger.error(`[${this.platform}] 爬取失败: ${error.message}，耗时: ${duration}ms`)
      
      return {
        success: false,
        error: error.message,
        duration
      }
    } finally {
      if (page) {
        await browserManager.releasePage(page)
      }
    }
  }
  
  /**
   * 安全的等待方法（兼容不同版本的Puppeteer）
   */
  protected async safeWaitForTimeout(page: Page, timeout: number): Promise<void> {
    try {
      // 尝试使用新版本的方法
      if (typeof page.waitForTimeout === 'function') {
        await page.waitForTimeout(timeout)
      } else {
        // 使用Promise.delay作为备用方案
        await new Promise(resolve => setTimeout(resolve, timeout))
      }
    } catch (error) {
      Logger.warn(`等待超时方法失败，使用备用方案: ${error}`)
      await new Promise(resolve => setTimeout(resolve, timeout))
    }
  }

  /**
   * 设置请求拦截以优化性能
   */
  protected async setupRequestInterception(page: Page): Promise<void> {
    try {
      await page.setRequestInterception(true)
      
      page.on('request', (req) => {
        // 检查请求是否已经被处理
        if (req.isInterceptResolutionHandled()) {
          return
        }
        
        const resourceType = req.resourceType()
        
        try {
          // 阻止加载图片、样式表、字体和媒体文件
          if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
            req.abort()
          } else {
            req.continue()
          }
        } catch (error: any) {
          // 忽略已处理的请求错误
          if (!error.message.includes('Request is already handled')) {
            Logger.debug(`请求拦截错误: ${error.message}`)
          }
        }
      })
    } catch (error: any) {
      Logger.warn(`设置请求拦截失败: ${error.message}`)
      // 继续执行，不阻止爬虫运行
    }
  }
  
  /**
   * 安全地获取元素文本内容
   */
  protected async safeGetText(page: Page, selector: string): Promise<string> {
    try {
      const element = await page.$(selector)
      if (element) {
        const text = await page.evaluate(el => el.textContent?.trim() || '', element)
        return text
      }
      return ''
    } catch {
      return ''
    }
  }
  
  /**
   * 安全地获取元素属性
   */
  protected async safeGetAttribute(page: Page, selector: string, attribute: string): Promise<string> {
    try {
      const element = await page.$(selector)
      if (element) {
        const value = await page.evaluate((el, attr) => el.getAttribute(attr) || '', element, attribute)
        return value
      }
      return ''
    } catch {
      return ''
    }
  }
  
  /**
   * 解析时长字符串为秒数
   */
  protected parseDuration(durationStr: string): number {
    try {
      if (!durationStr) return 0
      
      // 处理中文时长格式："92分钟"、"1小时30分钟"、"2小时"等
      if (durationStr.includes('分钟') || durationStr.includes('小时')) {
        let totalSeconds = 0
        
        // 提取小时数
        const hourMatch = durationStr.match(/(\d+)\s*小时/)
        if (hourMatch) {
          totalSeconds += parseInt(hourMatch[1]!) * 3600
        }
        
        // 提取分钟数
        const minuteMatch = durationStr.match(/(\d+)\s*分钟?/)
        if (minuteMatch) {
          totalSeconds += parseInt(minuteMatch[1]!) * 60
        }
        
        // 提取秒数（如果有）
        const secondMatch = durationStr.match(/(\d+)\s*秒/)
        if (secondMatch) {
          totalSeconds += parseInt(secondMatch[1]!)
        }
        
        if (totalSeconds > 0) {
          return totalSeconds
        }
      }
      
      // 处理标准格式："MM:SS"、"HH:MM:SS"
      if (durationStr.includes(':')) {
        const parts = durationStr.split(':').map(p => parseInt(p, 10)).filter(p => !isNaN(p))
        if (parts.length === 2) {
          return parts[0]! * 60 + parts[1]!
        } else if (parts.length === 3) {
          return parts[0]! * 3600 + parts[1]! * 60 + parts[2]!
        }
      }
      
      // 处理纯数字（假设为秒）
      const numberMatch = durationStr.match(/^\d+$/)
      if (numberMatch) {
        return parseInt(durationStr, 10)
      }
      
      return 0
    } catch {
      return 0
    }
  }
  
  /**
   * 解析数字字符串（支持K、M、万等单位，以及中文YouTube的"次观看"格式）
   */
  protected parseCount(countStr: string): number {
    try {
      if (!countStr) return 0
      
      // 处理YouTube中文的"次观看"格式，如"7152次观看"
      if (countStr.includes('次观看')) {
        const match = countStr.match(/(\d+(?:\.\d+)?(?:[万千])?)\s*次观看/)
        if (match) {
          countStr = match[1] || '0'
        }
      }
      
      // 处理YouTube英文的"views"格式，如"7,152 views"
      if (countStr.includes('views')) {
        const match = countStr.match(/(\d+(?:,\d+)*(?:\.\d+)?(?:[KMB])?)\s*views/i)
        if (match) {
          countStr = match[1] || '0'
        }
      }
      
      const cleanStr = countStr.replace(/[,\s]/g, '').toLowerCase()
      
      if (cleanStr.includes('万')) {
        const num = parseFloat(cleanStr.replace('万', ''))
        return Math.floor(num * 10000)
      }
      
      if (cleanStr.includes('千')) {
        const num = parseFloat(cleanStr.replace('千', ''))
        return Math.floor(num * 1000)
      }
      
      if (cleanStr.includes('k')) {
        const num = parseFloat(cleanStr.replace('k', ''))
        return Math.floor(num * 1000)
      }
      
      if (cleanStr.includes('m')) {
        const num = parseFloat(cleanStr.replace('m', ''))
        return Math.floor(num * 1000000)
      }
      
      if (cleanStr.includes('b')) {
        const num = parseFloat(cleanStr.replace('b', ''))
        return Math.floor(num * 1000000000)
      }
      
      return parseInt(cleanStr, 10) || 0
    } catch {
      return 0
    }
  }
  
  /**
   * 抽象方法：从页面提取数据
   */
  abstract extractFromPage(page: Page, url: string, options: Required<ScraperOptions>): Promise<PlatformExtraMetadata>
}