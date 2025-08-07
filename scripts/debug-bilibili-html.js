#!/usr/bin/env node

import puppeteer from 'puppeteer'

async function debugBilibiliHTML(url = 'https://www.bilibili.com/video/BV1GJ411x7h7') {
  console.log('🔍 Bilibili HTML结构调试工具')
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
    
    // 设置User-Agent
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36')
    
    console.log('🌐 访问页面...')
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    })
    
    console.log('⏰ 等待页面加载...')
    await new Promise(resolve => setTimeout(resolve, 10000))
    
    // 检查页面基本信息
    console.log('📊 检查页面基本信息...')
    const basicInfo = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        readyState: document.readyState,
        bodyHTML: document.body ? document.body.innerHTML.substring(0, 500) + '...' : 'No body'
      }
    })
    console.log('基本信息:', basicInfo)
    
    // 查找所有可能的标题元素
    console.log('\n🎯 查找所有H1元素...')
    const h1Elements = await page.evaluate(() => {
      const h1s = Array.from(document.querySelectorAll('h1'))
      return h1s.map((h1, index) => ({
        index,
        text: h1.textContent?.trim() || '',
        className: h1.className || '',
        id: h1.id || '',
        attributes: Array.from(h1.attributes).map(attr => `${attr.name}="${attr.value}"`).join(' ')
      })).filter(item => item.text.length > 0)
    })
    console.log('H1元素:', h1Elements)
    
    // 查找包含数字的元素（可能是播放量、点赞数等）
    console.log('\n🔢 查找包含数字的元素...')
    const numberElements = await page.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll('*'))
      const numberElements = []
      
      for (const el of allElements) {
        const text = el.textContent?.trim() || ''
        // 匹配数字（可能包含万、千等单位）
        if (/^\d+(\.\d+)?[万千]?$/.test(text) && parseInt(text) > 10) {
          numberElements.push({
            text,
            tagName: el.tagName.toLowerCase(),
            className: el.className || '',
            id: el.id || '',
            parent: el.parentElement?.className || ''
          })
        }
      }
      
      return numberElements.slice(0, 20) // 只返回前20个
    })
    console.log('数字元素:', numberElements)
    
    // 检查是否有反爬虫或需要登录
    console.log('\n🛡️ 检查页面状态...')
    const pageStatus = await page.evaluate(() => {
      const bodyText = document.body?.textContent || ''
      return {
        hasLoginPrompt: bodyText.includes('登录') || bodyText.includes('请先登录'),
        hasCaptcha: bodyText.includes('验证') || bodyText.includes('captcha'),
        hasError: bodyText.includes('404') || bodyText.includes('错误') || bodyText.includes('不存在'),
        hasVideoPlayer: !!document.querySelector('video, .bilibili-player'),
        bodyTextPreview: bodyText.substring(0, 300) + '...'
      }
    })
    console.log('页面状态:', pageStatus)
    
    // 查找script标签中的数据
    console.log('\n📜 检查script数据...')
    const scriptInfo = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'))
      const info = {
        totalScripts: scripts.length,
        hasWindowData: false,
        dataTypes: []
      }
      
      for (const script of scripts) {
        const content = script.innerHTML
        if (content.includes('window.__INITIAL_STATE__')) {
          info.hasWindowData = true
          info.dataTypes.push('__INITIAL_STATE__')
        }
        if (content.includes('window.__playinfo__')) {
          info.dataTypes.push('__playinfo__')
        }
        if (content.includes('window.__NEXT_DATA__')) {
          info.dataTypes.push('__NEXT_DATA__')
        }
      }
      
      return info
    })
    console.log('Script信息:', scriptInfo)
    
    const duration = Date.now() - startTime
    console.log(`\n✅ 调试完成! 总耗时: ${duration}ms`)
    
  } catch (error) {
    console.log('\n❌ 调试失败!')
    console.log(`🚫 错误: ${error.message}`)
  } finally {
    if (page) await page.close()
    if (browser) await browser.close()
  }
}

// 运行调试
const testUrl = process.argv[2]
debugBilibiliHTML(testUrl).catch(console.error)