import { Page } from 'puppeteer'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { browserManager } from './browser-manager'
import { Logger } from '~/lib/utils/logger'

export interface CookieData {
  name: string
  value: string
  domain: string
  path: string
  expires?: number
  httpOnly?: boolean
  secure?: boolean
  sameSite?: 'Strict' | 'Lax' | 'None'
}

/**
 * YouTube Cookie管理器
 * 负责自动获取和刷新YouTube cookies，解决bot检测和cookie失效问题
 */
export class YouTubeCookieManager {
  private static instance: YouTubeCookieManager
  private readonly cookieFilePath = './data/cookies/youtube_cookies.txt'
  private readonly cookiesCacheFile = './data/cookies/youtube_cookies_cache.json'
  private lastRefreshTime = 0
  private readonly REFRESH_INTERVAL = 30 * 60 * 1000 // 30分钟刷新一次

  private constructor() {}

  public static getInstance(): YouTubeCookieManager {
    if (!YouTubeCookieManager.instance) {
      YouTubeCookieManager.instance = new YouTubeCookieManager()
    }
    return YouTubeCookieManager.instance
  }

  /**
   * 获取有效的YouTube cookies
   * 如果现有cookies失效或即将过期，会自动刷新
   */
  async getValidCookies(): Promise<string | null> {
    try {
      // 检查是否需要刷新cookies
      if (this.shouldRefreshCookies()) {
        Logger.info('[YouTubeCookieManager] 检测到需要刷新cookies，开始自动刷新...')
        await this.refreshCookies()
      }

      // 返回当前有效的cookies
      if (existsSync(this.cookieFilePath)) {
        return this.cookieFilePath
      }

      Logger.warn('[YouTubeCookieManager] cookies文件不存在，尝试重新获取...')
      await this.refreshCookies()
      
      return existsSync(this.cookieFilePath) ? this.cookieFilePath : null
    } catch (error) {
      Logger.error('[YouTubeCookieManager] 获取cookies失败:', error)
      return null
    }
  }

  /**
   * 检查是否需要刷新cookies
   */
  private shouldRefreshCookies(): boolean {
    const now = Date.now()
    
    // 如果从未刷新过，需要刷新
    if (this.lastRefreshTime === 0) {
      return true
    }

    // 如果距离上次刷新超过指定时间间隔，需要刷新
    if (now - this.lastRefreshTime > this.REFRESH_INTERVAL) {
      return true
    }

    // 检查cookies文件是否存在
    if (!existsSync(this.cookieFilePath)) {
      return true
    }

    // 检查缓存的cookies是否即将过期
    if (existsSync(this.cookiesCacheFile)) {
      try {
        const cachedCookies: CookieData[] = JSON.parse(readFileSync(this.cookiesCacheFile, 'utf-8'))
        const soonToExpire = cachedCookies.some(cookie => {
          if (!cookie.expires) return false
          // 如果cookies在未来10分钟内过期，需要刷新
          return (cookie.expires * 1000) < (now + 10 * 60 * 1000)
        })
        
        if (soonToExpire) {
          Logger.info('[YouTubeCookieManager] 检测到cookies即将过期，需要刷新')
          return true
        }
      } catch (error) {
        Logger.warn('[YouTubeCookieManager] 解析cookies缓存失败:', error)
        return true
      }
    }

    return false
  }

