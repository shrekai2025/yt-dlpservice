import { env } from '~/env.js'
import { NextRequest } from 'next/server'

export interface AuthResult {
  success: boolean
  error?: string
}

/**
 * 验证外部API Key
 * 支持两种认证方式：
 * 1. X-API-Key: your-api-key
 * 2. Authorization: Bearer your-api-key
 */
export function validateExternalApiKey(request: NextRequest): AuthResult {
  try {
    // 从环境变量获取配置的API Key
    const configuredApiKey = process.env.TEXTGET_API_KEY
    if (!configuredApiKey) {
      return {
        success: false,
        error: 'External API not configured'
      }
    }

    // 方式1: X-API-Key 请求头
    const xApiKey = request.headers.get('x-api-key') || request.headers.get('X-API-Key')
    if (xApiKey && xApiKey === configuredApiKey) {
      return { success: true }
    }

    // 方式2: Authorization Bearer 请求头
    const authorization = request.headers.get('authorization') || request.headers.get('Authorization')
    if (authorization) {
      const bearerMatch = authorization.match(/^Bearer\s+(.+)$/)
      if (bearerMatch && bearerMatch[1] === configuredApiKey) {
        return { success: true }
      }
    }

    return {
      success: false,
      error: 'Invalid API key'
    }
  } catch (error) {
    return {
      success: false,
      error: 'Authentication error'
    }
  }
}

/**
 * 创建统一的错误响应
 */
export function createAuthErrorResponse(error: string, status: number = 401) {
  return new Response(
    JSON.stringify({
      success: false,
      error,
      message: 'Authentication failed'
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  )
} 