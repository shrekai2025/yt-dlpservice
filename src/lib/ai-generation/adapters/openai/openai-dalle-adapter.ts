/**
 * OpenAIDalleAdapter - OpenAI DALL-E 3 Image Generation
 *
 * 对应模型: openai-dalle-3
 * 功能: 文生图（高质量）
 */

import { BaseAdapter } from '../base-adapter'
import type {
  GenerationRequest,
  GenerationResult,
  AdapterResponse,
} from '../types'

interface OpenAIImageResponse {
  created: number
  data: Array<{
    url?: string
    b64_json?: string
    revised_prompt?: string
  }>
}

interface OpenAIErrorResponse {
  error: {
    message: string
    type: string
    code: string | null
  }
}

export class OpenAIDalleAdapter extends BaseAdapter {
  protected getAuthHeaders(apiKey: string): Record<string, string> {
    return {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }
  }

  /**
   * 调度生成请求
   */
  async dispatch(request: GenerationRequest): Promise<AdapterResponse> {
    try {
      const apiKey = this.getApiKey()
      if (!apiKey) {
        return {
          status: 'ERROR',
          message: 'Missing API key for OpenAI',
          error: {
            code: 'MISSING_API_KEY',
            message: 'API key is required',
            isRetryable: false,
          },
        }
      }

      // 构建请求参数
      const payload: Record<string, unknown> = {
        model: 'dall-e-3',
        prompt: request.prompt,
        n: Math.min(request.numberOfOutputs || 1, 1), // DALL-E 3 only supports n=1
      }

      // 可选参数
      if (request.parameters?.size) {
        // DALL-E 3 supports: 1024x1024, 1024x1792, 1792x1024
        payload.size = this.mapSizeToDalleFormat(request.parameters.size as string)
      } else {
        payload.size = '1024x1024'
      }

      if (request.parameters?.quality) {
        // standard or hd
        payload.quality = request.parameters.quality
      }

      if (request.parameters?.style) {
        // vivid or natural
        payload.style = request.parameters.style
      }

      // Response format: url (default) or b64_json
      payload.response_format = request.parameters?.response_format || 'url'

      this.log('info', 'Creating OpenAI DALL-E 3 image', payload)

      // 调用OpenAI API
      const response = await this.httpClient.post<OpenAIImageResponse | OpenAIErrorResponse>(
        '/v1/images/generations',
        payload,
        {
          baseURL: this.getApiEndpoint() || 'https://api.openai.com',
        }
      )

      const data = response.data

      // 检查错误
      if ('error' in data) {
        return {
          status: 'ERROR',
          message: data.error.message,
          error: {
            code: data.error.code || data.error.type,
            message: data.error.message,
            isRetryable: data.error.type === 'server_error',
          },
        }
      }

      // 处理成功响应
      if (data.data && data.data.length > 0) {
        const results: GenerationResult[] = data.data.map((item) => ({
          type: 'image',
          url: item.url || `data:image/png;base64,${item.b64_json}`,
          metadata: {
            revised_prompt: item.revised_prompt,
          },
        }))

        this.log('info', `DALL-E 3 generation completed: ${results.length} images`)

        return {
          status: 'SUCCESS',
          results,
          message: 'Generation completed',
        }
      }

      return {
        status: 'ERROR',
        message: 'No images generated',
        error: {
          code: 'NO_RESULTS',
          message: 'API returned no images',
          isRetryable: false,
        },
      }
    } catch (error: unknown) {
      this.log('error', 'OpenAI DALL-E 3 dispatch failed', error)

      // 处理axios错误
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: OpenAIErrorResponse } }
        if (axiosError.response?.data && 'error' in axiosError.response.data) {
          return {
            status: 'ERROR',
            message: axiosError.response.data.error.message,
            error: {
              code: axiosError.response.data.error.code || axiosError.response.data.error.type,
              message: axiosError.response.data.error.message,
              isRetryable: axiosError.response.data.error.type === 'server_error',
            },
          }
        }
      }

      return {
        status: 'ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: {
          code: 'DISPATCH_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          isRetryable: true,
        },
      }
    }
  }

  /**
   * 映射尺寸到DALL-E 3支持的格式
   * DALL-E 3 supports: 1024x1024, 1024x1792, 1792x1024
   */
  private mapSizeToDalleFormat(userInput: string): string {
    // 直接匹配
    const validSizes = ['1024x1024', '1024x1792', '1792x1024']
    if (validSizes.includes(userInput)) {
      return userInput
    }

    // 解析比例
    if (userInput.includes(':')) {
      const [w, h] = userInput.split(':').map(Number)
      if (w && h) {
        const ratio = w / h
        if (ratio > 1.5) {
          return '1792x1024' // 横向
        } else if (ratio < 0.7) {
          return '1024x1792' // 纵向
        } else {
          return '1024x1024' // 正方形
        }
      }
    }

    // 解析像素尺寸
    if (userInput.includes('x') || userInput.includes('X')) {
      const [w, h] = userInput.toLowerCase().split('x').map(Number)
      if (w && h) {
        const ratio = w / h
        if (ratio > 1.5) {
          return '1792x1024' // 横向
        } else if (ratio < 0.7) {
          return '1024x1792' // 纵向
        } else {
          return '1024x1024' // 正方形
        }
      }
    }

    // 默认正方形
    return '1024x1024'
  }
}

