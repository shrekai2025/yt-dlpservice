/**
 * Grok 服务实现
 * 使用 OpenAI 兼容 API (通过 Badger 或其他代理)
 */

import { BaseAIService } from '../base/ai-service.interface'
import type { GenerateTextOptions } from '../base/ai-service.interface'
import type { AIConfig, ChatMessage, ChatResponse } from '../base/ai-types'

interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export class GrokService extends BaseAIService {
  private apiKey: string
  private model: string
  private baseURL: string

  constructor(config: AIConfig) {
    super()
    this.apiKey = config.apiKey
    this.model = config.model || 'grok-2-latest'
    // Grok需要通过代理访问，baseURL必须配置
    if (!config.baseURL) {
      throw new Error('Grok 服务需要配置 baseURL（如通过 Badger 代理）')
    }
    this.baseURL = config.baseURL
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
      throw new Error(`Grok API 错误: ${response.status} ${errorText}`)
    }

    const data = (await response.json()) as any
    const content = data?.choices?.[0]?.message?.content || ''

    if (!content) {
      throw new Error('Grok 返回内容为空')
    }

    return { content }
  }

  getProviderName(): string {
    return 'Grok (xAI)'
  }

  getSupportedModels(): string[] {
    return ['grok-4', 'grok-2-latest', 'grok-2-mini']
  }
}
