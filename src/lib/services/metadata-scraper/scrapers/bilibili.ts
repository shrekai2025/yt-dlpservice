import type { Page } from 'puppeteer'
import { BasePlatformScraper } from './base'
import type { ScraperOptions } from '../types'
import type { PlatformExtraMetadata, BilibiliData, Comment } from '~/types/task'
import { Logger } from '~/lib/utils/logger'

/**
 * Bilibili平台爬虫
 */
export class BilibiliScraper extends BasePlatformScraper {
  platform = 'bilibili' as const
  supportedDomains = ['bilibili.com', 'www.bilibili.com', 'b23.tv']
  
  /**
   * 重写scrape方法以处理B站反爬虫
   */
  async scrape(url: string, options: Partial<ScraperOptions> = {}): Promise<{ success: boolean; data: PlatformExtraMetadata | null; error: string | null; duration: number }> {
    const startTime = Date.now()
    const browserManager = await import('~/lib/services/browser-manager').then(m => m.browserManager)
    
    let page = null
    try {
      Logger.info(`[${this.platform}] 开始爬取元数据: ${url}`)
      
      const mergedOptions = {
        timeout: 120000,
        headless: true,
        waitTime: 30000,
        maxTopLevelComments: 100,
        maxTotalComments: 300,
        ...options
      }
      
      page = await browserManager.getPage({ 
        headless: mergedOptions.headless, 
        timeout: mergedOptions.timeout 
      })
      
      // 设置更真实的请求头以避免反爬虫
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36')
      await page.setExtraHTTPHeaders({
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.bilibili.com/'
      })
      
      // 访问页面
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: mergedOptions.timeout 
      })
      
      // 检查是否被重定向到首页（反爬虫）
      const currentUrl = page.url()
      if (!currentUrl.includes('/video/') && currentUrl.includes('bilibili.com')) {
        Logger.warn(`[${this.platform}] 检测到反爬虫重定向: ${currentUrl}`)
        // 尝试再次访问原URL
        await new Promise(resolve => setTimeout(resolve, 2000))
        await page.goto(url, { 
          waitUntil: 'networkidle2',
          timeout: mergedOptions.timeout 
        })
      }
      
      // 等待指定时间让页面完全加载
      const waitTime = mergedOptions.waitTime
      Logger.info(`[${this.platform}] 等待 ${waitTime / 1000} 秒页面加载...`)
      await this.safeWaitForTimeout(page, waitTime)
      
      // 提取数据
      const data = await this.extractFromPage(page, url, mergedOptions)
      
      const duration = Date.now() - startTime
      Logger.info(`[${this.platform}] 爬取完成，耗时: ${duration}ms，评论数: ${data.comments?.length || 0}`)
      
