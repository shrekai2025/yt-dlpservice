/**
 * AI 配置加载器
 * 从数据库LLMProvider表或环境变量加载配置
 */

import { db } from '~/server/db'
import type { AIConfig, AIProvider } from './base/ai-types'

export class AIConfigLoader {
  /**
   * 加载供应商配置
   */
  static async loadProviderConfig(
    provider: AIProvider,
    model?: string
  ): Promise<AIConfig> {
    // 1. 从数据库LLMProvider表读取
    const dbConfig = await db.lLMProvider.findUnique({
      where: { slug: provider },
    })

    // 2. 从环境变量读取（优先级更高）
    const envApiKey = process.env[`LLM_PROVIDER_${provider.toUpperCase().replace(/-/g, '_')}_API_KEY`]
    const envBaseURL = process.env[`LLM_PROVIDER_${provider.toUpperCase().replace(/-/g, '_')}_BASE_URL`]

    const apiKey = envApiKey || dbConfig?.apiKey || ''

    if (!apiKey) {
      throw new Error(`供应商 ${provider} 未配置 API Key`)
    }

    return {
      apiKey,
      provider,
      model: model || this.getDefaultModel(provider),
      baseURL: envBaseURL,
    }
  }

  /**
   * 获取默认模型（简化版，实际从factory获取）
   */
  private static getDefaultModel(provider: AIProvider): string {
    switch (provider) {
      case 'gemini':
        return 'gemini-2.5-pro'
      case 'deepseek':
        return 'deepseek-chat'
      case 'grok':
        return 'grok-2-latest'
      default:
        return ''
    }
  }

  /**
   * 检查供应商是否已配置
   */
  static async isProviderConfigured(provider: AIProvider): Promise<boolean> {
    try {
      await this.loadProviderConfig(provider)
      return true
    } catch {
      return false
    }
  }
}
