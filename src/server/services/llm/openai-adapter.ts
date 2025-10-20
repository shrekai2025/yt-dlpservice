/**
 * OpenAI API Adapter
 * 支持 OpenAI Chat Completions API 格式
 */

import type { LLMAdapter, Message, LLMResponse } from './base-adapter'

export class OpenAIAdapter implements LLMAdapter {
  async sendMessage(params: {
    apiUrl: string
    apiKey: string
    model: string
    messages: Message[]
    systemInstruction?: string
    temperature?: number
  }): Promise<LLMResponse> {
    const { apiUrl, apiKey, model, messages, systemInstruction, temperature = 0.7 } = params

    // 构建消息数组
    const apiMessages: Array<{ role: string; content: string }> = []

    // 添加系统指令
    if (systemInstruction) {
      apiMessages.push({
        role: 'system',
        content: systemInstruction,
      })
    }

    // 添加消息
    apiMessages.push(...messages)

    // 调用 OpenAI API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: apiMessages,
        temperature,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenAI API 错误 (${response.status}): ${errorText}`)
    }

    const data = (await response.json()) as {
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

    return {
      content: data.choices[0]?.message?.content || '',
      usage: data.usage,
    }
  }
}
