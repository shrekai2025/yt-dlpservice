import { Logger } from '~/lib/utils/logger'
import type { PlatformExtractor, ParsedContent } from '~/lib/downloaders/types'
import type { ApplePodcastsMetadata } from './types'
import type { Page } from 'puppeteer'

/**
 * Apple播客内容解析器
 */
export class ApplePodcastsExtractor implements PlatformExtractor {
  /**
   * 从Apple播客页面提取音频URL和元数据
   */
  async extractFromPage(page: Page, url: string): Promise<ParsedContent> {
    try {
      Logger.info('[ApplePodcasts] 开始解析页面内容')
      
      // 等待页面关键元素加载
      await page.waitForSelector('h1, [data-testid*="episode"], [class*="episode"]', { 
        timeout: 15000 
      }).catch(() => {
        Logger.warn('[ApplePodcasts] 未找到标题元素，尝试其他方法')
      })

      // 等待额外时间让JavaScript完全加载
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // 提取页面数据
      const pageData = await page.evaluate(() => {
        // 提取音频URL
        let audioUrl: string | null = null
        
        // 方法1: 从 audio 元素获取
        const audioElement = document.querySelector('audio') as HTMLAudioElement
        if (audioElement && audioElement.src) {
          audioUrl = audioElement.src
        }
        
        // 方法2: 从 source 元素获取
        if (!audioUrl) {
          const sourceElement = document.querySelector('source[type*="audio"]') as HTMLSourceElement
          if (sourceElement && sourceElement.src) {
            audioUrl = sourceElement.src
          }
        }

        // 方法3: 从JSON-LD结构化数据获取
        if (!audioUrl) {
          const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
          for (const script of scripts) {
            try {
              const data = JSON.parse(script.innerHTML)
              if (data['@type'] === 'PodcastEpisode' && data.associatedMedia?.contentUrl) {
                audioUrl = data.associatedMedia.contentUrl
                break
              }
              if (data.audio?.contentUrl) {
                audioUrl = data.audio.contentUrl
                break
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }

        // 方法4: 从页面JavaScript变量获取
        if (!audioUrl) {
          const scripts = Array.from(document.querySelectorAll('script'))
          for (const script of scripts) {
            const content = script.innerHTML
            // 查找音频URL模式
            const audioMatch = content.match(/"url"\s*:\s*"([^"]+\.m4a[^"]*)"/i) ||
                             content.match(/"url"\s*:\s*"([^"]+\.mp3[^"]*)"/i) ||
                             content.match(/"audioUrl"\s*:\s*"([^"]+)"/i) ||
                             content.match(/"enclosureUrl"\s*:\s*"([^"]+)"/i) ||
                             content.match(/https?:\/\/[^"'\s]+\.(?:m4a|mp3|aac|wav)[^"'\s]*/gi)

            if (audioMatch && audioMatch[1]) {
              audioUrl = audioMatch[1]
              break
            } else if (audioMatch && audioMatch[0]) {
              audioUrl = audioMatch[0]
              break
            }
          }
        }
        
        // 提取基本元数据
        const title = document.querySelector('h1')?.textContent?.trim() || 
                     document.querySelector('[data-testid*="episode-title"]')?.textContent?.trim() ||
                     document.querySelector('[class*="episode-title"]')?.textContent?.trim() ||
                     document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
                     document.title.replace(' - Apple Podcasts', '')

        const description = document.querySelector('[data-testid*="episode-description"]')?.textContent?.trim() ||
                           document.querySelector('[class*="episode-description"]')?.textContent?.trim() ||
                           document.querySelector('meta[name="description"]')?.getAttribute('content') ||
                           document.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
                           ''

        // 提取播客名称
        const showTitle = document.querySelector('[data-testid*="podcast-header"] h1')?.textContent?.trim() ||
                         document.querySelector('[class*="podcast-header"] h1')?.textContent?.trim() ||
                         document.querySelector('meta[property="og:site_name"]')?.getAttribute('content') ||
                         ''

        // 提取时长
        let duration: number | null = null
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

        // 提取封面图
        const coverUrl = document.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
                        document.querySelector('[data-testid*="artwork"] img')?.getAttribute('src') ||
                        document.querySelector('[class*="artwork"] img')?.getAttribute('src') ||
                        document.querySelector('.podcast-artwork img')?.getAttribute('src') ||
                        ''

        // 提取发布日期
        const publishElement = document.querySelector('time') ||
                              document.querySelector('[data-testid*="release-date"]') ||
                              document.querySelector('[class*="release-date"]')
        const publishDate = publishElement?.getAttribute('datetime') ||
                           publishElement?.textContent?.trim() ||
                           ''

        // 从URL提取ID信息
        const urlMatch = window.location.href.match(/id(\d+).*?[?&]i=(\d+)/)
        const podcastId = urlMatch ? urlMatch[1] : ''
        const episodeId = urlMatch ? urlMatch[2] : ''

        // 提取地区信息
        const regionMatch = window.location.pathname.match(/^\/([a-z]{2})\//)
        const region = regionMatch ? regionMatch[1] : ''

        // 提取语言信息
        const urlParams = new URLSearchParams(window.location.search)
        const language = urlParams.get('l') || ''

        // 尝试从结构化数据提取更多信息
        let episodeNumber: number | null = null
        let seasonNumber: number | null = null
        let audioFormat: string | null = null

        const jsonLdScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
        for (const script of jsonLdScripts) {
          try {
            const data = JSON.parse(script.innerHTML)
            if (data['@type'] === 'PodcastEpisode') {
              episodeNumber = data.episodeNumber || null
              seasonNumber = data.partOfSeason?.seasonNumber || null
              if (data.associatedMedia?.encodingFormat) {
                audioFormat = data.associatedMedia.encodingFormat
              }
            }
          } catch (e) {
            // 忽略解析错误
          }
        }

        // 从音频URL推断格式
        if (!audioFormat && audioUrl) {
          if (audioUrl.includes('.m4a') || audioUrl.includes('m4a')) {
            audioFormat = 'm4a'
          } else if (audioUrl.includes('.mp3') || audioUrl.includes('mp3')) {
            audioFormat = 'mp3'
          }
        }

        return {
          audioUrl,
          title,
          description,
          showTitle,
          duration,
          coverUrl,
          publishDate,
          episodeId,
          podcastId,
          region,
          language,
          episodeNumber,
          seasonNumber,
          audioFormat
        }
      })

      // 如果没有找到音频URL，尝试RSS feed方式
      Logger.info(`[ApplePodcasts] 检查音频URL状态: ${pageData.audioUrl ? '已找到' : '未找到'}`)
      if (!pageData.audioUrl) {
        Logger.warn('[ApplePodcasts] 直接方法未找到音频URL，尝试RSS feed方式')
        const rssAudioUrl = await this.tryRSSFeedMethod(page, url)
        if (rssAudioUrl) {
          pageData.audioUrl = rssAudioUrl
          Logger.info('[ApplePodcasts] 通过RSS feed找到音频URL')
        } else {
          Logger.warn('[ApplePodcasts] RSS feed方式也未找到音频URL')
        }
      }

      // 验证必要数据
      if (!pageData.audioUrl) {
        throw new Error('未能找到音频URL - Apple播客可能需要Apple ID登录，或该内容为地区限制/付费内容，或播客暂时不可用')
      }

      if (!pageData.title) {
        throw new Error('未能找到单集标题')
      }

      // 处理相对URL
      const audioUrl = this.normalizeUrl(pageData.audioUrl, url)
      const coverUrl = pageData.coverUrl ? this.normalizeUrl(pageData.coverUrl, url) : undefined

      // 构建元数据
      const metadata: ApplePodcastsMetadata = {
        platform: 'applepodcasts',
        title: pageData.title,
        description: pageData.description || undefined,
        duration: pageData.duration || undefined,
        coverUrl: coverUrl,
        showTitle: pageData.showTitle || undefined,
        episodeId: pageData.episodeId || undefined,
        podcastId: pageData.podcastId || undefined,
        publishDate: pageData.publishDate || undefined,
        region: pageData.region || undefined,
        language: pageData.language || undefined,
        episodeNumber: pageData.episodeNumber || undefined,
        seasonNumber: pageData.seasonNumber || undefined,
        audioFormat: pageData.audioFormat || undefined
      }

      Logger.info(`[ApplePodcasts] 解析成功: ${metadata.title}`)
      Logger.debug('[ApplePodcasts] 音频URL:', audioUrl)
      Logger.debug('[ApplePodcasts] 地区:', metadata.region)
      Logger.debug('[ApplePodcasts] 音频格式:', metadata.audioFormat)

      return {
        audioUrls: [audioUrl],
        metadata
      }
    } catch (error: any) {
      Logger.error(`[ApplePodcasts] 解析失败: ${error.message}`)

      // 保存失败页面内容用于调试
      try {
        const pageContent = await page.content()
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const debugFileName = `applepodcasts-parse-error-${timestamp}.html`
        const debugFilePath = `./logs/${debugFileName}`

        const fs = require('fs').promises
        const path = require('path')
        await fs.mkdir(path.dirname(debugFilePath), { recursive: true })
        await fs.writeFile(debugFilePath, pageContent, 'utf-8')

        Logger.error(`[ApplePodcasts] 页面内容已保存到: ${debugFilePath}`)
        Logger.error(`[ApplePodcasts] 页面URL: ${url}`)
        Logger.error(`[ApplePodcasts] 页面标题: ${await page.title().catch(() => 'N/A')}`)
      } catch (saveError) {
        Logger.warn(`[ApplePodcasts] 保存调试信息失败: ${saveError}`)
      }

      // 根据错误类型提供更具体的错误信息
      let errorMessage = error.message
      if (errorMessage.includes('未能找到音频URL')) {
        errorMessage += ' - 可能原因：需要Apple ID登录、地区限制、付费内容或播客不可用'
      }

      throw new Error(`解析Apple播客页面失败: ${errorMessage}`)
    }
  }

  /**
   * 尝试通过RSS feed获取音频URL
   */
  private async tryRSSFeedMethod(page: Page, url: string): Promise<string | null> {
    try {
      // 从URL中提取播客ID和单集ID
      const urlObj = new URL(url)
      const podcastIdMatch = urlObj.pathname.match(/id(\d+)/)
      const episodeId = urlObj.searchParams.get('i')
      
      if (!podcastIdMatch || !episodeId) {
        Logger.warn('[ApplePodcasts] 无法从URL提取ID信息用于RSS查找')
        return null
      }

      const podcastId = podcastIdMatch[1]
      Logger.info(`[ApplePodcasts] 尝试查找播客ID ${podcastId} 的RSS feed`)

      // 方法0: 尝试通过OEmbed API获取音频信息
      try {
        const oembedUrl = `https://podcasts.apple.com/api/oembed?url=${encodeURIComponent(url)}`
        const oembedResponse = await fetch(oembedUrl)
        
        if (oembedResponse.ok) {
          const oembedData = await oembedResponse.json()
          if (oembedData.audio_url) {
            Logger.info(`[ApplePodcasts] 通过OEmbed API找到音频URL: ${oembedData.audio_url}`)
            return oembedData.audio_url
          }
        }
      } catch (e) {
        Logger.warn(`[ApplePodcasts] OEmbed API失败: ${e}`)
      }

      // 方法1: 尝试从页面中查找RSS链接
      const rssUrl = await page.evaluate(() => {
        // 查找RSS feed链接
        const rssLink = document.querySelector('link[type="application/rss+xml"]') as HTMLLinkElement
        if (rssLink && rssLink.href) {
          return rssLink.href
        }

        // 查找其他可能的feed链接
        const feedLink = document.querySelector('link[href*="feed"]') as HTMLLinkElement
        if (feedLink && feedLink.href) {
          return feedLink.href
        }

        return null
      })

      if (rssUrl) {
        Logger.info(`[ApplePodcasts] 找到RSS链接: ${rssUrl}`)
        return await this.extractAudioFromRSS(rssUrl, episodeId)
      }

      // 方法2: 尝试使用iTunes API查找RSS
      try {
        const itunesApiUrl = `https://itunes.apple.com/lookup?id=${podcastId}&entity=podcast`
        const response = await fetch(itunesApiUrl)
        
        if (response.ok) {
          const data = await response.json()
          if (data.results && data.results.length > 0) {
            const feedUrl = data.results[0].feedUrl
            if (feedUrl) {
              Logger.info(`[ApplePodcasts] 通过iTunes API找到RSS feed: ${feedUrl}`)
              return await this.extractAudioFromRSS(feedUrl, episodeId)
            }
          }
        }
      } catch (e) {
        Logger.warn(`[ApplePodcasts] iTunes API查找失败: ${e}`)
      }

      return null
    } catch (error: any) {
      Logger.warn(`[ApplePodcasts] RSS feed方法失败: ${error.message}`)
      return null
    }
  }

  /**
   * 从RSS feed中提取指定单集的音频URL
   */
  private async extractAudioFromRSS(rssUrl: string, episodeId: string): Promise<string | null> {
    try {
      const response = await fetch(rssUrl)
      if (!response.ok) {
        throw new Error(`RSS feed请求失败: ${response.status}`)
      }

      const rssText = await response.text()
      
      // 简单的XML解析来查找音频enclosure
      // 寻找包含episodeId或匹配的item
      const items = rssText.match(/<item[^>]*>[\s\S]*?<\/item>/gi) || []
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        // 检查是否包含episodeId或者是最新的单集
        if (item && (item.includes(episodeId) || i === 0)) {
          // 查找enclosure标签
          const enclosureMatch = item.match(/<enclosure[^>]*url=["']([^"']+)["'][^>]*>/i)
          if (enclosureMatch && enclosureMatch[1]) {
            const audioUrl = enclosureMatch[1]
            // 验证是否为音频文件
            if (audioUrl.match(/\.(mp3|m4a|aac|wav)($|\?)/i)) {
              Logger.info(`[ApplePodcasts] 从RSS中找到音频URL: ${audioUrl}`)
              return audioUrl
            }
          }
          
          // 作为备用，查找其他可能的音频链接
          const audioLinkMatch = item.match(/https?:\/\/[^"\s]+\.(?:mp3|m4a|aac|wav)(?:\?[^"\s]*)?/i)
          if (audioLinkMatch) {
            Logger.info(`[ApplePodcasts] 从RSS中找到备用音频URL: ${audioLinkMatch[0]}`)
            return audioLinkMatch[0]
          }
        }
      }

      Logger.warn('[ApplePodcasts] RSS feed中未找到匹配的音频URL')
      return null
    } catch (error: any) {
      Logger.warn(`[ApplePodcasts] RSS解析失败: ${error.message}`)
      return null
    }
  }

  /**
   * 规范化URL（处理相对路径）
   */
  private normalizeUrl(url: string, baseUrl: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
    }
    
    if (url.startsWith('//')) {
      return `https:${url}`
    }
    
    if (url.startsWith('/')) {
      const baseUrlObj = new URL(baseUrl)
      return `${baseUrlObj.protocol}//${baseUrlObj.host}${url}`
    }
    
    return new URL(url, baseUrl).href
  }
}
