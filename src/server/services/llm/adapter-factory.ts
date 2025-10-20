/**
 * LLM Adapter Factory
 * 根据 endpoint type 创建对应的适配器
 */

import type { LLMAdapter } from './base-adapter'
import { OpenAIAdapter } from './openai-adapter'
import { ClaudeAdapter } from './claude-adapter'

export class LLMAdapterFactory {
  static createAdapter(endpointType: string): LLMAdapter {
    switch (endpointType) {
      case 'openai':
        return new OpenAIAdapter()

      case 'claude':
        return new ClaudeAdapter()

      default:
        throw new Error(`不支持的 endpoint 类型: ${endpointType}`)
    }
  }
}
