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

export class BrowserManager {
  private static instance: BrowserManager
  private browser: Browser | null = null
  private sessions: Map<string, BrowserSession> = new Map()
  private cookiesDir: string
  private isInitialized = false
  private chromeExecutablePath: string | null = null

  constructor() {
    this.cookiesDir = path.resolve(env.BROWSER_DATA_DIR)
  }

  static getInstance(): BrowserManager {
    if (!BrowserManager.instance) {
      BrowserManager.instance = new BrowserManager()
    }
    return BrowserManager.instance
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // 确保 cookies 目录存在
      await fs.mkdir(this.cookiesDir, { recursive: true })
      
      // 检测和配置 Chrome 浏览器
      await this.detectOrInstallChrome()
      
      this.isInitialized = true
      Logger.info('BrowserManager 初始化完成')
    } catch (error) {
      Logger.error(`BrowserManager 初始化失败: ${error}`)
      throw error
    }
  }

  /**
   * 检测现有的 Chrome 或安装独立的 Chrome
   */
  private async detectOrInstallChrome(): Promise<void> {
    Logger.info('🔍 检测 Chrome 浏览器...')
    
    // 尝试检测现有的 Chrome 安装
    const possiblePaths = this.getChromePossiblePaths()
    
    for (const chromePath of possiblePaths) {
      try {
        const { stdout } = await execAsync(`"${chromePath}" --version`)
        if (stdout.includes('Google Chrome') || stdout.includes('Chrome')) {
          this.chromeExecutablePath = chromePath
          Logger.info(`✅ 找到 Chrome 浏览器: ${chromePath}`)
          Logger.info(`版本: ${stdout.trim()}`)
          return
        }
      } catch (error) {
        // 继续尝试下一个路径
        continue
      }
    }

    // 如果没有找到 Chrome，尝试安装
    Logger.warn('❌ 未找到 Chrome 浏览器，准备安装独立 Chrome...')
    await this.installStandaloneChrome()
  }

  /**
   * 获取可能的 Chrome 安装路径
   */
  private getChromePossiblePaths(): string[] {
    const platform = process.platform
    
    if (platform === 'darwin') {
      // macOS
      return [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chrome.app/Contents/MacOS/Chrome',
        '/usr/local/bin/google-chrome',
        '/opt/google/chrome/chrome'
      ]
    } else if (platform === 'linux') {
      // Linux/Ubuntu
      return [
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chrome',
        '/usr/local/bin/google-chrome',
        '/opt/google/chrome/chrome',
        '/snap/bin/chromium'
      ]
    } else if (platform === 'win32') {
      // Windows
      return [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Users\\%USERNAME%\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'
      ]
    }
    
    return []
  }

  /**
   * 安装独立的 Chrome 浏览器
   */
  private async installStandaloneChrome(): Promise<void> {
    const platform = process.platform
    
    try {
      if (platform === 'darwin') {
        await this.installChromeOnMacOS()
      } else if (platform === 'linux') {
        await this.installChromeOnLinux()
      } else {
        throw new Error(`暂不支持在 ${platform} 平台自动安装 Chrome`)
      }
    } catch (error) {
      Logger.error(`Chrome 安装失败: ${error}`)
      Logger.warn('请手动安装 Google Chrome 浏览器或使用 Chromium')
      throw error
    }
  }

  /**
   * 在 macOS 上安装 Chrome
   */
  private async installChromeOnMacOS(): Promise<void> {
    Logger.info('📦 在 macOS 上安装 Google Chrome...')
    
    try {
      // 检查是否有 Homebrew
      try {
        await execAsync('command -v brew')
        Logger.info('使用 Homebrew 安装 Chrome...')
        await execAsync('brew install --cask google-chrome')
        this.chromeExecutablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
        Logger.info('✅ Chrome 通过 Homebrew 安装成功')
        return
      } catch (brewError) {
        Logger.warn('Homebrew 不可用，使用直接下载方式...')
      }

      // 直接下载安装
      const downloadUrl = 'https://dl.google.com/chrome/mac/stable/GGRO/googlechrome.dmg'
      const downloadPath = '/tmp/googlechrome.dmg'
      
      Logger.info('📥 下载 Chrome DMG 文件...')
      await execAsync(`curl -L "${downloadUrl}" -o "${downloadPath}"`)
      
      Logger.info('📋 挂载 DMG 文件...')
      await execAsync(`hdiutil attach "${downloadPath}"`)
      
      Logger.info('📱 复制 Chrome 到 Applications...')
      await execAsync('cp -R "/Volumes/Google Chrome/Google Chrome.app" /Applications/')
      
      Logger.info('📤 卸载 DMG 文件...')
      await execAsync('hdiutil detach "/Volumes/Google Chrome"')
      
      // 清理下载文件
      await execAsync(`rm -f "${downloadPath}"`)
      
      this.chromeExecutablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      Logger.info('✅ Chrome 直接安装成功')
      
    } catch (error) {
      throw new Error(`macOS Chrome 安装失败: ${error}`)
    }
  }

  /**
   * 在 Linux 上安装 Chrome
   */
  private async installChromeOnLinux(): Promise<void> {
    Logger.info('📦 在 Linux 上安装 Google Chrome...')
    
    try {
      // 下载 Chrome 的 GPG 密钥
      Logger.info('🔑 添加 Google Chrome 软件源...')
      await execAsync('wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -')
      
      // 添加 Chrome 软件源
      await execAsync('echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list')
      
      // 更新软件包列表
      Logger.info('🔄 更新软件包列表...')
      await execAsync('sudo apt update')
      
      // 安装 Chrome
      Logger.info('📦 安装 Google Chrome...')
      await execAsync('sudo apt install -y google-chrome-stable')
      
      this.chromeExecutablePath = '/usr/bin/google-chrome'
      Logger.info('✅ Chrome 在 Linux 上安装成功')
      
    } catch (error) {
      throw new Error(`Linux Chrome 安装失败: ${error}`)
    }
  }

  async launchBrowser(): Promise<Browser> {
    try {
      Logger.info('🚀 启动专用 Chrome 浏览器...')
      
      // 确保已检测到 Chrome
      if (!this.chromeExecutablePath) {
        throw new Error('未找到 Chrome 浏览器路径')
      }
      
      // 根据环境变量配置浏览器参数
      const puppeteerArgs = env.PUPPETEER_ARGS.split(' ').filter(arg => arg.trim())
      const isHeadless = env.PUPPETEER_HEADLESS
      
      const launchOptions = {
        executablePath: this.chromeExecutablePath, // 使用检测到的 Chrome 路径
        headless: isHeadless,
        defaultViewport: { width: 1280, height: 800 },
        userDataDir: this.cookiesDir,
        args: [
          ...puppeteerArgs,
          '--disable-dev-shm-usage',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-features=TranslateUI',
          '--disable-ipc-flooding-protection',
          '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ]
      }

      // 如果是生产环境且不是 headless，尝试启用 X11 转发或警告
      if (env.NODE_ENV === 'production' && !isHeadless) {
        Logger.warn('生产环境中启用了可视化浏览器，请确保服务器支持 X11 转发或考虑使用 headless 模式')
      }

      const browser = await puppeteer.launch(launchOptions)

      this.browser = browser
      Logger.info(`✅ Chrome 浏览器启动成功 (headless: ${isHeadless})`)
      Logger.info(`🔧 使用路径: ${this.chromeExecutablePath}`)
      return browser
    } catch (error) {
      Logger.error(`Chrome 浏览器启动失败: ${error}`)
      throw error
    }
  }

  async promptForLogin(): Promise<boolean> {
    try {
      const session = this.sessions.get('youtube')
      if (!session) {
        throw new Error('No YouTube session found')
      }

      const { page } = session

      // 如果是 headless 模式，无法进行交互式登录
      if (env.PUPPETEER_HEADLESS) {
        Logger.warn('Headless 模式下无法进行交互式登录，请考虑预先配置 cookies')
        return false
      }

      Logger.info('🌐 请在专用浏览器中完成 YouTube 登录...')
      Logger.info('提示：登录完成后，系统会自动检测并保存您的登录状态')
      
      // 导航到登录页面
      await page.goto('https://accounts.google.com/signin', { 
        waitUntil: 'networkidle2' 
      })

      // 等待用户完成登录（最多等待10分钟，给用户足够时间）
      const maxWaitTime = 10 * 60 * 1000 // 10分钟
      const checkInterval = 3000 // 每3秒检查一次
      const startTime = Date.now()
      let lastLogTime = 0

      while (Date.now() - startTime < maxWaitTime) {
        try {
          const currentTime = Date.now()
          
          // 每30秒提示一次状态
          if (currentTime - lastLogTime > 30000) {
            const remainingMinutes = Math.ceil((maxWaitTime - (currentTime - startTime)) / 60000)
            Logger.info(`⏳ 等待用户登录中... (剩余 ${remainingMinutes} 分钟)`)
            lastLogTime = currentTime
          }

          // 检查是否已经回到 YouTube 并且已登录
          const currentUrl = page.url()
          
          // 如果还在登录页面，继续等待
          if (currentUrl.includes('accounts.google.com')) {
            await new Promise(resolve => setTimeout(resolve, checkInterval))
            continue
          }
          
          // 如果已经跳转到其他Google服务页面，尝试导航到YouTube
          if (currentUrl.includes('google.com') && !currentUrl.includes('youtube.com')) {
            Logger.info('检测到登录成功，导航到 YouTube...')
            await page.goto('https://www.youtube.com', { waitUntil: 'networkidle2' })
          }
          
          // 检查YouTube登录状态
          if (currentUrl.includes('youtube.com')) {
            const isLoggedIn = await this.checkYouTubeLoginStatus(page)
            if (isLoggedIn) {
              session.isLoggedIn = true
              session.loginTime = new Date()
              Logger.info('✅ YouTube 登录成功！登录状态已保存')
              
              // 立即保存cookies
              try {
                await this.getCookiesForYtDlp()
                Logger.info('🍪 登录信息已保存，可用于后续视频下载')
              } catch (cookieError) {
                Logger.warn(`保存cookies时出现问题: ${cookieError}`)
              }
              
              return true
            }
          }

          await new Promise(resolve => setTimeout(resolve, checkInterval))
        } catch (error) {
          Logger.warn(`Login check error: ${error}`)
          await new Promise(resolve => setTimeout(resolve, checkInterval))
        }
      }

      Logger.warn('⏰ 登录超时，请重试')
      Logger.info('💡 提示：您可以稍后在管理面板中重新尝试登录')
      return false
    } catch (error) {
      Logger.error(`Login prompt failed: ${error}`)
      return false
    }
  }

  async createYouTubeSession(): Promise<BrowserSession> {
    try {
      if (!this.browser) {
        this.browser = await this.launchBrowser()
      }

      const page = await this.browser.newPage()
      
      // 设置用户代理和视口
      await page.setViewport({ width: 1280, height: 800 })
      
      // 设置页面超时
      page.setDefaultTimeout(30000)
      page.setDefaultNavigationTimeout(30000)
      
      const session: BrowserSession = {
        browser: this.browser,
        page,
        isLoggedIn: false
      }

      // 导航到 YouTube 并检查登录状态
      Logger.info('🌐 导航到 YouTube...')
      await page.goto('https://www.youtube.com', { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      })

      // 检查是否已经登录
      const isLoggedIn = await this.checkYouTubeLoginStatus(page)
      session.isLoggedIn = isLoggedIn

      if (isLoggedIn) {
        Logger.info('✅ 检测到已有 YouTube 登录状态')
        session.loginTime = new Date()
        
        // 立即保存cookies
        try {
          await this.getCookiesForYtDlp()
          Logger.info('🍪 已有登录信息可用于视频下载')
        } catch (cookieError) {
          Logger.warn(`获取已有cookies时出现问题: ${cookieError}`)
        }
      } else {
        Logger.info('ℹ️ 未检测到 YouTube 登录状态')
      }

      this.sessions.set('youtube', session)
      return session
    } catch (error) {
      Logger.error(`Failed to create YouTube session: ${error}`)
      throw error
    }
  }

  async checkYouTubeLoginStatus(page: Page): Promise<boolean> {
    try {
      // 检查是否存在登录头像或账户菜单
      const loginIndicators = [
        'button[aria-label*="Google Account"]',
        'button[aria-label*="Account menu"]',
        'img[class*="avatar"]',
        '#avatar-btn',
        'button[id*="avatar"]',
        'yt-img-shadow[id="avatar"]',
        'button[aria-label*="帐号菜单"]' // 中文界面
      ]

      for (const selector of loginIndicators) {
        try {
          await page.waitForSelector(selector, { timeout: 3000 })
          Logger.info(`Found login indicator: ${selector}`)
          return true
        } catch {
          // 继续检查下一个选择器
        }
      }

      return false
    } catch (error) {
      Logger.error(`Error checking login status: ${error}`)
      return false
    }
  }

  async getCookiesForYtDlp(): Promise<string> {
    try {
      const session = this.sessions.get('youtube')
      if (!session || !session.isLoggedIn) {
        throw new Error('No logged in YouTube session found')
      }

      const { page } = session
      
      // 确保在 YouTube 页面
      if (!page.url().includes('youtube.com')) {
        await page.goto('https://www.youtube.com', { waitUntil: 'networkidle2' })
      }

      // 获取所有 cookies
      const cookies = await page.cookies()
      
      // 转换为 Netscape 格式（yt-dlp 兼容）
      const netscapeCookies = cookies
        .filter(cookie => cookie.domain.includes('youtube.com') || cookie.domain.includes('google.com'))
        .map(cookie => {
          const domain = cookie.domain.startsWith('.') ? cookie.domain : `.${cookie.domain}`
          const flag = domain.startsWith('.') ? 'TRUE' : 'FALSE'
          const secure = cookie.secure ? 'TRUE' : 'FALSE'
          const expiry = cookie.expires ? Math.floor(cookie.expires) : '0'
          
          return `${domain}\t${flag}\t${cookie.path}\t${secure}\t${expiry}\t${cookie.name}\t${cookie.value}`
        })
        .join('\n')

      // 保存 cookies 到文件
      const cookiesFile = path.join(this.cookiesDir, 'youtube_cookies.txt')
      await fs.writeFile(cookiesFile, netscapeCookies, 'utf-8')
      
      Logger.info(`YouTube cookies saved to: ${cookiesFile}`)
      return cookiesFile
    } catch (error) {
      Logger.error(`Failed to get cookies: ${error}`)
      throw error
    }
  }

  async getLoginStatus(): Promise<{ isLoggedIn: boolean; loginTime?: Date }> {
    const session = this.sessions.get('youtube')
    if (!session) {
      return { isLoggedIn: false }
    }

    // 实时检查登录状态
    try {
      if (session.page && !session.page.isClosed()) {
        const currentLoginStatus = await this.checkYouTubeLoginStatus(session.page)
        if (currentLoginStatus !== session.isLoggedIn) {
          session.isLoggedIn = currentLoginStatus
          if (currentLoginStatus) {
            session.loginTime = new Date()
            Logger.info('🔄 检测到登录状态变化，已更新')
          }
        }
      }
    } catch (error) {
      Logger.warn(`检查实时登录状态时出错: ${error}`)
    }

    return {
      isLoggedIn: session.isLoggedIn,
      loginTime: session.loginTime
    }
  }

  async refreshLogin(): Promise<boolean> {
    try {
      const session = this.sessions.get('youtube')
      if (!session) {
        // 创建新的会话
        await this.createYouTubeSession()
        return await this.promptForLogin()
      }

      // 检查当前登录状态
      const isLoggedIn = await this.checkYouTubeLoginStatus(session.page)
      if (isLoggedIn) {
        session.isLoggedIn = true
        session.loginTime = new Date()
        return true
      }

      // 需要重新登录
      return await this.promptForLogin()
    } catch (error) {
      Logger.error(`Failed to refresh login: ${error}`)
      return false
    }
  }

  async closeBrowser(): Promise<void> {
    try {
      if (this.browser) {
        await this.browser.close()
        this.browser = null
        this.sessions.clear()
        Logger.info('浏览器已关闭')
      }
    } catch (error) {
      Logger.error(`Error closing browser: ${error}`)
    }
  }

  async cleanup(): Promise<void> {
    await this.closeBrowser()
  }
}

export const browserManager = BrowserManager.getInstance() 