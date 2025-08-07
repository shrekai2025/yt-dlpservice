#!/usr/bin/env node

import puppeteer from 'puppeteer'

async function debugYouTubeScraper(url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ') {
  console.log('🔍 YouTube爬虫调试工具')
  console.log(`📍 URL: ${url}\n`)
  
  let browser = null
  let page = null
  
  try {
    const startTime = Date.now()
    
    // 启动浏览器
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    })
    
    page = await browser.newPage()
    
    console.log('🌐 访问页面...')
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    })
    
    console.log('⏰ 等待页面加载...')
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    // 检查页面基本信息
    console.log('📊 检查页面基本信息...')
    const basicInfo = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        readyState: document.readyState,
        hasH1: !!document.querySelector('h1'),
        h1Count: document.querySelectorAll('h1').length,
        h1Text: document.querySelector('h1')?.textContent?.trim() || 'No H1'
      }
    })
    console.log('基本信息:', basicInfo)
    
    // 检查YouTube特定选择器
    console.log('\n🎯 检查YouTube特定选择器...')
    const youtubeSelectors = [
      'h1.ytd-video-primary-info-renderer',
      'h1.style-scope.ytd-video-primary-info-renderer',
      '#owner-text a',
      '#channel-name a',
      '.ytd-channel-name a',
      '#avatar img',
      '.ytd-video-owner-renderer img'
    ]
    
    for (const selector of youtubeSelectors) {
      const exists = await page.$(selector)
      const text = exists ? await page.evaluate(el => el.textContent?.trim() || el.src || 'Found', exists) : null
      console.log(`${selector}: ${exists ? '✅' : '❌'} ${text ? `"${text.substring(0, 50)}..."` : ''}`)
    }
    
    // 检查页面脚本数据
    console.log('\n📜 检查页面脚本数据...')
    const scriptData = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'))
      let hasInitialData = false
      let dataPreview = ''
      
      for (const script of scripts) {
        const content = script.innerHTML
        if (content.includes('var ytInitialData')) {
          hasInitialData = true
          dataPreview = content.substring(0, 200) + '...'
          break
        }
      }
      
      return {
        scriptCount: scripts.length,
        hasInitialData,
        dataPreview
      }
    })
    console.log('脚本数据:', scriptData)
    
    // 尝试滚动到评论区
    console.log('\n💬 检查评论区...')
    await page.evaluate(() => {
      const commentsSection = document.querySelector('#comments')
      if (commentsSection) {
        commentsSection.scrollIntoView({ behavior: 'smooth' })
      }
    })
    
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    const commentInfo = await page.evaluate(() => {
      const commentSelectors = [
        '#comments',
        'ytd-comment-thread-renderer',
        '.comment-item',
        '.reply-item'
      ]
      
      const results = {}
      for (const selector of commentSelectors) {
        const elements = document.querySelectorAll(selector)
        results[selector] = elements.length
      }
      
      return results
    })
    console.log('评论元素数量:', commentInfo)
    
    const duration = Date.now() - startTime
    console.log(`\n✅ 调试完成! 总耗时: ${duration}ms`)
    
  } catch (error) {
    console.log('\n❌ 调试失败!')
    console.log(`🚫 错误: ${error.message}`)
    console.log(`🔍 错误堆栈: ${error.stack}`)
  } finally {
    if (page) await page.close()
    if (browser) await browser.close()
  }
}

// 运行调试
const testUrl = process.argv[2]
debugYouTubeScraper(testUrl).catch(console.error)