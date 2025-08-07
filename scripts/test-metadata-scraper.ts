#!/usr/bin/env tsx

import { metadataScraperService } from '../src/lib/services/metadata-scraper'
import { initializeScrapers } from '../src/lib/services/metadata-scraper/scrapers'
import { Logger } from '../src/lib/utils/logger'

/**
 * 独立测试元数据爬虫的脚本
 * 使用方法：npm run test:scraper [URL]
 */

// 测试用的URL示例
const TEST_URLS = {
  youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  bilibili: 'https://www.bilibili.com/video/BV1GJ411x7h7',
  xiaoyuzhou: 'https://www.xiaoyuzhoufm.com/episode/5e280fab418a84a046628f51'
}

async function testMetadataScraper(url?: string) {
  console.log('🕷️ 元数据爬虫测试工具\n')
  
  try {
    // 初始化爬虫服务
    console.log('🔧 初始化爬虫服务...')
    initializeScrapers()
    console.log('✅ 爬虫服务初始化完成\n')
    
    // 确定要测试的URL
    let testUrl = url
    if (!testUrl) {
      console.log('📋 可用的测试URL:')
      Object.entries(TEST_URLS).forEach(([platform, url]) => {
        console.log(`  ${platform}: ${url}`)
      })
      console.log('\n🎯 将测试所有平台...\n')
      
      // 测试所有平台
      for (const [platform, platformUrl] of Object.entries(TEST_URLS)) {
        await testSingleUrl(platform, platformUrl)
      }
    } else {
      // 测试单个URL
      const platform = detectPlatform(testUrl)
      await testSingleUrl(platform, testUrl)
    }
    
  } catch (error: any) {
    console.error('❌ 测试失败:', error.message)
    process.exit(1)
  }
}

async function testSingleUrl(platform: string, url: string) {
  console.log(`🔍 测试 ${platform.toUpperCase()} 平台`)
  console.log(`📍 URL: ${url}`)
  console.log('⏳ 爬取中...\n')
  
  const startTime = Date.now()
  
  try {
    const result = await metadataScraperService.scrapeMetadata(url, {
      timeout: 30000, // 30秒超时（测试用，比正常的120秒短）
      waitTime: 10000, // 10秒等待时间（测试用，比正常的30秒短）
      maxTopLevelComments: 5, // 测试时只取5条评论
      maxTotalComments: 10  // 测试时总共10条评论
    })
    
    const duration = Date.now() - startTime
    
    if (result.success && result.data) {
      console.log('✅ 爬取成功!')
      console.log(`⏱️  耗时: ${duration}ms`)
      console.log('📊 获取到的数据:')
      console.log(JSON.stringify(result.data, null, 2))
      console.log(`💬 评论数量: ${result.data.comments?.length || 0}`)
    } else {
      console.log('❌ 爬取失败!')
      console.log(`⏱️  耗时: ${duration}ms`)
      console.log(`🚫 错误: ${result.error}`)
    }
    
  } catch (error: any) {
    const duration = Date.now() - startTime
    console.log('💥 爬取异常!')
    console.log(`⏱️  耗时: ${duration}ms`)
    console.log(`🚫 异常: ${error.message}`)
  }
  
  console.log('\n' + '='.repeat(60) + '\n')
}

function detectPlatform(url: string): string {
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return 'youtube'
  } else if (url.includes('bilibili.com')) {
    return 'bilibili'
  } else if (url.includes('xiaoyuzhoufm.com')) {
    return 'xiaoyuzhou'
  } else {
    return 'unknown'
  }
}

// 主函数
async function main() {
  const url = process.argv[2]
  await testMetadataScraper(url)
}

// 只在直接执行时运行
if (require.main === module) {
  main().catch(console.error)
}

export { testMetadataScraper }