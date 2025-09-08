import type { Page } from 'puppeteer'
import { BasePlatformScraper } from './base'
import type { ScraperOptions } from '../types'
import type { PlatformExtraMetadata, Comment } from '~/types/task'
import { Logger } from '~/lib/utils/logger'

/**
 * Apple播客特定数据接口
 */
export interface ApplePodcastsData {
  rating?: number              // 播客评分 (1-5星)
  ratingCount?: number         // 评分人数
  reviewCount?: number         // 评论数量
  subscriberCount?: number     // 订阅数（如果可获取）
  genre?: string              // 播客分类/类型
  explicit?: boolean          // 是否包含敏感内容
}

/**
 * Apple播客平台爬虫
 */
export class ApplePodcastsScraper extends BasePlatformScraper {
  platform = 'applepodcasts' as const
  supportedDomains = ['podcasts.apple.com']
  
  async extractFromPage(page: Page, url: string, options: Required<ScraperOptions>): Promise<PlatformExtraMetadata> {
    Logger.info('[ApplePodcasts] 开始提取页面数据')
    
    // 等待关键元素加载
    try {
      await page.waitForSelector('h1, [data-testid*="episode"], [class*="episode"]', { timeout: 15000 })
    } catch {
      Logger.warn('[ApplePodcasts] 未找到标题元素，继续尝试其他选择器')
    }

    // 等待页面完全加载
    await this.safeWaitForTimeout(page, 3000)
    
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
      'h1, [data-testid*="episode-title"], [class*="episode-title"]'
    )
    Logger.info(`[ApplePodcasts] 基本信息: title=${title ? 'ok' : 'empty'}`)
    
    const author = await this.safeGetText(page, 
      '[data-testid*="podcast-header"] h1, [class*="podcast-header"] h1, .podcast-title'
    )
    Logger.info(`[ApplePodcasts] 基本信息: author=${author ? 'ok' : 'empty'}`)
    
    const authorAvatar = await this.safeGetAttribute(page, 
      '[data-testid*="artwork"] img, [class*="artwork"] img, .podcast-artwork img',
      'src'
    )
    Logger.info(`[ApplePodcasts] 基本信息: authorAvatar=${authorAvatar ? 'ok' : 'empty'}`)
    
    const description = await this.safeGetText(page, 
      '[data-testid*="episode-description"], [class*="episode-description"], .episode-description'
    )
    Logger.info(`[ApplePodcasts] 基本信息: description=${description ? 'ok' : 'empty'}`)
    
