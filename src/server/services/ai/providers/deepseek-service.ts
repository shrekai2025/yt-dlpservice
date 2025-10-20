/**
 * DeepSeek 服务实现
 * 使用 OpenAI 兼容 API
 */

import { BaseAIService } from '../base/ai-service.interface'
import type { GenerateTextOptions } from '../base/ai-service.interface'
import type { AIConfig, ChatMessage, ChatResponse } from '../base/ai-types'

interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export class DeepSeekService extends BaseAIService {
  private apiKey: string
  private model: string
  private baseURL: string

  constructor(config: AIConfig) {
    super()
    this.apiKey = config.apiKey
    this.model = config.model || 'deepseek-chat'
    this.baseURL = config.baseURL || 'https://api.deepseek.com/v1'
  }

  async validateConfig(): Promise<boolean> {
    try {
      const response = await this.generateChatResponse([
        { role: 'user', content: 'test' },
      ])
      return !!response.content
    } catch {
      return false
    }
  }

  async generateChatResponse(
    messages: ChatMessage[],
    options?: GenerateTextOptions
  ): Promise<ChatResponse> {
    const openaiMessages: OpenAIMessage[] = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }))

    // 添加系统提示词
    if (options?.systemInstruction) {
      openaiMessages.unshift({
        role: 'system',
        content: options.systemInstruction,
      })
    }

    const endpoint = `${this.baseURL}/chat/completions`

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: openaiMessages,
        temperature: 0.7,
        max_tokens: 4096,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`DeepSeek API 错误: ${response.status} ${errorText}`)
    }

    const data = (await response.json()) as any
    const content = data?.choices?.[0]?.message?.content || ''

    if (!content) {
      throw new Error('DeepSeek 返回内容为空')
    }

    return { content }
  }

  getProviderName(): string {
    return 'DeepSeek'
  }

  getSupportedModels(): string[] {
    return ['deepseek-chat', 'deepseek-coder']
  }
}
