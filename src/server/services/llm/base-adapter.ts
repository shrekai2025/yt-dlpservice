/**
 * LLM Adapter Base Interface
 * 所有 LLM 适配器必须实现此接口
 */

export type Message = {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export type LLMResponse = {
  content: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface LLMAdapter {
  /**
   * 发送消息并获取回复
   */
  sendMessage(params: {
    apiUrl: string
    apiKey: string
    model: string
    messages: Message[]
    systemInstruction?: string
    temperature?: number
  }): Promise<LLMResponse>
}
