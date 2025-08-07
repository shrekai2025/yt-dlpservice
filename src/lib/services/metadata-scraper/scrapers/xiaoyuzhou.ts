import type { Page } from 'puppeteer'
import { BasePlatformScraper } from './base'
import type { ScraperOptions } from '../types'
import type { PlatformExtraMetadata, XiaoyuzhouData, Comment } from '~/types/task'
import { Logger } from '~/lib/utils/logger'

/**
 * 小宇宙平台爬虫
 */
export class XiaoyuzhouScraper extends BasePlatformScraper {
  platform = 'xiaoyuzhou' as const
  supportedDomains = ['xiaoyuzhoufm.com', 'www.xiaoyuzhoufm.com']
  
  async extractFromPage(page: Page, url: string, options: Required<ScraperOptions>): Promise<PlatformExtraMetadata> {
    Logger.info('[Xiaoyuzhou] 开始提取页面数据')
    
    // 等待关键元素加载
    try {
      await page.waitForSelector('h1, .episode-title', { timeout: 10000 })
    } catch {
      Logger.warn('[Xiaoyuzhou] 未找到标题元素，继续尝试其他选择器')
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
      'h1, .episode-title, [class*="title"]'
    )
    
    const author = await this.safeGetText(page, 
      '.podcast-title, [class*="podcast-name"], .show-title'
    )
    
    const authorAvatar = await this.safeGetAttribute(page, 
      '.podcast-cover img, [class*="cover"] img, .show-cover img',
      'src'
    )
    
    const description = await this.safeGetText(page, 
      '.description, [class*="description"], .episode-description'
    )
    
    // 从页面数据中提取时长和发布时间
    const pageData = await page.evaluate(() => {
      // 尝试从页面脚本中提取数据
      const scripts = Array.from(document.querySelectorAll('script'))
      for (const script of scripts) {
        const content = script.innerHTML
        if (content.includes('window.__INITIAL_STATE__') || content.includes('window.__DATA__')) {
          try {
            let match = content.match(/window\.__INITIAL_STATE__\s*=\s*({.+?});/) ||
                       content.match(/window\.__DATA__\s*=\s*({.+?});/)
            if (match) {
              const data = JSON.parse(match[1])
              const episode = data?.episode || data?.episodeDetail
              
              return {
                duration: episode?.duration || 0,
                publishDate: episode?.pubDate ? new Date(episode.pubDate).toLocaleDateString() : ''
              }
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
      
      // 备用方法：从DOM元素获取
      // 基于用户提供的HTML结构：<div class="jsx-399326063 info">92分钟<span>...</span></div>
      let durationText = ''
      
      // 尝试多种选择器提取时长
      const durationSelectors = [
        '.info', // 用户提供的结构
        '.duration', 
        '[class*="duration"]',
        '[class*="info"]'
      ]
      
      for (const selector of durationSelectors) {
        const el = document.querySelector(selector)
        if (el && el.textContent) {
          const text = el.textContent.trim()
          // 查找包含"分钟"、"小时"、":"等时长标识的文本
          if (text.includes('分钟') || text.includes('小时') || text.includes(':') || /\d+分/.test(text)) {
            durationText = text
            break
          }
        }
      }
      
      // 如果还没找到，尝试查找所有包含时长格式的元素
      if (!durationText) {
        const allElements = Array.from(document.querySelectorAll('*'))
        const durationElement = allElements.find(el => {
          const text = el.textContent?.trim() || ''
          return (text.includes('分钟') || text.includes('小时') || /^\d+:\d+/.test(text) || /\d+分/.test(text)) && 
                 text.length < 50 && // 避免选到长文本
                 !text.includes('评论') && !text.includes('播放') // 排除其他内容
        })
        if (durationElement) {
          durationText = durationElement.textContent?.trim() || ''
        }
      }
      
      const publishEl = document.querySelector('time, .publish-date, [class*="date"]')
      
      return {
        duration: durationText,
        publishDate: publishEl?.getAttribute('datetime') || publishEl?.textContent?.trim() || ''
      }
    })
    
    const duration = typeof pageData.duration === 'number' ? pageData.duration : this.parseDuration(pageData.duration)
    
    return {
      title: title || 'Unknown Title',
      author: author || 'Unknown Author',
      authorAvatar: authorAvatar || undefined,
      duration,
      publishDate: pageData.publishDate || undefined,
      description: description || undefined
    }
  }
  
  /**
   * 提取平台特定数据
   */
  private async extractPlatformData(page: Page): Promise<XiaoyuzhouData> {
    const data = await page.evaluate(() => {
      // 尝试从页面脚本中提取数据
      const scripts = Array.from(document.querySelectorAll('script'))
      for (const script of scripts) {
        const content = script.innerHTML
        if (content.includes('window.__INITIAL_STATE__') || content.includes('window.__DATA__')) {
          try {
            let match = content.match(/window\.__INITIAL_STATE__\s*=\s*({.+?});/) ||
                       content.match(/window\.__DATA__\s*=\s*({.+?});/)
            if (match) {
              const data = JSON.parse(match[1])
              const episode = data?.episode || data?.episodeDetail
              const stats = episode?.stat || {}
              
              return {
                playCount: stats.playCount || stats.play || 0,
                commentCount: stats.commentCount || stats.comment || 0
              }
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
      
      // 备用方法：从DOM元素获取
      const playEl = document.querySelector('.play-count, [class*="play"], .stats .play')
      const commentEl = document.querySelector('.comment-count, [class*="comment"], .stats .comment')
      
      return {
        playCount: playEl?.textContent?.trim() || '0',
        commentCount: commentEl?.textContent?.trim() || '0'
      }
    })
    
    return {
      playCount: typeof data.playCount === 'number' ? data.playCount : this.parseCount(data.playCount),
      commentCount: typeof data.commentCount === 'number' ? data.commentCount : this.parseCount(data.commentCount)
    }
  }
  
  /**
   * 提取评论
   */
  private async extractComments(page: Page, options: Required<ScraperOptions>): Promise<Comment[]> {
    try {
      Logger.info('[Xiaoyuzhou] 开始提取评论')
      
      // 滚动到评论区域
      await page.evaluate(() => {
        const commentsSection = document.querySelector('.comments, .comment-list, [class*="comment"]')
        if (commentsSection) {
          commentsSection.scrollIntoView({ behavior: 'smooth' })
        }
      })
      
      // 等待评论加载
      await this.safeWaitForTimeout(page, 3000)
      
      // 等待评论元素出现
      try {
        await page.waitForSelector('.comment-item, .comment, [class*="comment-item"]', { timeout: 10000 })
      } catch {
        Logger.warn('[Xiaoyuzhou] 评论区域未加载，可能没有评论')
        return []
      }
      
      // 提取评论数据
      const comments = await page.evaluate((limits) => {
        const commentElements = document.querySelectorAll('.comment-item, .comment, [class*="comment-item"]')
        const extractedComments: any[] = []
        let totalComments = 0
        
        for (let i = 0; i < Math.min(commentElements.length, limits.maxTopLevel); i++) {
          const commentEl = commentElements[i]
          if (!commentEl) continue
          
          // 提取主评论
          const authorEl = commentEl.querySelector('.author, .user-name, [class*="author"], [class*="name"]')
          const contentEl = commentEl.querySelector('.content, .text, [class*="content"], [class*="text"]')
          
          if (!authorEl || !contentEl) continue
          
          const mainComment = {
            author: authorEl.textContent?.trim() || '',
            content: contentEl.textContent?.trim() || '',
            replies: [] as any[]
          }
          
          totalComments++
          
          // 提取回复（如果有）
          const replyContainer = commentEl.querySelector('.replies, .sub-comments, [class*="replies"]')
          if (replyContainer) {
            const replyElements = replyContainer.querySelectorAll('.reply, .sub-comment, [class*="reply"]')
            for (const replyEl of Array.from(replyElements)) {
              if (totalComments >= limits.maxTotal) break
              
              const replyAuthorEl = replyEl.querySelector('.author, .user-name, [class*="author"], [class*="name"]')
              const replyContentEl = replyEl.querySelector('.content, .text, [class*="content"], [class*="text"]')
              
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
      
      Logger.info(`[Xiaoyuzhou] 提取到 ${comments.length} 条评论`)
      return comments
      
    } catch (error: any) {
      Logger.warn(`[Xiaoyuzhou] 评论提取失败: ${error.message}`)
      return []
    }
  }
}