import { NextRequest, NextResponse } from 'next/server'
import { metadataScraperService } from '~/lib/services/metadata-scraper'
import { initializeScrapers } from '~/lib/services/metadata-scraper/scrapers'
import { Logger } from '~/lib/utils/logger'
import { z } from 'zod'

// 请求参数验证
const testRequestSchema = z.object({
  url: z.string().url('请提供有效的URL'),
  timeout: z.number().optional().default(120000),
  waitTime: z.number().optional().default(30000),
  maxTopLevelComments: z.number().optional().default(100),
  maxTotalComments: z.number().optional().default(300)
})

/**
 * POST /api/test/metadata-scraper
 * 测试元数据爬虫功能
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, timeout, waitTime, maxTopLevelComments, maxTotalComments } = testRequestSchema.parse(body)
    
    Logger.info(`🧪 测试元数据爬取: ${url}`)
    
    // 初始化爬虫服务（如果尚未初始化）
    try {
      initializeScrapers()
    } catch {
      // 忽略重复初始化错误
    }
    
    const startTime = Date.now()
    
    // 执行爬取
    const result = await metadataScraperService.scrapeMetadata(url, {
      timeout,
      waitTime,
      maxTopLevelComments,
      maxTotalComments
    })
    
    const duration = Date.now() - startTime
    
    // 返回结果
    return NextResponse.json({
      success: true,
      testInfo: {
        url,
        platform: detectPlatform(url),
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      },
      scraperResult: {
        success: result.success,
        data: result.data,
        error: result.error,
        commentCount: result.commentCount,
        duration: result.duration
      }
    })
    
  } catch (error: any) {
    Logger.error(`测试元数据爬取失败: ${error.message}`)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: '参数验证失败',
        details: error.errors
      }, { status: 400 })
    }
    
    return NextResponse.json({
      success: false,
      error: error.message || '未知错误'
    }, { status: 500 })
  }
}

/**
 * GET /api/test/metadata-scraper
 * 获取测试信息和示例URL
 */
export async function GET() {
  const testUrls = {
    youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    bilibili: 'https://www.bilibili.com/video/BV1GJ411x7h7',
    xiaoyuzhou: 'https://www.xiaoyuzhoufm.com/episode/5e280fab418a84a046628f51',
    applepodcasts: 'https://podcasts.apple.com/hk/podcast/a16z-podcast/id842818711?l=en-GB&i=1000725270034'
  }
  
  const supportedPlatforms = metadataScraperService.getSupportedPlatforms()
  
  return NextResponse.json({
    success: true,
    info: {
      description: '元数据爬虫测试接口',
      supportedPlatforms,
      testUrls,
      defaultOptions: {
        timeout: 120000,
        waitTime: 30000,
        maxTopLevelComments: 100,
        maxTotalComments: 300
      }
    },
    usage: {
      method: 'POST',
      endpoint: '/api/test/metadata-scraper',
      body: {
        url: 'string (required)',
        timeout: 'number (optional, default: 30000)',
        waitTime: 'number (optional, default: 10000)',
        maxTopLevelComments: 'number (optional, default: 5)',
        maxTotalComments: 'number (optional, default: 10)'
      }
    }
  })
}

function detectPlatform(url: string): string {
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return 'youtube'
  } else if (url.includes('bilibili.com')) {
    return 'bilibili'
  } else if (url.includes('xiaoyuzhoufm.com')) {
    return 'xiaoyuzhou'
  } else if (url.includes('podcasts.apple.com')) {
    return 'applepodcasts'
  } else {
    return 'unknown'
  }
}