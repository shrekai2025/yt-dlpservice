#!/usr/bin/env node

import puppeteer from 'puppeteer'

async function testBilibiliSelectors(url = 'https://www.bilibili.com/video/BV1GJ411x7h7') {
  console.log('🔧 B站选择器修复测试')
  console.log(`📍 URL: ${url}\n`)
  
  let browser = null
  let page = null
  
  try {
    const startTime = Date.now()
    
    // 启动浏览器
    browser = await puppeteer.launch({
      headless: false, // 使用有头模式方便调试
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    })
    
    page = await browser.newPage()
    
    // 设置更真实的请求头
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36')
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Referer': 'https://www.bilibili.com/'
    })
    
    console.log('🌐 访问页面...')
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    })
    
    // 检查重定向
    const currentUrl = page.url()
    console.log(`📍 当前URL: ${currentUrl}`)
    
    if (!currentUrl.includes('/video/')) {
      console.log('❌ 被重定向，尝试再次访问...')
      await new Promise(resolve => setTimeout(resolve, 3000))
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 60000 
      })
    }
    
    console.log('⏰ 等待页面加载...')
    await new Promise(resolve => setTimeout(resolve, 10000))
    
    // 根据您提供的HTML结构测试正确的选择器
    console.log('🎯 测试基于您提供HTML结构的选择器...')
    
    const data = await page.evaluate(() => {
      // 标题 - 根据您提供的结构
      const titleSelectors = [
        '.video-info-title h1[data-title]',  // 您提供的结构
        '.video-title.special-text-indent',
        'h1[data-title]',
        '.video-info-title-inner h1'
      ]
      
      let title = 'Not found'
      for (const selector of titleSelectors) {
        const el = document.querySelector(selector)
        if (el) {
          title = el.getAttribute('data-title') || el.textContent?.trim() || 'Found but no content'
          console.log(`找到标题: ${selector} -> ${title}`)
          break
        }
      }
      
      // 播放量 - 根据您提供的结构
      const viewSelectors = [
        '.view-text',  // 您提供的结构
        '.view .item .view-text',
        '.bili-video-card__stats--text'
      ]
      
      let playCount = 'Not found'
      for (const selector of viewSelectors) {
        const el = document.querySelector(selector)
        if (el) {
          playCount = el.textContent?.trim() || 'Found but no content'
          console.log(`找到播放量: ${selector} -> ${playCount}`)
          break
        }
      }
      
      // 点赞数 - 根据您提供的结构
      const likeSelectors = [
        '.video-like-info.video-toolbar-item-text',  // 您提供的结构
        '.video-toolbar-left-item .video-like-info',
        '.toolbar-left-item-wrap .video-like-info'
      ]
      
      let likeCount = 'Not found'
      for (const selector of likeSelectors) {
        const el = document.querySelector(selector)
        if (el) {
          likeCount = el.textContent?.trim() || 'Found but no content'
          console.log(`找到点赞数: ${selector} -> ${likeCount}`)
          break
        }
      }
      
      // 投币数 - 根据您提供的结构
      const coinSelectors = [
        '.video-coin-info.video-toolbar-item-text',  // 您提供的结构
        '.video-toolbar-left-item .video-coin-info',
        '.toolbar-left-item-wrap .video-coin-info'
      ]
      
      let coinCount = 'Not found'
      for (const selector of coinSelectors) {
        const el = document.querySelector(selector)
        if (el) {
          coinCount = el.textContent?.trim() || 'Found but no content'
          console.log(`找到投币数: ${selector} -> ${coinCount}`)
          break
        }
      }
      
      // 分享数 - 根据您提供的结构
      const shareSelectors = [
        '.video-share-info-text',  // 您提供的结构
        '.video-share-dropdown .video-share-info-text',
        '.dropdown-top .video-share-info-text'
      ]
      
      let shareCount = 'Not found'
      for (const selector of shareSelectors) {
        const el = document.querySelector(selector)
        if (el) {
          shareCount = el.textContent?.trim() || 'Found but no content'
          console.log(`找到分享数: ${selector} -> ${shareCount}`)
          break
        }
      }
      
      return {
        title,
        playCount,
        likeCount,
        coinCount,
        shareCount,
        currentUrl: window.location.href,
        pageTitle: document.title
      }
    })
    
    console.log('\n✅ 提取结果:')
    console.log(JSON.stringify(data, null, 2))
    
    const duration = Date.now() - startTime
    console.log(`\n⏱️ 总耗时: ${duration}ms`)
    
    // 保持浏览器打开10秒供手动检查
    console.log('\n🔍 浏览器将保持打开10秒供手动检查...')
    await new Promise(resolve => setTimeout(resolve, 10000))
    
  } catch (error) {
    console.log('\n❌ 测试失败!')
    console.log(`🚫 错误: ${error.message}`)
  } finally {
    if (page) await page.close()
    if (browser) await browser.close()
  }
}

// 运行测试
const testUrl = process.argv[2]
testBilibiliSelectors(testUrl).catch(console.error)