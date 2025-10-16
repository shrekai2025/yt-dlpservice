import type { Page } from 'puppeteer'
import { BasePlatformScraper } from './base'
import type { ScraperOptions } from '../types'
import type { PlatformExtraMetadata, TwitterData, Comment } from '~/types/task'
import { Logger } from '~/lib/utils/logger'

/**
 * Twitter/X平台爬虫
 * 注意: Twitter的反爬虫机制较强，可能需要登录才能获取完整数据
 */
export class TwitterScraper extends BasePlatformScraper {
  platform = 'twitter' as const
  supportedDomains = ['twitter.com', 'x.com']

  async extractFromPage(page: Page, url: string, options: Required<ScraperOptions>): Promise<PlatformExtraMetadata> {
    try {
      Logger.info(`[${this.platform}] 开始提取元数据`)

      // 等待推文内容加载
      await page.waitForSelector('article[data-testid="tweet"]', {
        timeout: options.waitTime
      }).catch(() => {
        Logger.warn(`[${this.platform}] 推文内容未加载，可能需要登录`)
      })

      // 等待一段时间让动态内容加载
      await new Promise(resolve => setTimeout(resolve, 3000))

      const metadata = await page.evaluate(() => {
        const result: any = {
          title: '',
          author: '',
          authorAvatar: '',
          duration: 0,
          description: '',
          platformData: {
            viewCount: 0,
            likeCount: 0,
            retweetCount: 0,
            replyCount: 0,
            quoteCount: 0
          }
        }

        // 获取推文容器
        const tweetArticle = document.querySelector('article[data-testid="tweet"]')
        if (!tweetArticle) return null

        // 获取作者信息
        const authorLink = tweetArticle.querySelector('a[role="link"][href^="/"]')
        if (authorLink) {
          const href = authorLink.getAttribute('href')
          if (href) {
            result.author = href.replace('/', '').split('/')[0] || 'Unknown'
          }
        }

        // 获取作者头像
        const avatar = tweetArticle.querySelector('img[alt][src*="profile"]')
        if (avatar) {
          result.authorAvatar = avatar.getAttribute('src') || ''
        }

        // 获取推文文本内容作为标题和描述
        const tweetText = tweetArticle.querySelector('[data-testid="tweetText"]')
        if (tweetText) {
          const text = tweetText.textContent || ''
          result.title = text.substring(0, 100) + (text.length > 100 ? '...' : '')
          result.description = text
        }

        // 提取互动数据 (回复、转发、点赞等)
        const interactionButtons = tweetArticle.querySelectorAll('[role="group"] [role="button"]')
        interactionButtons.forEach((button, index) => {
          const ariaLabel = button.getAttribute('aria-label') || ''
          const match = ariaLabel.match(/(\d+[\d,]*)/)
          const count = match && match[1] ? parseInt(match[1].replace(/,/g, ''), 10) : 0

          // 根据顺序判断类型: 回复、转发、点赞、查看数
          if (ariaLabel.includes('repl') || ariaLabel.includes('回复')) {
            result.platformData.replyCount = count
          } else if (ariaLabel.includes('repost') || ariaLabel.includes('retweet') || ariaLabel.includes('转发')) {
            result.platformData.retweetCount = count
          } else if (ariaLabel.includes('like') || ariaLabel.includes('点赞')) {
            result.platformData.likeCount = count
          } else if (ariaLabel.includes('view') || ariaLabel.includes('查看')) {
            result.platformData.viewCount = count
          } else if (ariaLabel.includes('bookmark') || ariaLabel.includes('书签')) {
            result.platformData.bookmarkCount = count
          }
        })

        // 尝试从其他位置获取观看数
        const viewCountElement = tweetArticle.querySelector('a[href*="/analytics"] span')
        if (viewCountElement && !result.platformData.viewCount) {
          const viewText = viewCountElement.textContent || ''
          const viewMatch = viewText.match(/(\d+[\d,KMB]*)/i)
          if (viewMatch && viewMatch[1]) {
            const viewCount = viewMatch[1]
            // 处理K、M、B后缀
            if (viewCount.includes('K')) {
              result.platformData.viewCount = Math.floor(parseFloat(viewCount) * 1000)
            } else if (viewCount.includes('M')) {
              result.platformData.viewCount = Math.floor(parseFloat(viewCount) * 1000000)
            } else if (viewCount.includes('B')) {
              result.platformData.viewCount = Math.floor(parseFloat(viewCount) * 1000000000)
            } else {
              result.platformData.viewCount = parseInt(viewCount.replace(/,/g, ''), 10)
            }
          }
        }

        return result
      })

      if (!metadata) {
        Logger.warn(`[${this.platform}] 无法提取元数据，返回默认值`)
        return {
          title: 'Twitter Post',
          author: 'Unknown',
          duration: 0,
          platformData: {
            viewCount: 0,
            likeCount: 0,
            retweetCount: 0,
            replyCount: 0
          }
        }
      }

      // 提取评论
      const comments = await this.extractComments(page, options)
      metadata.comments = comments

      Logger.info(
        `[${this.platform}] 元数据提取成功: @${metadata.author}, ` +
        `互动: ${metadata.platformData.likeCount}赞 ${metadata.platformData.retweetCount}转 ${metadata.platformData.replyCount}回复, ` +
        `评论: ${comments.length}条`
      )

      return metadata

    } catch (error) {
      Logger.error(`[${this.platform}] 元数据提取失败: ${error}`)
      // 返回默认值而不是null
      return {
        title: 'Twitter Post',
        author: 'Unknown',
        duration: 0,
        platformData: {
          viewCount: 0,
          likeCount: 0,
          retweetCount: 0,
          replyCount: 0
        }
      }
    }
  }

  private async extractComments(page: Page, options: Required<ScraperOptions>): Promise<Comment[]> {
    try {
      Logger.info(`[${this.platform}] 开始提取评论`)

      const maxTopLevel = options.maxTopLevelComments
      const maxTotal = options.maxTotalComments

      // Twitter的评论在同一页面滚动加载
      // 滚动几次以加载更多评论
      for (let i = 0; i < 3; i++) {
        await page.evaluate(() => window.scrollBy(0, 1000))
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      const comments = await page.evaluate((limits) => {
        const result: any[] = []
        let totalCount = 0

        // 获取所有评论文章
        const commentArticles = document.querySelectorAll('article[data-testid="tweet"]')

        // 跳过第一个(原始推文)
        for (let i = 1; i < commentArticles.length && totalCount < limits.maxTotal; i++) {
          const article = commentArticles[i]
          if (!article) continue

          // 获取评论者
          const authorLink = article.querySelector('a[role="link"][href^="/"]')
          let author = 'Unknown'
          if (authorLink) {
            const href = authorLink.getAttribute('href') || ''
            author = href.replace('/', '').split('/')[0] || 'Unknown'
          }

          // 获取评论内容
          const textElement = article.querySelector('[data-testid="tweetText"]')
          const content = textElement?.textContent || ''

          if (content && result.length < limits.maxTopLevel) {
            result.push({
              author,
              content,
              replies: [] // Twitter评论结构较复杂，简化处理
            })
            totalCount++
          }
        }

        return result
      }, { maxTopLevel, maxTotal })

      Logger.info(`[${this.platform}] 成功提取 ${comments.length} 条评论`)
      return comments

    } catch (error) {
      Logger.error(`[${this.platform}] 评论提取失败: ${error}`)
      return []
    }
  }
}
