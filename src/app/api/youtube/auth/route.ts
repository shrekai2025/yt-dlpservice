import { NextRequest, NextResponse } from 'next/server'
import { youtubeAuthService } from '~/lib/services/youtube-auth'
import { Logger } from '~/lib/utils/logger'

/**
 * GET: 获取YouTube认证状态和Cookie设置指南
 */
export async function GET() {
  try {
    const hasCookies = await youtubeAuthService.hasCookies()
    const cookieFilePath = youtubeAuthService.getCookieFilePath()
    const guide = youtubeAuthService.generateCookieGuide()
    
    return NextResponse.json({
      success: true,
      data: {
        authenticated: hasCookies,
        cookieFilePath,
        guide
      }
    })
  } catch (error: any) {
    Logger.error(`获取YouTube认证状态失败: ${error.message}`)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

/**
 * POST: 设置YouTube Cookie
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cookies } = body
    
    if (cookies && typeof cookies === 'string') {
      const success = await youtubeAuthService.setCookiesManually(cookies)
      
      if (success) {
        return NextResponse.json({
          success: true,
          message: 'YouTube Cookie设置成功'
        })
      } else {
        return NextResponse.json({
          success: false,
          error: 'Cookie保存失败，请检查格式或文件权限'
        }, { status: 400 })
      }
    } else {
      return NextResponse.json({
        success: false,
        error: '请求体中缺少Cookie内容'
      }, { status: 400 })
    }
  } catch (error: any) {
    Logger.error(`设置YouTube Cookie失败: ${error.message}`)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

/**
 * DELETE: 清除YouTube Cookie
 */
export async function DELETE() {
  try {
    await youtubeAuthService.clearCookies()
    
    return NextResponse.json({
      success: true,
      message: 'YouTube Cookie已清除'
    })
  } catch (error: any) {
    Logger.error(`清除YouTube Cookie失败: ${error.message}`)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

/**
 * PUT: 测试YouTube Cookie有效性
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, testUrl } = body

    if (action === 'test') {
      // 测试Cookie有效性
      const { exec } = require('child_process')
      const { promisify } = require('util')
      const execAsync = promisify(exec)
      
      const url = testUrl || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      const hasCookies = await youtubeAuthService.hasCookies()
      
      if (!hasCookies) {
        return NextResponse.json({
          success: false,
          error: '未找到Cookie文件',
          message: '请先设置Cookie'
        })
      }

      const cookiePath = youtubeAuthService.getCookieFilePath()
      const command = `yt-dlp --no-warnings --dump-json --cookies "${cookiePath}" --quiet "${url}"`
      
      try {
        const { stdout } = await execAsync(command, { timeout: 30000 })
        const data = JSON.parse(stdout.trim())
        
        return NextResponse.json({
          success: true,
          message: '✅ Cookie测试成功',
          data: {
            title: data.title,
            duration: data.duration,
            viewCount: data.view_count,
            uploader: data.uploader
          }
        })
      } catch (error: any) {
        if (error.message.includes('Sign in to confirm')) {
          return NextResponse.json({
            success: false,
            error: 'Cookie无效或已过期',
            message: '❌ YouTube要求登录验证，请更新Cookie'
          })
        }
        
        return NextResponse.json({
          success: false,
          error: 'Cookie测试失败',
          message: `❌ 测试失败: ${error.message}`
        })
      }
    }

    return NextResponse.json({
      success: false,
      error: '未知操作'
    }, { status: 400 })
  } catch (error: any) {
    Logger.error(`测试YouTube Cookie失败: ${error.message}`)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}