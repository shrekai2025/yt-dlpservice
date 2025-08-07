import { NextRequest, NextResponse } from 'next/server'
import { youtubeCookieManager } from '~/lib/services/youtube-cookie-manager'

/**
 * 管理员API：手动刷新YouTube cookies
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[AdminAPI] 收到手动刷新YouTube cookies请求')
    
    // 强制刷新cookies
    await youtubeCookieManager.forceRefresh()
    
    // 验证cookies是否有效
    const isValid = await youtubeCookieManager.validateCookies()
    
    const response = {
      success: true,
      message: 'YouTube cookies已成功刷新',
      cookiesValid: isValid,
      timestamp: new Date().toISOString()
    }
    
    console.log('[AdminAPI] YouTube cookies刷新完成:', response)
    
    return NextResponse.json(response)
    
  } catch (error: any) {
    console.error('[AdminAPI] 刷新YouTube cookies失败:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || '刷新YouTube cookies失败',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

/**
 * 管理员API：获取YouTube cookies状态
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[AdminAPI] 收到获取YouTube cookies状态请求')
    
    // 检查cookies是否有效
    const isValid = await youtubeCookieManager.validateCookies()
    const cookiePath = await youtubeCookieManager.getValidCookies()
    
    const response = {
      success: true,
      cookiesValid: isValid,
      cookieFileExists: !!cookiePath,
      cookiePath: cookiePath || null,
      timestamp: new Date().toISOString()
    }
    
    console.log('[AdminAPI] YouTube cookies状态查询完成:', response)
    
    return NextResponse.json(response)
    
  } catch (error: any) {
    console.error('[AdminAPI] 获取YouTube cookies状态失败:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || '获取YouTube cookies状态失败',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}