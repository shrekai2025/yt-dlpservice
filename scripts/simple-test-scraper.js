#!/usr/bin/env node

// 简化的测试脚本，不依赖环境变量
import puppeteer from 'puppeteer'

const TEST_URLS = {
  youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  bilibili: 'https://www.bilibili.com/video/BV1GJ411x7h7',
  xiaoyuzhou: 'https://www.xiaoyuzhoufm.com/episode/5e280fab418a84a046628f51'
}

async function testScraper(url) {
  const targetUrl = url || TEST_URLS.youtube
  
  console.log('🕷️ 简化版元数据爬虫测试')
  console.log(`📍 测试URL: ${targetUrl}`)
  console.log('⏳ 启动浏览器...\n')
  
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
    await page.goto(targetUrl, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    })
    
    console.log('⏰ 等待页面加载...')
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    // 提取基本信息
    console.log('📊 提取页面数据...')
    const data = await page.evaluate(() => {
      const title = document.querySelector('title')?.textContent || 'Unknown'
      const h1 = document.querySelector('h1')?.textContent || 'No H1'
      
      return {
        title: title.trim(),
        h1: h1.trim(),
        url: window.location.href,
        userAgent: navigator.userAgent
      }
    })
    
    const duration = Date.now() - startTime
    
    console.log('\n✅ 测试完成!')
    console.log(`⏱️  总耗时: ${duration}ms`)
    console.log('📋 提取的数据:')
    console.log(JSON.stringify(data, null, 2))
    
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
testScraper(testUrl).catch(console.error)