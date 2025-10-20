/**
 * Gemini 服务实现
 * 支持 Google Gemini API（含 Google Search Grounding联网搜索）
 */

import { BaseAIService } from '../base/ai-service.interface'
import type { GenerateTextOptions } from '../base/ai-service.interface'
import type { AIConfig, ChatMessage, ChatResponse } from '../base/ai-types'

interface GeminiMessage {
  role: 'user' | 'model'
  parts: Array<{ text: string }>
}

interface GeminiGenerateRequest {
  contents: GeminiMessage[]
  generationConfig?: Record<string, unknown>
  tools?: Array<Record<string, unknown>>
}

export class GeminiService extends BaseAIService {
  private apiKey: string
  private model: string
  private baseURL: string

  constructor(config: AIConfig) {
    super()
    this.apiKey = config.apiKey
    this.model = config.model || 'gemini-2.5-pro'
    this.baseURL =
      config.baseURL || 'https://generativelanguage.googleapis.com/v1beta'
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
    // 转换消息格式：user/assistant/system -> user/model
    const contents: GeminiMessage[] = messages
      .filter((msg) => msg.role !== 'system')
      .map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      }))

    const generationConfig: Record<string, unknown> = {
      temperature: 0.7,
      maxOutputTokens: 4096,
    }

    // 系统提示词处理
    if (options?.systemInstruction) {
      generationConfig.systemInstruction = options.systemInstruction
    }

    const requestBody: GeminiGenerateRequest = {
      contents,
      generationConfig,
      // 联网搜索工具（仅Gemini支持）
      tools: options?.enableWebSearch ? [{ googleSearch: {} }] : undefined,
    }

    const response = await this.generateContent(requestBody)

    // 提取元数据（包括联网搜索结果）
    const metadata = (response as any)?.candidates?.[0]?.groundingMetadata

    if (metadata && options?.onMetadata) {
      options.onMetadata(metadata as Record<string, unknown>)
    }

    const content = this.extractText(response)
    if (!content) {
      throw new Error('Gemini 返回内容为空')
    }

    return {
      content,
      metadata: metadata as Record<string, unknown> | undefined,
    }
  }

  private async generateContent(
    body: GeminiGenerateRequest
  ): Promise<Record<string, unknown>> {
    const base = this.baseURL.endsWith('/models')
      ? this.baseURL
      : `${this.baseURL}/models`
    const endpoint = `${base}/${this.model}:generateContent?key=${this.apiKey}`

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...body,
        model: this.model,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Gemini API 错误: ${response.status} ${errorText}`)
    }

    return (await response.json()) as Record<string, unknown>
  }

  private extractText(response: Record<string, unknown>): string {
    const candidate = (response?.candidates as any)?.[0]
    if (!candidate) return ''
    const parts = candidate?.content?.parts
    if (!Array.isArray(parts)) return ''
    return parts
      .map((part: any) => (typeof part?.text === 'string' ? part.text : ''))
      .join('')
      .trim()
  }

  getProviderName(): string {
    return 'Google Gemini'
  }

  getSupportedModels(): string[] {
    return [
      'gemini-2.5-pro',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.0-flash',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
    ]
  }
}
