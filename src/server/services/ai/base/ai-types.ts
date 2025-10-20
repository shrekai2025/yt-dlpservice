/**
 * AI服务通用类型定义（对话功能专用）
 */

export type AIProvider = 'gemini' | 'deepseek' | 'grok' | 'tuzi'

export interface AIConfig {
  apiKey: string
  provider: AIProvider
  model: string
  baseURL?: string
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface GenerateTextOptions {
  systemInstruction?: string
  enableWebSearch?: boolean
  onMetadata?: (metadata: Record<string, unknown>) => void
}

export interface ChatResponse {
  content: string
  metadata?: Record<string, unknown>
}
