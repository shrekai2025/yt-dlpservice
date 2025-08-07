#!/usr/bin/env node

import puppeteer from 'puppeteer'

async function debugBilibiliScraper(url = 'https://www.bilibili.com/video/BV1GJ411x7h7') {
  console.log('🔍 Bilibili爬虫调试工具')
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
    
    // 检查标题选择器
    console.log('🎯 检查标题选择器...')
    const titleSelectors = [
      '.video-info-title h1',
      '.video-title', 
      'h1[data-title]',
      'h1[title]',
      '.video-info-title-inner h1'
    ]
    
    for (const selector of titleSelectors) {
      const element = await page.$(selector)
      if (element) {
        const text = await page.evaluate(el => el.textContent?.trim(), element)
        const dataTitle = await page.evaluate(el => el.getAttribute('data-title'), element)
        console.log(`✅ ${selector}: "${text || dataTitle || 'Found'}"`)
      } else {
        console.log(`❌ ${selector}: Not found`)
      }
    }
    
    // 检查数据选择器
    console.log('\n📊 检查数据选择器...')
    const dataSelectors = {
      '播放量': ['.view-text', '.view .num', '.view-count'],
      '点赞数': ['.video-like-info', '.like-count'],
      '投币数': ['.video-coin-info', '.coin-count'],
      '分享数': ['.video-share-info-text', '.share-count'],
      '收藏数': ['.video-fav-info', '.favorite-count']
    }
    
    for (const [label, selectors] of Object.entries(dataSelectors)) {
      console.log(`\n${label}:`)
      for (const selector of selectors) {
        const element = await page.$(selector)
        if (element) {
          const text = await page.evaluate(el => el.textContent?.trim(), element)
          console.log(`  ✅ ${selector}: "${text}"`)
        } else {
          console.log(`  ❌ ${selector}: Not found`)
        }
      }
    }
    
    // 检查页面脚本数据
    console.log('\n📜 检查页面脚本数据...')
    const scriptData = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'))
      let hasInitialState = false
      let dataPreview = ''
      
      for (const script of scripts) {
        const content = script.innerHTML
        if (content.includes('window.__INITIAL_STATE__')) {
          hasInitialState = true
          dataPreview = content.substring(0, 200) + '...'
          break
        }
      }
      
      return {
        scriptCount: scripts.length,
        hasInitialState,
        dataPreview
      }
    })
    console.log('脚本数据:', scriptData)
    
    // 尝试提取实际数据
    console.log('\n🎯 尝试提取实际数据...')
    const extractedData = await page.evaluate(() => {
      // 标题
      const titleSelectors = [
        '.video-info-title h1',
        '.video-title', 
        'h1[data-title]',
        'h1[title]'
      ]
      
      let title = 'Not found'
      for (const selector of titleSelectors) {
        const el = document.querySelector(selector)
        if (el) {
          title = el.textContent?.trim() || el.getAttribute('data-title') || 'Found but no text'
          break
        }
      }
      
      // 数据
      const viewEl = document.querySelector('.view-text, .view .num, .view-count')
      const likeEl = document.querySelector('.video-like-info, .like-count')
      const coinEl = document.querySelector('.video-coin-info, .coin-count') 
      const shareEl = document.querySelector('.video-share-info-text, .share-count')
      const favEl = document.querySelector('.video-fav-info, .favorite-count')
      
      return {
        title,
        playCount: viewEl?.textContent?.trim() || 'Not found',
        likeCount: likeEl?.textContent?.trim() || 'Not found',
        coinCount: coinEl?.textContent?.trim() || 'Not found',
        shareCount: shareEl?.textContent?.trim() || 'Not found',
        favoriteCount: favEl?.textContent?.trim() || 'Not found'
      }
    })
    
    console.log('提取结果:', extractedData)
    
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
debugBilibiliScraper(testUrl).catch(console.error)