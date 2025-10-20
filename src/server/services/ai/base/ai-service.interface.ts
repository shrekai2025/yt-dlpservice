/**
 * AI服务基础接口（对话功能专用）
 * 所有AI供应商服务必须实现此接口
 */

import type { ChatMessage, ChatResponse, GenerateTextOptions } from './ai-types'

export abstract class BaseAIService {
  /**
   * 验证API配置是否有效
   */
  abstract validateConfig(): Promise<boolean>

  /**
   * 生成对话回复
   */
  abstract generateChatResponse(
    messages: ChatMessage[],
    options?: GenerateTextOptions
  ): Promise<ChatResponse>

  /**
   * 获取供应商名称
   */
  abstract getProviderName(): string

  /**
   * 获取支持的模型列表
   */
  abstract getSupportedModels(): string[]
}

export type { GenerateTextOptions }
