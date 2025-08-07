import type { Page } from 'puppeteer'
import { BasePlatformScraper } from './base'
import type { ScraperOptions } from '../types'
import type { PlatformExtraMetadata, YouTubeData, Comment } from '~/types/task'
import { Logger } from '~/lib/utils/logger'

/**
 * YouTube平台爬虫
 */
export class YouTubeScraper extends BasePlatformScraper {
  platform = 'youtube' as const
  supportedDomains = ['youtube.com', 'www.youtube.com', 'youtu.be', 'm.youtube.com']
  
  async extractFromPage(page: Page, url: string, options: Required<ScraperOptions>): Promise<PlatformExtraMetadata> {
    Logger.info('[YouTube] 开始提取页面数据')
    
    // 等待关键元素加载
    try {
      await page.waitForSelector('h1.ytd-video-primary-info-renderer', { timeout: 10000 })
    } catch {
      Logger.warn('[YouTube] 未找到标题元素，继续尝试其他选择器')
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
    const title = await this.safeGetText(page, 'h1.ytd-video-primary-info-renderer, h1.style-scope.ytd-video-primary-info-renderer')
    
    const author = await this.safeGetText(page, 
      '#owner-text a, #channel-name a, .ytd-channel-name a'
    )
    
    const authorAvatar = await this.safeGetAttribute(page, 
      '#avatar img, .ytd-video-owner-renderer img',
      'src'
    )
    
    const description = await this.safeGetText(page, 
      '#description-text, .ytd-video-secondary-info-renderer #description'
    )
    
    // 从页面数据中提取时长和发布时间
    const pageData = await page.evaluate(() => {
      // 尝试从页面脚本中提取数据
      const scripts = Array.from(document.querySelectorAll('script'))
      for (const script of scripts) {
        const content = script.innerHTML
        if (content.includes('var ytInitialData')) {
          try {
            const match = content.match(/var ytInitialData\s*=\s*({.+?});/)
            if (match) {
              const data = JSON.parse(match[1]!)
              const videoDetails = data?.contents?.twoColumnWatchNextResults?.results?.results?.contents?.[0]?.videoPrimaryInfoRenderer
              const videoSecondaryInfo = data?.contents?.twoColumnWatchNextResults?.results?.results?.contents?.[1]?.videoSecondaryInfoRenderer
              
              return {
                duration: videoDetails?.lengthText?.simpleText || '',
                publishDate: videoDetails?.dateText?.simpleText || videoSecondaryInfo?.dateText?.simpleText || ''
              }
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
      
      // 备用方法：从DOM元素获取
      const durationEl = document.querySelector('.ytp-time-duration')
      const publishEl = document.querySelector('#info-strings yt-formatted-string, .ytd-video-primary-info-renderer #info-strings yt-formatted-string')
      
      return {
        duration: durationEl?.textContent?.trim() || '',
        publishDate: publishEl?.textContent?.trim() || ''
      }
    })
    
    const duration = this.parseDuration(pageData.duration)
    
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
  private async extractPlatformData(page: Page): Promise<YouTubeData> {
    const data = await page.evaluate(() => {
      // 尝试从页面脚本中提取数据
      const scripts = Array.from(document.querySelectorAll('script'))
      for (const script of scripts) {
        const content = script.innerHTML
        if (content.includes('var ytInitialData')) {
          try {
            const match = content.match(/var ytInitialData\s*=\s*({.+?});/)
            if (match) {
              const data = JSON.parse(match[1]!)
              const videoDetails = data?.contents?.twoColumnWatchNextResults?.results?.results?.contents?.[0]?.videoPrimaryInfoRenderer
              
              const viewCountText = videoDetails?.viewCount?.videoViewCountRenderer?.viewCount?.simpleText || ''
              const likeButtonRenderer = videoDetails?.videoActions?.menuRenderer?.topLevelButtons?.find(
                (button: any) => button.toggleButtonRenderer?.defaultIcon?.iconType === 'LIKE'
              )
              const likeCountText = likeButtonRenderer?.toggleButtonRenderer?.defaultText?.accessibility?.accessibilityData?.label || ''
              
              return {
                viewCountText,
                likeCountText
              }
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
      
      // 备用方法：从DOM元素获取（更新选择器匹配新版YouTube）
      const viewCountSelectors = [
        'yt-formatted-string#info span:first-child',  // 您提供的结构：包含"次观看"或"views"
        'yt-formatted-string#info',  // 整个info元素
        '#info .view-count', 
        '.ytd-video-view-count-renderer'
      ]
      
      let viewCountText = ''
      
      // 先尝试特定选择器
      for (const selector of viewCountSelectors) {
        const el = document.querySelector(selector)
        if (el && el.textContent?.trim()) {
          viewCountText = el.textContent.trim()
          // 如果包含"次观看"或"views"，说明找到了正确的元素
          if (viewCountText.includes('次观看') || viewCountText.includes('views')) {
            break
          }
        }
      }
      
      // 如果上面的选择器没找到，搜索所有包含views的元素
      if (!viewCountText || (!viewCountText.includes('次观看') && !viewCountText.includes('views'))) {
        const allElements = Array.from(document.querySelectorAll('*'))
        const viewElement = allElements.find(el => {
          const text = el.textContent?.trim() || ''
          return (text.includes('次观看') || text.includes('views')) && /\d+/.test(text) && text.length < 50
        })
        if (viewElement) {
          viewCountText = viewElement.textContent?.trim() || ''
        }
      }
      
      // 更新点赞数选择器，基于用户提供的HTML结构
      const likeSelectors = [
        'like-button-view-model .yt-spec-button-shape-next__button-text-content', // 直接获取数字
        'like-button-view-model button[aria-label*="赞"]', // 中文页面
        'like-button-view-model button[aria-label*="like"]', // 英文页面
        '#top-level-buttons-computed button[aria-label*="like"]', // 旧版选择器
        '.ytd-toggle-button-renderer button[aria-label*="like"]' // 备用选择器
      ]
      
      let likeCountText = ''
      
      // 先尝试直接获取数字文本
      const likeNumberEl = document.querySelector('like-button-view-model .yt-spec-button-shape-next__button-text-content')
      if (likeNumberEl && likeNumberEl.textContent?.trim()) {
        likeCountText = likeNumberEl.textContent.trim()
      }
      
      // 如果没有找到数字，尝试从aria-label获取
      if (!likeCountText) {
        for (const selector of likeSelectors.slice(1)) { // 跳过第一个，因为已经尝试过了
          const el = document.querySelector(selector)
          if (el) {
            const ariaLabel = el.getAttribute('aria-label') || ''
            if (ariaLabel && (ariaLabel.includes('赞') || ariaLabel.includes('like'))) {
              likeCountText = ariaLabel
              break
            }
          }
        }
      }
      
      return {
        viewCountText,
        likeCountText
      }
    })
    
    const viewCount = this.parseCount(data.viewCountText)
    const likeCount = this.parseCount(data.likeCountText)
    
    return {
      viewCount,
      likeCount
    }
  }
  
  /**
   * 提取评论
   */
  private async extractComments(page: Page, options: Required<ScraperOptions>): Promise<Comment[]> {
    try {
      Logger.info('[YouTube] 开始提取评论')
      
      // 先滚动到页面中间，然后再滚动到评论区域
      await page.evaluate(() => {
        // 滚动到页面中间，触发更多内容加载
        window.scrollTo(0, document.body.scrollHeight * 0.5)
      })
      
      await this.safeWaitForTimeout(page, 2000)
      
      // 滚动到评论区域
      await page.evaluate(() => {
        const commentsSection = document.querySelector('#comments, ytd-comments-header-renderer, #comments-button')
        if (commentsSection) {
          commentsSection.scrollIntoView({ behavior: 'smooth' })
        } else {
          // 如果找不到评论区域，滚动到页面底部
          window.scrollTo(0, document.body.scrollHeight)
        }
      })
      
      // 等待评论区域加载
      Logger.info('[YouTube] 等待评论区域加载...')
      await this.safeWaitForTimeout(page, 5000)
      
      // 尝试多种选择器等待评论元素出现
      const commentSelectors = [
        'ytd-comment-thread-renderer',
        'ytd-comment-renderer', 
        '#comments ytd-comment-thread-renderer',
        '#comments-button'
      ]
      
      let foundComments = false
      for (const selector of commentSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 })
          foundComments = true
          Logger.info(`[YouTube] 找到评论元素: ${selector}`)
          break
        } catch {
          continue
        }
      }
      
      if (!foundComments) {
        Logger.warn('[YouTube] 未找到评论元素，可能需要更多时间加载或没有评论')
        
        // 最后尝试：再次滚动并等待
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight)
        })
        await this.safeWaitForTimeout(page, 3000)
        
        // 检查页面是否有评论相关的文本
        const hasCommentsText = await page.evaluate(() => {
          const text = document.body.textContent || ''
          return text.includes('评论') || text.includes('Comments') || text.includes('comment')
        })
        
        if (!hasCommentsText) {
          Logger.info('[YouTube] 页面中未发现评论相关内容')
          return []
        }
      }
      
      // 提取评论数据
      const comments = await page.evaluate((limits) => {
        const commentElements = document.querySelectorAll('ytd-comment-thread-renderer')
        const extractedComments: any[] = []
        let totalComments = 0
        
        for (let i = 0; i < Math.min(commentElements.length, limits.maxTopLevel); i++) {
          const commentEl = commentElements[i]
          if (!commentEl) continue
          
          // 提取主评论
          const authorEl = commentEl.querySelector('#author-text span')
          const contentEl = commentEl.querySelector('#content-text')
          
          if (!authorEl || !contentEl) continue
          
          const mainComment = {
            author: authorEl.textContent?.trim() || '',
            content: contentEl.textContent?.trim() || '',
            replies: [] as any[]
          }
          
          totalComments++
          
          // 提取回复（如果有）
          const replyElements = commentEl.querySelectorAll('ytd-comment-replies-renderer ytd-comment-renderer')
          for (const replyEl of Array.from(replyElements)) {
            if (totalComments >= limits.maxTotal) break
            
            const replyAuthorEl = replyEl.querySelector('#author-text span')
            const replyContentEl = replyEl.querySelector('#content-text')
            
            if (replyAuthorEl && replyContentEl) {
              mainComment.replies.push({
                author: replyAuthorEl.textContent?.trim() || '',
                content: replyContentEl.textContent?.trim() || ''
              })
              totalComments++
            }
          }
          
          extractedComments.push(mainComment)
          
          if (totalComments >= limits.maxTotal) break
        }
        
        return extractedComments
      }, { maxTopLevel: options.maxTopLevelComments, maxTotal: options.maxTotalComments })
      
      Logger.info(`[YouTube] 提取到 ${comments.length} 条评论`)
      return comments
      
    } catch (error: any) {
      Logger.warn(`[YouTube] 评论提取失败: ${error.message}`)
      return []
    }
  }
}