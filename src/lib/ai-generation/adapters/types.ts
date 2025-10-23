/**
 * AI Generation Adapters - Type Definitions
 *
 * 统一的类型定义，用于所有适配器
 */

// ============================================
// 模型配置
// ============================================

export interface ModelConfig {
  id: string
  slug: string
  name: string
  provider: {
    id: string
    slug: string
    name: string
    apiKey?: string         // 单一密钥（适用于大多数供应商）
    apiKeyId?: string       // 多密钥方案的ID部分（如火山引擎AccessKeyID）
    apiKeySecret?: string   // 多密钥方案的Secret部分（如火山引擎SecretAccessKey）
    apiEndpoint?: string
  }
  outputType: 'IMAGE' | 'VIDEO' | 'AUDIO'
  adapterName: string
}

// ============================================
// 生成请求
// ============================================

export interface GenerationRequest {
  prompt: string
  inputImages?: string[]
  numberOfOutputs?: number
  parameters?: Record<string, unknown>
}

// ============================================
// 生成结果
// ============================================

export interface GenerationResult {
  type: 'image' | 'video' | 'audio'
  url: string
  metadata?: Record<string, unknown>
}

// ============================================
// 适配器响应
// ============================================

export interface AdapterResponse {
  status: 'SUCCESS' | 'PROCESSING' | 'ERROR'
  results?: GenerationResult[]
  message?: string
  providerTaskId?: string // 供应商的任务ID（用于异步轮询）
  progress?: number       // 0-1
  error?: {
    code: string
    message: string
    isRetryable: boolean
    details?: unknown
  }
}

// ============================================
// HTTP Client 配置
// ============================================

export interface HttpClientConfig {
  headers?: Record<string, string>
  timeout?: number
}
