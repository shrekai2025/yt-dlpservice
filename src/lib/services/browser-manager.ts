import puppeteer, { Browser, Page } from 'puppeteer'
import fs from 'fs/promises'
import path from 'path'
import { Logger } from '~/lib/utils/logger'
import { env } from '~/env.js'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface LoginCredentials {
  email: string
  password: string
}

export interface BrowserSession {
  browser: Browser
  page: Page
  isLoggedIn: boolean
  loginTime?: Date
}

/**
 * 浏览器管理器
 * 统一管理 Puppeteer 浏览器实例的生命周期
 */
export class BrowserManager {
  private static instance: BrowserManager
  private browser: Browser | null = null
  private isInitializing = false
  private activePages = new Set<Page>()
  private idleTimer: NodeJS.Timeout | null = null
  private readonly IDLE_TIMEOUT = 5 * 60 * 1000 // 5分钟闲置后关闭

  private constructor() {}

  public static getInstance(): BrowserManager {
    if (!BrowserManager.instance) {
      BrowserManager.instance = new BrowserManager()
    }
    return BrowserManager.instance
  }

  /**
   * 获取一个新的页面实例
   */
  async getPage(options: { headless?: boolean; timeout?: number; enableRequestInterception?: boolean } = {}): Promise<Page> {
    const { headless = true, timeout = 30000, enableRequestInterception = true } = options

    // 确保浏览器已启动
    await this.ensureBrowserStarted(headless)

    if (!this.browser) {
      throw new Error('浏览器启动失败')
    }

    // 创建新页面
    const page = await this.browser.newPage()

    // 设置超时
    page.setDefaultTimeout(timeout)
    page.setDefaultNavigationTimeout(timeout)

    // 设置User-Agent
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

    // 可选启用请求拦截以优化性能
    if (enableRequestInterception) {
      await this.setupRequestInterception(page)
    }

    // 跟踪活跃页面
    this.activePages.add(page)

    // 清除闲置定时器
    this.clearIdleTimer()

    Logger.debug(`BrowserManager: 创建新页面，当前活跃页面数: ${this.activePages.size}`)

    return page
  }

  /**
   * 释放页面实例
   */
  async releasePage(page: Page): Promise<void> {
    try {
      if (!page.isClosed()) {
        await page.close()
      }
      
      this.activePages.delete(page)
      
      Logger.debug(`BrowserManager: 释放页面，当前活跃页面数: ${this.activePages.size}`)
      
      // 如果没有活跃页面，启动闲置定时器
      if (this.activePages.size === 0) {
        this.startIdleTimer()
      }
    } catch (error) {
      Logger.warn(`BrowserManager: 释放页面时出错: ${error}`)
      this.activePages.delete(page)
    }
  }

  /**
   * 确保浏览器已启动
   */
  private async ensureBrowserStarted(headless: boolean): Promise<void> {
    if (this.browser && !this.browser.isConnected()) {
      Logger.warn('BrowserManager: 检测到浏览器连接已断开，重新启动')
      this.browser = null
    }

    if (this.browser) {
      return
    }

    if (this.isInitializing) {
      // 等待初始化完成
      while (this.isInitializing) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      return
    }

    this.isInitializing = true

    try {
      Logger.info('BrowserManager: 启动浏览器...')
      
      this.browser = await puppeteer.launch({
        headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=IsolateOrigins',
          '--disable-site-isolation-trials',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ]
      })

      Logger.info('BrowserManager: 浏览器启动成功')
    } catch (error) {
      Logger.error('BrowserManager: 浏览器启动失败', error)
      throw new Error(`浏览器启动失败: ${error}`)
    } finally {
      this.isInitializing = false
    }
  }

  /**
   * 设置请求拦截以优化性能
   */
  private async setupRequestInterception(page: Page): Promise<void> {
    await page.setRequestInterception(true)
    
    page.on('request', (request) => {
      const resourceType = request.resourceType()
      
      // 阻止不必要的资源加载
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        request.abort()
        return
      }
      
      // 允许其他请求
      request.continue()
    })
  }

  /**
   * 启动闲置定时器
   */
  private startIdleTimer(): void {
    this.clearIdleTimer()
    
    this.idleTimer = setTimeout(async () => {
      if (this.activePages.size === 0 && this.browser) {
        Logger.info('BrowserManager: 检测到闲置超时，关闭浏览器')
        await this.closeBrowser()
      }
    }, this.IDLE_TIMEOUT)
      
    Logger.debug('BrowserManager: 启动闲置定时器')
  }

  /**
   * 清除闲置定时器
   */
  private clearIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer)
      this.idleTimer = null
      Logger.debug('BrowserManager: 清除闲置定时器')
    }
  }

  /**
   * 关闭浏览器
   */
  private async closeBrowser(): Promise<void> {
    if (this.browser) {
      try {
        // 关闭所有页面
        const pages = await this.browser.pages()
        await Promise.all(pages.map(page => page.close().catch(() => {})))
        
        // 关闭浏览器
        await this.browser.close()
        
        Logger.info('BrowserManager: 浏览器已关闭')
      } catch (error) {
        Logger.warn('BrowserManager: 关闭浏览器时出错', error)
      } finally {
        this.browser = null
        this.activePages.clear()
        this.clearIdleTimer()
      }
    }
  }

  /**
   * 强制清理所有资源
   */
  async cleanup(): Promise<void> {
    Logger.info('BrowserManager: 开始清理资源')
    
    this.clearIdleTimer()
    
    // 关闭所有活跃页面
    const closePromises = Array.from(this.activePages).map(page => 
      page.close().catch(error => 
        Logger.warn('BrowserManager: 关闭页面时出错', error)
      )
    )
    
    await Promise.all(closePromises)
    this.activePages.clear()
    
    // 关闭浏览器
    await this.closeBrowser()
    
    Logger.info('BrowserManager: 资源清理完成')
  }

  /**
   * 获取状态信息
   */
  getStatus(): {
    browserConnected: boolean
    activePagesCount: number
    hasIdleTimer: boolean
  } {
    return {
      browserConnected: this.browser?.isConnected() ?? false,
      activePagesCount: this.activePages.size,
      hasIdleTimer: this.idleTimer !== null
    }
  }
}

export const browserManager = BrowserManager.getInstance() 