      return {
        success: true,
        data,
        error: null,
        duration
      }
    } catch (error: any) {
      const duration = Date.now() - startTime
      Logger.error(`[${this.platform}] 爬取失败: ${error.message}，耗时: ${duration}ms`)
      
      return {
        success: false,
        data: null,
        error: error.message,
        duration
      }
    } finally {
      if (page) {
        await browserManager.releasePage(page)
      }
    }
  }
  
  async extractFromPage(page: Page, url: string, options: Required<ScraperOptions>): Promise<PlatformExtraMetadata> {
    Logger.info('[Bilibili] 开始提取页面数据')
    
    // 等待关键元素加载
    try {
      await page.waitForSelector('.video-title, h1[title]', { timeout: 10000 })
    } catch {
      Logger.warn('[Bilibili] 未找到标题元素，继续尝试其他选择器')
    }
    
    // 提取基本信息和平台数据
    const [basicInfo, platformData, comments] = await Promise.all([
      this.extractBasicInfo(page),
      this.extractPlatformData(page),
      this.extractComments(page, options)
    ])
    
    return {
      ...basicInfo,
      platformData,
      comments
    }
  }
  
  /**
   * 提取基本信息
   */
  private async extractBasicInfo(page: Page) {
    const title = await this.safeGetText(page, 
      '.video-info-title h1, .video-title, h1[data-title], h1[title]'
    )
    Logger.info(`[Bilibili] 基本信息: title=${title ? 'ok' : 'empty'}`)
    
    const author = await this.safeGetText(page, 
      '.up-name, .username, .up-info .name, .video-info-detail .name'
    )
    Logger.info(`[Bilibili] 基本信息: author=${author ? 'ok' : 'empty'}`)
    
    const authorAvatar = await this.safeGetAttribute(page, 
      '.up-face img, .up-info img, .video-info-detail img',
      'src'
    )
    Logger.info(`[Bilibili] 基本信息: authorAvatar=${authorAvatar ? 'ok' : 'empty'}`)
    
    const description = await this.safeGetText(page, 
      '.video-desc, .desc-info, .video-info-desc'
    )
    Logger.info(`[Bilibili] 基本信息: description=${description ? 'ok' : 'empty'}`)
    
    // 从页面数据中提取时长和发布时间
    const pageData = await page.evaluate(() => {
      // 尝试从页面脚本中提取数据
      const scripts = Array.from(document.querySelectorAll('script'))
      for (const script of scripts) {
        const content = script.innerHTML
        if (content.includes('window.__INITIAL_STATE__')) {
          try {
            const match = content.match(/window\.__INITIAL_STATE__\s*=\s*({.+?});/)
            if (match) {
              const data = JSON.parse(match[1]!)
              const videoData = data?.videoData || data?.playInfo
              
              return {
                duration: videoData?.duration || 0,
                publishDate: videoData?.pubdate ? new Date(videoData.pubdate * 1000).toLocaleDateString() : ''
              }
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
      
      // 备用方法：从DOM元素获取
      const durationEl = document.querySelector('.total-time, .video-time .total')
      const publishEl = document.querySelector('.pubdate, .video-info-detail .pubdate')
      
      return {
        duration: durationEl?.textContent?.trim() || '',
        publishDate: publishEl?.textContent?.trim() || ''
      }
    })
    
    const duration = typeof pageData.duration === 'number' ? pageData.duration : this.parseDuration(pageData.duration)
    Logger.info(`[Bilibili] 基本信息: rawDuration="${pageData.duration}", parsed=${duration}`)
    
    const basic = {
      title: title || 'Unknown Title',
      author: author || 'Unknown Author',
      authorAvatar: authorAvatar || undefined,
      duration,
      publishDate: pageData.publishDate || undefined,
      description: description || undefined
    }
    Logger.info(`[Bilibili] 基本信息汇总: ${JSON.stringify({ t: !!basic.title, a: !!basic.author, d: basic.duration, p: basic.publishDate ? 1 : 0 })}`)
    return basic
  }
  
  /**
   * 提取平台特定数据
   */
  private async extractPlatformData(page: Page): Promise<BilibiliData> {
    const data = await page.evaluate(() => {
      // 尝试从页面脚本中提取数据
      const scripts = Array.from(document.querySelectorAll('script'))
      for (const script of scripts) {
        const content = script.innerHTML
        if (content.includes('window.__INITIAL_STATE__')) {
          try {
            const match = content.match(/window\.__INITIAL_STATE__\s*=\s*({.+?});/)
            if (match) {
              const data = JSON.parse(match[1]!)
              const videoData = data?.videoData
              const stat = videoData?.stat || {}
              
              return {
                playCount: stat.view || 0,
                likeCount: stat.like || 0,
                coinCount: stat.coin || 0,
                shareCount: stat.share || 0,
                favoriteCount: stat.favorite || 0,
                commentCount: stat.reply || 0
              }
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
      
      // 备用方法：从DOM元素获取（更新选择器匹配新版B站）
      const viewEl = document.querySelector('.view-text, .view .num, .view-count, .video-info-detail .view')
      const likeEl = document.querySelector('.video-like-info, .like-count, .ops .like span')
      const coinEl = document.querySelector('.video-coin-info, .coin-count, .ops .coin span')
      const shareEl = document.querySelector('.video-share-info-text, .share-count, .ops .share span')
      const favoriteEl = document.querySelector('.video-fav-info, .favorite-count, .ops .collect span')
      const commentEl = document.querySelector('.comment-count, .reply-count')
      
      return {
        playCount: viewEl?.textContent?.trim() || '0',
        likeCount: likeEl?.textContent?.trim() || '0',
        coinCount: coinEl?.textContent?.trim() || '0',
        shareCount: shareEl?.textContent?.trim() || '0',
        favoriteCount: favoriteEl?.textContent?.trim() || '0',
        commentCount: commentEl?.textContent?.trim() || '0'
      }
    })
    
    const pd = {
      playCount: typeof data.playCount === 'number' ? data.playCount : this.parseCount(data.playCount),
      likeCount: typeof data.likeCount === 'number' ? data.likeCount : this.parseCount(data.likeCount),
      coinCount: typeof data.coinCount === 'number' ? data.coinCount : this.parseCount(data.coinCount),
      shareCount: typeof data.shareCount === 'number' ? data.shareCount : this.parseCount(data.shareCount),
      favoriteCount: typeof data.favoriteCount === 'number' ? data.favoriteCount : this.parseCount(data.favoriteCount),
      commentCount: typeof data.commentCount === 'number' ? data.commentCount : this.parseCount(data.commentCount)
    }
    Logger.info(`[Bilibili] 平台数据汇总: ${JSON.stringify(pd)}`)
    return pd
  }
  
  /**
   * 提取评论
   */
  private async extractComments(page: Page, options: Required<ScraperOptions>): Promise<Comment[]> {
    try {
      Logger.info('[Bilibili] 开始提取评论')
      
      // 先滚动到页面中间，触发更多内容加载
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight * 0.5)
      })
      
      await this.safeWaitForTimeout(page, 2000)
      
      // 滚动到评论区域
      await page.evaluate(() => {
        const commentsSelectors = [
          '.bb-comment',
          '.comment-container', 
          '#comment',
          '.comment',
          '.reply-wrap',
          '.comment-bilibili'
        ]
        
        let commentsSection = null
        for (const selector of commentsSelectors) {
          commentsSection = document.querySelector(selector)
          if (commentsSection) break
        }
        
        if (commentsSection) {
          commentsSection.scrollIntoView({ behavior: 'smooth' })
        } else {
          // 如果找不到评论区域，滚动到页面底部
          window.scrollTo(0, document.body.scrollHeight)
        }
      })
      
      // 等待评论区域加载
      Logger.info('[Bilibili] 等待评论区域加载...')
      await this.safeWaitForTimeout(page, 5000)
      
      // 尝试多种选择器等待评论元素出现
      const commentSelectors = [
        '.comment-item',
        '.reply-item', 
        '.list-item',
        '.reply-wrap .reply-item',
        '.comment .comment-item',
        '.bb-comment .comment-item'
      ]
      
      let foundComments = false
      for (const selector of commentSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 })
          foundComments = true
          Logger.info(`[Bilibili] 找到评论元素: ${selector}`)
          break
        } catch {
          continue
        }
      }
      
      if (!foundComments) {
        Logger.warn('[Bilibili] 未找到评论元素，尝试更多滚动')
        
        // 多次滚动尝试触发评论加载
        for (let i = 0; i < 3; i++) {
          await page.evaluate(() => {
            window.scrollBy(0, window.innerHeight)
          })
          await this.safeWaitForTimeout(page, 2000)
          
          // 检查是否有评论元素出现
          const hasComments = await page.evaluate(() => {
            const selectors = ['.comment-item', '.reply-item', '.list-item']
            return selectors.some(selector => document.querySelector(selector) !== null)
          })
          
          if (hasComments) {
            foundComments = true
            Logger.info('[Bilibili] 滚动后找到评论元素')
            break
          }
        }
        
        if (!foundComments) {
          Logger.info('[Bilibili] 最终未找到评论，可能没有评论或需要登录')
          return []
        }
      }
      
      // 提取评论数据
      const comments = await page.evaluate((limits) => {
        const commentElements = document.querySelectorAll('.comment-item, .reply-item, .list-item')
        const extractedComments: any[] = []
        let totalComments = 0
        
        for (let i = 0; i < Math.min(commentElements.length, limits.maxTopLevel); i++) {
          const commentEl = commentElements[i]
          if (!commentEl) continue
          
          // 提取主评论
          const authorEl = commentEl.querySelector('.user-name, .name, .reply-name')
          const contentEl = commentEl.querySelector('.text, .reply-content, .content')
          
          if (!authorEl || !contentEl) continue
          
          const mainComment = {
            author: authorEl.textContent?.trim() || '',
            content: contentEl.textContent?.trim() || '',
            replies: [] as any[]
          }
          
          totalComments++
          
          // 提取回复（如果有）
          const replyContainer = commentEl.querySelector('.reply-box, .sub-reply-container, .replies')
          if (replyContainer) {
            const replyElements = replyContainer.querySelectorAll('.sub-reply-item, .reply-item')
            for (const replyEl of Array.from(replyElements)) {
              if (totalComments >= limits.maxTotal) break
              
              const replyAuthorEl = replyEl.querySelector('.sub-user-name, .name, .reply-name')
              const replyContentEl = replyEl.querySelector('.sub-reply-content, .text, .content')
              
              if (replyAuthorEl && replyContentEl) {
                mainComment.replies.push({
                  author: replyAuthorEl.textContent?.trim() || '',
                  content: replyContentEl.textContent?.trim() || ''
                })
                totalComments++
              }
            }
          }
          
          extractedComments.push(mainComment)
          
          if (totalComments >= limits.maxTotal) break
        }
        
        return extractedComments
      }, { maxTopLevel: options.maxTopLevelComments, maxTotal: options.maxTotalComments })
      
      Logger.info(`[Bilibili] 提取到 ${comments.length} 条评论`)
      return comments
      
    } catch (error: any) {
      Logger.warn(`[Bilibili] 评论提取失败: ${error.message}`)
      return []
    }
  }
}