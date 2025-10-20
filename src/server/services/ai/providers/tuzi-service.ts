/**
 * Tuzi AI Service
 * 兔子API - 提供多种语言模型服务
 */

import { BaseAIService } from '../base/ai-service.interface'
import type { AIConfig, ChatMessage, ChatResponse, GenerateTextOptions } from '../base/ai-types'

export class TuziService extends BaseAIService {
  protected config: AIConfig

  constructor(config: AIConfig) {
    super()
    this.config = {
      ...config,
      baseURL: config.baseURL || 'https://api.tu-zi.com/v1',
    }
  }

  async generateChatResponse(
    messages: ChatMessage[],
    options?: GenerateTextOptions
  ): Promise<ChatResponse> {
    const { systemInstruction, onMetadata } = options || {}

    // 构建消息数组
    const apiMessages: Array<{ role: string; content: string }> = []

    // 添加系统指令
    if (systemInstruction) {
      apiMessages.push({
        role: 'system',
        content: systemInstruction,
      })
    }

    // 添加对话消息
    apiMessages.push(...messages)

    try {
      const response = await fetch(`${this.config.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: apiMessages,
          temperature: 0.7,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Tuzi API 错误 (${response.status}): ${errorText}`)
      }

      const data = await response.json() as {
        choices: Array<{
          message: {
            content: string
          }
        }>
        usage?: {
          prompt_tokens: number
          completion_tokens: number
          total_tokens: number
        }
      }

      const content = data.choices[0]?.message?.content || ''

      // 提供元数据
      if (onMetadata && data.usage) {
        onMetadata({
          usage: data.usage,
          provider: 'tuzi',
          model: this.config.model,
        })
      }

      return {
        content,
        metadata: data.usage ? {
          usage: data.usage,
          provider: 'tuzi',
          model: this.config.model,
        } : undefined,
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Tuzi 请求失败: ${error.message}`)
      }
      throw error
    }
  }
}