  /**
   * 使用puppeteer自动刷新YouTube cookies
   */
  async refreshCookies(): Promise<void> {
    let page: Page | null = null
    
    try {
      Logger.info('[YouTubeCookieManager] 开始获取新鲜的YouTube cookies...')
      
      // 获取浏览器页面
      page = await browserManager.getPage({ 
        headless: true, 
        timeout: 60000 
      })

      // 设置User-Agent以避免被识别为bot
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      )

      // 设置额外的headers
      await page.setExtraHTTPHeaders({
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      })

      // 访问YouTube主页
      Logger.info('[YouTubeCookieManager] 访问YouTube主页获取cookies...')
      await page.goto('https://www.youtube.com', { 
        waitUntil: 'networkidle0',
        timeout: 60000 
      })

      // 等待页面完全加载
      await page.waitForTimeout(3000)

      // 尝试处理cookie同意弹窗（如果存在）
      await this.handleCookieConsent(page)

      // 访问一个示例视频页面以获取更完整的cookies
      Logger.info('[YouTubeCookieManager] 访问视频页面以获取完整cookies...')
      await page.goto('https://www.youtube.com/watch?v=dQw4w9WgXcQ', { 
        waitUntil: 'networkidle0',
        timeout: 60000 
      })

      await page.waitForTimeout(2000)

      // 获取所有cookies
      const cookies = await page.cookies()
      Logger.info(`[YouTubeCookieManager] 成功获取 ${cookies.length} 个cookies`)

      // 过滤出YouTube相关的cookies
      const youtubeCookies = cookies.filter(cookie => 
        cookie.domain.includes('youtube.com') || cookie.domain.includes('.google.com')
      )

      // 保存cookies到缓存文件（JSON格式）
      writeFileSync(this.cookiesCacheFile, JSON.stringify(youtubeCookies, null, 2))

      // 转换为Netscape格式并保存
      await this.saveNetscapeCookies(youtubeCookies)

      this.lastRefreshTime = Date.now()
      Logger.info('[YouTubeCookieManager] ✅ cookies刷新完成')

    } catch (error) {
      Logger.error('[YouTubeCookieManager] 刷新cookies失败:', error)
      throw error
    } finally {
      if (page) {
        await browserManager.releasePage(page)
      }
    }
  }

  /**
   * 处理YouTube的cookie同意弹窗
   */
  private async handleCookieConsent(page: Page): Promise<void> {
    try {
      // 等待可能的同意按钮出现
      const consentSelectors = [
        'button[aria-label*="Accept"]',
        'button[aria-label*="I agree"]',
        'button[aria-label*="Agree"]',
        'button:has-text("I agree")',
        'button:has-text("Accept all")',
        'div[role="button"]:has-text("I agree")',
        // YouTube specific selectors
        'ytd-button-renderer:has-text("I agree")',
        'button.yt-spec-button-shape-next--call-to-action'
      ]

      for (const selector of consentSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 3000 })
          await page.click(selector)
          Logger.info('[YouTubeCookieManager] 已处理cookie同意弹窗')
          await page.waitForTimeout(2000)
          break
        } catch {
          // 继续尝试下一个选择器
        }
      }
    } catch (error) {
      // 没有找到同意按钮，继续执行
      Logger.debug('[YouTubeCookieManager] 未找到cookie同意弹窗，继续执行')
    }
  }

  /**
   * 将cookies保存为Netscape格式
   */
  private async saveNetscapeCookies(cookies: CookieData[]): Promise<void> {
    try {
      const netscapeFormat = [
        '# Netscape HTTP Cookie File',
        '# http://curl.haxx.se/rfc/cookie_spec.html',
        '# This is a generated file!  Do not edit.',
        ''
      ]

      cookies.forEach(cookie => {
        if (cookie.name && cookie.value) {
          const expires = cookie.expires ? Math.floor(cookie.expires) : 0
          const secure = cookie.secure ? 'TRUE' : 'FALSE'
          const httpOnly = cookie.httpOnly ? 'TRUE' : 'FALSE'
          
          // Netscape格式: domain  flag  path  secure  expiration  name  value
          const line = [
            cookie.domain,
            'TRUE', // domain flag
            cookie.path || '/',
            secure,
            expires.toString(),
            cookie.name,
            cookie.value
          ].join('\t')
          
          netscapeFormat.push(line)
        }
      })

      writeFileSync(this.cookieFilePath, netscapeFormat.join('\n'))
      Logger.info(`[YouTubeCookieManager] 已保存 ${cookies.length} 个cookies到 ${this.cookieFilePath}`)
      
    } catch (error) {
      Logger.error('[YouTubeCookieManager] 保存Netscape格式cookies失败:', error)
      throw error
    }
  }

  /**
   * 手动触发cookies刷新
   */
  async forceRefresh(): Promise<void> {
    this.lastRefreshTime = 0 // 重置刷新时间
    await this.refreshCookies()
  }

  /**
   * 检查cookies是否有效
   */
  async validateCookies(): Promise<boolean> {
    try {
      if (!existsSync(this.cookieFilePath)) {
        return false
      }

      // 使用yt-dlp测试cookies是否有效
      const { exec } = await import('child_process')
      const { promisify } = await import('util')
      const execAsync = promisify(exec)

      const testCommand = `yt-dlp --cookies "${this.cookieFilePath}" --dump-json --no-warnings --quiet "https://www.youtube.com/watch?v=dQw4w9WgXcQ"`
      
      try {
        await execAsync(testCommand)
        Logger.info('[YouTubeCookieManager] ✅ cookies验证通过')
        return true
      } catch (error: any) {
        if (error.message.includes('Sign in to confirm you\'re not a bot')) {
          Logger.warn('[YouTubeCookieManager] ❌ cookies验证失败：需要登录确认不是机器人')
          return false
        }
        Logger.warn('[YouTubeCookieManager] cookies验证失败:', error.message)
        return false
      }
    } catch (error) {
      Logger.error('[YouTubeCookieManager] 验证cookies时发生错误:', error)
      return false
    }
  }
}

export const youtubeCookieManager = YouTubeCookieManager.getInstance()