/**
 * AI 服务工厂
 * 根据配置创建对应的AI服务实例
 */

import { BaseAIService } from './base/ai-service.interface'
import type { AIConfig, AIProvider } from './base/ai-types'
import { GeminiService } from './providers/gemini-service'
import { DeepSeekService } from './providers/deepseek-service'
import { GrokService } from './providers/grok-service'
import { TuziService } from './providers/tuzi-service'

export class AIServiceFactory {
  /**
   * 创建AI服务实例
   */
  static createService(config: AIConfig): BaseAIService {
    switch (config.provider) {
      case 'gemini':
        return new GeminiService(config)

      case 'deepseek':
        return new DeepSeekService(config)

      case 'grok':
        return new GrokService(config)

      default:
        throw new Error(`不支持的AI供应商: ${config.provider}`)
    }
  }

  /**
   * 获取所有支持的供应商
   */
  static getSupportedProviders(): AIProvider[] {
    return ['gemini', 'deepseek', 'grok']
  }

  /**
   * 获取供应商的默认模型
   */
  static getDefaultModel(provider: AIProvider): string {
    switch (provider) {
      case 'gemini':
        return 'gemini-2.5-pro'
      case 'deepseek':
        return 'deepseek-chat'
      case 'grok':
        return 'grok-2-latest'
      default:
        throw new Error(`不支持的AI供应商: ${provider}`)
    }
  }

  /**
   * 获取供应商支持的模型列表
   */
  static getSupportedModels(provider: AIProvider): string[] {
    switch (provider) {
      case 'gemini':
        return [
          'gemini-2.5-pro',
          'gemini-2.5-flash',
          'gemini-2.5-flash-lite',
          'gemini-2.0-flash',
          'gemini-1.5-pro',
          'gemini-1.5-flash',
        ]
      case 'deepseek':
        return ['deepseek-chat', 'deepseek-coder']
      case 'grok':
        return ['grok-4', 'grok-2-latest', 'grok-2-mini']
      default:
        return []
    }
  }

  /**
   * 检查供应商是否支持联网搜索
   */
  static supportsWebSearch(provider: AIProvider): boolean {
    return provider === 'gemini'
  }
}
