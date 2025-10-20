/**
 * Claude API Adapter
 * 支持 Claude Messages API 格式
 */

import type { LLMAdapter, Message, LLMResponse } from './base-adapter'

export class ClaudeAdapter implements LLMAdapter {
  async sendMessage(params: {
    apiUrl: string
    apiKey: string
    model: string
    messages: Message[]
    systemInstruction?: string
    temperature?: number
  }): Promise<LLMResponse> {
    const { apiUrl, apiKey, model, messages, systemInstruction, temperature = 0.7 } = params

    // Claude API 格式：system 是独立字段，messages 中只有 user/assistant
    const apiMessages = messages
      .filter((msg) => msg.role !== 'system')
      .map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))

    // 调用 Claude API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'anthropic-version': '2023-06-01', // Claude API 需要版本头
      },
      body: JSON.stringify({
        model,
        messages: apiMessages,
        system: systemInstruction,
        max_tokens: 4096,
        temperature,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Claude API 错误 (${response.status}): ${errorText}`)
    }

    const data = (await response.json()) as {
      content: Array<{
        type: string
        text: string
      }>
      usage?: {
        input_tokens: number
        output_tokens: number
      }
    }

    // 提取文本内容
    const content = data.content.find((c) => c.type === 'text')?.text || ''

    // 转换 usage 格式
    const usage = data.usage
      ? {
          prompt_tokens: data.usage.input_tokens,
          completion_tokens: data.usage.output_tokens,
          total_tokens: data.usage.input_tokens + data.usage.output_tokens,
        }
      : undefined

    return {
      content,
      usage,
    }
  }
}