    // 从页面数据中提取时长和发布时间
    const pageData = await page.evaluate(() => {
      // 尝试从JSON-LD结构化数据中提取
      const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      for (const script of scripts) {
        try {
          const data = JSON.parse(script.innerHTML)
          if (data['@type'] === 'PodcastEpisode') {
            return {
              duration: data.timeRequired ? this.parseDuration(data.timeRequired) : 0,
              publishDate: data.datePublished ? new Date(data.datePublished).toLocaleDateString() : ''
            }
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
      
      // 备用方法：从DOM元素获取
      // 提取时长
      let duration = 0
      const durationElement = document.querySelector('[data-testid*="duration"]') ||
                             document.querySelector('[class*="duration"]') ||
                             document.querySelector('.episode-time')
      
      if (durationElement) {
        const durationText = durationElement.textContent?.trim() || ''
        const timeMatch = durationText.match(/(\d+):(\d+)(?::(\d+))?/)
        if (timeMatch && timeMatch[1] && timeMatch[2]) {
          const hours = timeMatch[3] ? parseInt(timeMatch[1], 10) : 0
          const minutes = timeMatch[3] ? parseInt(timeMatch[2], 10) : parseInt(timeMatch[1], 10)
          const seconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : parseInt(timeMatch[2], 10)
          duration = hours * 3600 + minutes * 60 + seconds
        }
      }

      // 提取发布日期
      let publishDate = ''
      const publishElement = document.querySelector('time') ||
                            document.querySelector('[data-testid*="release-date"]') ||
                            document.querySelector('[class*="release-date"]')
      if (publishElement) {
        publishDate = publishElement.getAttribute('datetime') ||
                     publishElement.textContent?.trim() ||
                     ''
        if (publishDate) {
          try {
            publishDate = new Date(publishDate).toLocaleDateString()
          } catch (e) {
            // 如果解析失败，保持原始格式
          }
        }
      }

      return { duration, publishDate }
    })
    
    const basic = {
      title: title || 'Unknown Episode',
      author: author || 'Unknown Podcast',
      authorAvatar: authorAvatar || '',
      duration: pageData.duration || 0,
      publishDate: pageData.publishDate || '',
      description: description || '',
      viewCount: 0 // Apple播客通常不显示播放次数
    }
    
    Logger.info(`[ApplePodcasts] 基本信息汇总: ${JSON.stringify({ 
      t: basic.title ? 1 : 0, 
      a: basic.author ? 1 : 0, 
      d: basic.duration ? 1 : 0, 
      p: basic.publishDate ? 1 : 0 
    })}`)
    return basic
  }
  
  /**
   * 提取平台特定数据
   */
  private async extractPlatformData(page: Page): Promise<ApplePodcastsData> {
    const data = await page.evaluate(() => {
      // 从JSON-LD结构化数据提取
      let structuredData: any = {}
      const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      for (const script of scripts) {
        try {
          const jsonData = JSON.parse(script.innerHTML)
          if (jsonData['@type'] === 'PodcastSeries' || jsonData['@type'] === 'Podcast') {
            structuredData = jsonData
            break
          }
        } catch (e) {
          // 忽略解析错误
        }
      }

      // 提取评分信息
      let rating = 0
      let ratingCount = 0
      
      if (structuredData.aggregateRating) {
        rating = parseFloat(structuredData.aggregateRating.ratingValue) || 0
        ratingCount = parseInt(structuredData.aggregateRating.ratingCount) || 0
      } else {
        // 备用方法：从页面元素获取
        const ratingElement = document.querySelector('[data-testid*="rating"]') ||
                             document.querySelector('[class*="rating"]') ||
                             document.querySelector('.rating-value')
        if (ratingElement) {
          const ratingText = ratingElement.textContent?.trim() || ''
          const ratingMatch = ratingText.match(/(\d+\.?\d*)\s*(?:stars?|\/5)?/i)
          if (ratingMatch && ratingMatch[1]) {
            rating = parseFloat(ratingMatch[1])
          }
        }

        const ratingCountElement = document.querySelector('[data-testid*="rating-count"]') ||
                                  document.querySelector('[class*="rating-count"]')
        if (ratingCountElement) {
          const countText = ratingCountElement.textContent?.trim() || ''
          const countMatch = countText.match(/(\d+(?:,\d+)?)\s*(?:ratings?|reviews?)/i)
          if (countMatch && countMatch[1]) {
            ratingCount = parseInt(countMatch[1].replace(/,/g, ''))
          }
        }
      }

      // 提取评论数量
      let reviewCount = 0
      const reviewElement = document.querySelector('[data-testid*="review-count"]') ||
                           document.querySelector('[class*="review-count"]')
      if (reviewElement) {
        const reviewText = reviewElement.textContent?.trim() || ''
        const reviewMatch = reviewText.match(/(\d+(?:,\d+)?)\s*reviews?/i)
        if (reviewMatch && reviewMatch[1]) {
          reviewCount = parseInt(reviewMatch[1].replace(/,/g, ''))
        }
      }

      // 提取分类信息
      let genre = ''
      if (structuredData.genre) {
        genre = Array.isArray(structuredData.genre) 
          ? structuredData.genre.join(', ') 
          : structuredData.genre
      } else {
        const genreElement = document.querySelector('[data-testid*="genre"]') ||
                           document.querySelector('[class*="genre"]') ||
                           document.querySelector('.category')
        if (genreElement) {
          genre = genreElement.textContent?.trim() || ''
        }
      }

      // 检查是否包含敏感内容
      let explicit = false
      if (structuredData.contentRating && structuredData.contentRating.includes('explicit')) {
        explicit = true
      } else {
        const explicitElement = document.querySelector('[data-testid*="explicit"]') ||
                               document.querySelector('[class*="explicit"]')
        if (explicitElement) {
          explicit = true
        }
      }

      return {
        rating: rating || 0,
        ratingCount: ratingCount || 0,
        reviewCount: reviewCount || 0,
        genre: genre || '',
        explicit: explicit
      }
    })
    
    const pd: ApplePodcastsData = {
      rating: data.rating,
      ratingCount: data.ratingCount,
      reviewCount: data.reviewCount,
      genre: data.genre,
      explicit: data.explicit
    }
    
    Logger.info(`[ApplePodcasts] 平台数据汇总: ${JSON.stringify(pd)}`)
    return pd
  }
  
  /**
   * 提取评论
   */
  private async extractComments(page: Page, options: Required<ScraperOptions>): Promise<Comment[]> {
    
    if (!options.maxTotalComments || options.maxTotalComments === 0) {
      Logger.info('[ApplePodcasts] 跳过评论提取')
      return []
    }

    Logger.info('[ApplePodcasts] 开始提取评论')
    
    try {
      // Apple播客的评论通常需要展开或滚动加载
      // 尝试点击"查看更多评论"按钮
      const showMoreButton = await page.$('[data-testid*="show-more"], [class*="show-more"], .expand-reviews')
      if (showMoreButton) {
        await showMoreButton.click()
        await this.safeWaitForTimeout(page, 2000)
      }

      const comments = await page.evaluate((maxComments) => {
        const commentElements = Array.from(document.querySelectorAll([
          '[data-testid*="review"]',
          '[class*="review"]',
          '.review-item',
          '.customer-review'
        ].join(', ')))

        return commentElements.slice(0, maxComments).map(el => {
          const authorElement = el.querySelector('[data-testid*="author"], [class*="author"], .reviewer-name')
          const contentElement = el.querySelector('[data-testid*="content"], [class*="content"], .review-body, .review-text')
          
          return {
            author: authorElement?.textContent?.trim() || 'Anonymous',
            content: contentElement?.textContent?.trim() || ''
          }
        }).filter(comment => comment.content.length > 0)
      }, options.maxTotalComments)

      Logger.info(`[ApplePodcasts] 提取到 ${comments.length} 条评论`)
      return comments
      
    } catch (error: any) {
      Logger.warn(`[ApplePodcasts] 评论提取失败: ${error.message}`)
      return []
    }
  }
}
