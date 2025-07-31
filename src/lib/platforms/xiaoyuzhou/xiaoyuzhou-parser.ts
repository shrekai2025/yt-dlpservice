import { Logger } from '~/lib/utils/logger'
import type { PlatformExtractor, ParsedContent } from '~/lib/downloaders/types'
import type { XiaoyuzhouMetadata } from './types'
import type { Page } from 'puppeteer'

/**
 * 小宇宙内容解析器
 */
export class XiaoyuzhouExtractor implements PlatformExtractor {
  /**
   * 从小宇宙页面提取音频URL和元数据
   */
  async extractFromPage(page: Page, url: string): Promise<ParsedContent> {
    try {
      Logger.info('[xiaoyuzhou] 开始解析页面内容')
      
      // 等待页面关键元素加载
      await page.waitForSelector('audio', { timeout: 10000 }).catch(() => {
        Logger.warn('[xiaoyuzhou] 未找到 audio 元素，尝试其他方法')
      })
      
      // 提取页面数据
      const pageData = await page.evaluate(() => {
        // 提取音频URL
        let audioUrl: string | null = null
        
        // 方法1: 从 audio 元素获取
        const audioElement = document.querySelector('audio') as HTMLAudioElement
        if (audioElement && audioElement.src) {
          audioUrl = audioElement.src
        }
        
        // 方法2: 从页面脚本中提取
        if (!audioUrl) {
          const scripts = Array.from(document.querySelectorAll('script'))
          for (const script of scripts) {
            const content = script.innerHTML
            // 查找音频URL模式
                         const audioMatch = content.match(/"audioUrl"\s*:\s*"([^"]+)"/i) ||
                              content.match(/"url"\s*:\s*"([^"]+\.m4a[^"]*)"/i) ||
                              content.match(/"url"\s*:\s*"([^"]+\.mp3[^"]*)"/i) ||
                              content.match(/"enclosure"\s*:\s*{\s*"url"\s*:\s*"([^"]+)"/i)
            
            if (audioMatch && audioMatch[1]) {
              audioUrl = audioMatch[1]
              break
            }
          }
        }
        
        // 提取元数据
        const title = document.querySelector('h1')?.textContent?.trim() || 
                     document.querySelector('.episode-title')?.textContent?.trim() ||
                     document.querySelector('[class*="title"]')?.textContent?.trim() ||
                     document.title
        
        const description = document.querySelector('.description')?.textContent?.trim() ||
                           document.querySelector('[class*="description"]')?.textContent?.trim() ||
                           document.querySelector('meta[name="description"]')?.getAttribute('content') ||
                           ''
        
        // 提取节目名称
        const showTitle = document.querySelector('.podcast-title')?.textContent?.trim() ||
                         document.querySelector('[class*="podcast-name"]')?.textContent?.trim() ||
                         ''
        
        // 提取时长（可能在多个地方）
        let duration: number | null = null
        const durationText = document.querySelector('.duration')?.textContent ||
                            document.querySelector('[class*="duration"]')?.textContent ||
                            ''
        
        if (durationText) {
          // 解析时长格式 (如 "45:30" 或 "1:23:45")
          const parts = durationText.split(':').map(p => parseInt(p, 10)).filter(p => !isNaN(p))
          if (parts.length === 2) {
            duration = parts[0]! * 60 + parts[1]!
          } else if (parts.length === 3) {
            duration = parts[0]! * 3600 + parts[1]! * 60 + parts[2]!
          }
        }
        
        // 提取封面图
        const coverUrl = document.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
                        document.querySelector('.episode-cover img')?.getAttribute('src') ||
                        document.querySelector('[class*="cover"] img')?.getAttribute('src') ||
                        ''
        
        // 提取发布日期
        const publishDate = document.querySelector('time')?.getAttribute('datetime') ||
                           document.querySelector('.publish-date')?.textContent?.trim() ||
                           ''
        
        // 从URL提取episodeId
        const episodeMatch = window.location.pathname.match(/episode\/([^\/]+)/)
        const episodeId = episodeMatch ? episodeMatch[1] : ''
        
        return {
          audioUrl,
          title,
          description,
          showTitle,
          duration,
          coverUrl,
          publishDate,
          episodeId
        }
      })
      
      // 验证必要数据
      if (!pageData.audioUrl) {
        throw new Error('未能找到音频URL')
      }
      
      if (!pageData.title) {
        throw new Error('未能找到标题')
      }
      
      // 处理相对URL
      const audioUrl = this.normalizeUrl(pageData.audioUrl, url)
      const coverUrl = pageData.coverUrl ? this.normalizeUrl(pageData.coverUrl, url) : undefined
      
      // 构建元数据
      const metadata: XiaoyuzhouMetadata = {
        platform: 'xiaoyuzhou',
        title: pageData.title,
        description: pageData.description || undefined,
        duration: pageData.duration || undefined,
        coverUrl: coverUrl,
        showTitle: pageData.showTitle || undefined,
        episodeId: pageData.episodeId || undefined,
        publishDate: pageData.publishDate || undefined
      }
      
      Logger.info(`[xiaoyuzhou] 解析成功: ${metadata.title}`)
      Logger.debug('[xiaoyuzhou] 音频URL:', audioUrl)
      
      return {
        audioUrls: [audioUrl],
        metadata
      }
    } catch (error: any) {
      Logger.error(`[xiaoyuzhou] 解析失败: ${error.message}`)
      
      // 保存失败页面内容用于调试
      try {
        const pageContent = await page.content()
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const debugFileName = `xiaoyuzhou-parse-error-${timestamp}.html`
        const debugFilePath = `./logs/${debugFileName}`
        
        // 确保 logs 目录存在
        const fs = require('fs').promises
        const path = require('path')
        await fs.mkdir(path.dirname(debugFilePath), { recursive: true })
        
        // 保存页面内容
        await fs.writeFile(debugFilePath, pageContent, 'utf-8')
        
        Logger.error(`[xiaoyuzhou] 页面内容已保存到: ${debugFilePath}`)
        Logger.error(`[xiaoyuzhou] 页面URL: ${url}`)
        Logger.error(`[xiaoyuzhou] 页面标题: ${await page.title().catch(() => 'N/A')}`)
      } catch (saveError) {
        Logger.warn(`[xiaoyuzhou] 保存调试信息失败: ${saveError}`)
      }
      
      throw new Error(`解析小宇宙页面失败: ${error.message}`)
    }
  }
  
  /**
   * 规范化URL（处理相对路径）
   */
  private normalizeUrl(url: string, baseUrl: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
    }
    
    try {
      const base = new URL(baseUrl)
      return new URL(url, base).href
    } catch {
      return url
    }
  }
} 