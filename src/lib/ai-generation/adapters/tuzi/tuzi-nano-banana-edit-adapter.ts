/**
 * TuziNanoBananaEditAdapter - TuZi Nano Banana Image Generation
 *
 * 对应模型: tuzi-ai-nano-banana-edit
 * 功能: 图片生成（Chat Completions 格式，支持图生图）
 * 端点: /v1/chat/completions
 * 模型名称: gemini-2.5-flash-image
 */

import { BaseAdapter } from '../base-adapter'
import type {
  GenerationRequest,
  GenerationResult,
  AdapterResponse,
} from '../types'
import axios from 'axios'

interface ChatMessage {
  role: string
  content: Array<{
    type: string
    text?: string
    image_url?: {
      url: string
    }
  }>
}

interface ChatCompletionRequest {
  model: string
  stream: boolean
  messages: ChatMessage[]
}

interface ChatCompletionResponse {
  id?: string
  object?: string
  created?: number
  model?: string
  choices?: Array<{
    index: number
    message?: {
      role: string
      content: string
    }
    finish_reason?: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export class TuziNanoBananaEditAdapter extends BaseAdapter {
  protected getAuthHeaders(apiKey: string): Record<string, string> {
    return {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }
  }

  /**
   * 从响应文本中提取图片 URL
   * 响应格式通常是 Markdown 或包含图片链接的文本
   */
  private extractImageUrls(text: string): string[] {
    const urls: string[] = []

    // 匹配 Markdown 图片格式: ![alt](url)
    const markdownPattern = /!\[.*?\]\((https?:\/\/[^\s)]+)\)/g
    let match = markdownPattern.exec(text)
    while (match) {
      urls.push(match[1]!)
      match = markdownPattern.exec(text)
    }

    // 匹配纯 URL
    if (urls.length === 0) {
      const urlPattern = /(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|webp|gif))/gi
      match = urlPattern.exec(text)
      while (match) {
        urls.push(match[1]!)
        match = urlPattern.exec(text)
      }
    }

    return urls
  }

  /**
   * 调度生成请求
   */
  async dispatch(request: GenerationRequest): Promise<AdapterResponse> {
    try {
      const apiKey = this.getApiKey()
      const apiEndpoint = this.getApiEndpoint()

      this.log('info', 'TuZi API Configuration', {
        hasApiKey: !!apiKey,
        apiEndpoint,
        providerSlug: this.config.provider.slug,
      })

      if (!apiKey) {
        return {
          status: 'ERROR',
          message: 'Missing API key for TuZi',
          error: {
            code: 'MISSING_API_KEY',
            message: 'API key is required',
            isRetryable: false,
          },
        }
      }

      if (!apiEndpoint) {
        return {
          status: 'ERROR',
          message: 'Missing API endpoint for TuZi provider. Please configure it in the database.',
          error: {
            code: 'MISSING_API_ENDPOINT',
            message: 'API endpoint is not configured in database',
            isRetryable: false,
          },
        }
      }

      // 从参数中获取模型名称（默认 gemini-2.5-flash-image）
      const parameters = request.parameters || {}
      const model = (parameters.model as string) || 'gemini-2.5-flash-image'
      const stream = (parameters.stream as boolean) || false

      // 构建消息内容
      const content: Array<{
        type: string
        text?: string
        image_url?: { url: string }
      }> = []

      // 添加文本提示词
      if (request.prompt) {
        content.push({
          type: 'text',
          text: request.prompt,
        })
      }

      // 添加输入图片（可选）
      if (request.inputImages && request.inputImages.length > 0) {
        for (const imageUrl of request.inputImages) {
          content.push({
            type: 'image_url',
            image_url: {
              url: imageUrl,
            },
          })
        }
      }

      // 构建请求
      const payload: ChatCompletionRequest = {
        model,
        stream,
        messages: [
          {
            role: 'user',
            content,
          },
        ],
      }

      this.log('info', 'Creating TuZi Nano Banana task', {
        model,
        stream,
        prompt: request.prompt?.substring(0, 100),
        imageCount: request.inputImages?.length || 0,
        hasImages: !!(request.inputImages && request.inputImages.length > 0),
      })

      // 发送请求
      const response = await this.httpClient.post<ChatCompletionResponse>(
        '/v1/chat/completions',
        payload,
        {
          headers: this.getAuthHeaders(apiKey),
          timeout: 120000, // 2分钟超时
        }
      )

      const { choices } = response.data

      if (!choices || choices.length === 0) {
        return {
          status: 'ERROR',
          message: 'No response from API',
          error: {
            code: 'NO_RESULTS',
            message: 'API returned empty results',
            isRetryable: true,
          },
        }
      }

      // 提取第一个选择的内容
      const messageContent = choices[0]?.message?.content
      if (!messageContent) {
        return {
          status: 'ERROR',
          message: 'No content in response',
          error: {
            code: 'NO_CONTENT',
            message: 'API returned no content',
            isRetryable: true,
          },
        }
      }

      // 从响应中提取图片 URL
      const imageUrls = this.extractImageUrls(messageContent)

      if (imageUrls.length === 0) {
        this.log('warn', 'No image URLs found in response', { content: messageContent })
        return {
          status: 'ERROR',
          message: 'No image URLs found in response',
          error: {
            code: 'NO_IMAGE_URLS',
            message: `Response content: ${messageContent.substring(0, 200)}`,
            isRetryable: false,
          },
        }
      }

      // 转换结果
      const results: GenerationResult[] = imageUrls.map((url) => ({
        type: 'image',
        url,
      }))

      this.log('info', `Task completed successfully with ${results.length} images`)

      return {
        status: 'SUCCESS',
        results,
        message: 'Image generation completed',
      }
    } catch (error: unknown) {
      this.log('error', 'TuZi Nano Banana dispatch failed', error)

      // 处理速率限制错误
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        return {
          status: 'ERROR',
          message: '请求过于频繁，已达到速率限制。请稍后再试。',
          error: {
            code: 'RATE_LIMIT',
            message: 'Rate limit exceeded',
            isRetryable: true,
          },
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
   * Nano Banana 是同步 API，不需要检查任务状态
   */
  async checkTaskStatus(_taskId: string): Promise<AdapterResponse> {
    return {
      status: 'ERROR',
      message: 'This adapter does not support async polling',
      error: {
        code: 'NOT_SUPPORTED',
        message: 'Nano Banana is a synchronous API',
        isRetryable: false,
      },
    }
  }
}
