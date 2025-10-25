/**
 * Base Adapter Abstract Class
 *
 * 所有适配器的基类，提供通用功能
 */

import axios from 'axios'
import type { AxiosInstance } from 'axios'
import type {
  ModelConfig,
  GenerationRequest,
  AdapterResponse,
  HttpClientConfig,
} from './types'
import { getAxiosProxyConfig, ProxyType } from '~/lib/utils/proxy-config'

export abstract class BaseAdapter {
  protected config: ModelConfig
  protected httpClient: AxiosInstance

  constructor(config: ModelConfig) {
    this.config = config
    this.httpClient = this.createHttpClient()
  }

  /**
   * 创建 HTTP 客户端
   * 子类可以覆盖此方法以自定义配置
   */
  protected createHttpClient(): AxiosInstance {
    const clientConfig: HttpClientConfig = {
      baseURL: this.getApiEndpoint(),
      timeout: 120000, // 默认 2 分钟超时
      headers: {
        'Content-Type': 'application/json',
      },
    }

    // 添加认证头（如果有 API Key）
    const apiKey = this.getApiKey()
    if (apiKey) {
      clientConfig.headers = {
        ...clientConfig.headers,
        ...this.getAuthHeaders(apiKey),
      }
    }

    return axios.create(clientConfig)
  }

  /**
   * 应用代理配置到请求配置
   * 异步方法，用于在发送请求前应用代理
   */
  protected async applyProxyConfig(requestConfig: any): Promise<any> {
    const proxyConfig = await getAxiosProxyConfig(ProxyType.AI_GENERATION)

    if (proxyConfig) {
      this.log('info', `使用代理: ${proxyConfig.host}:${proxyConfig.port}`)
      return {
        ...requestConfig,
        proxy: proxyConfig,
        // 当使用代理时，需要确保不使用baseURL，而是使用完整的URL
        baseURL: undefined,
      }
    }

    return requestConfig
  }

  /**
   * 发送 HTTP 请求（自动应用代理配置）
   */
  protected async request<T = any>(config: any): Promise<T> {
    const configWithProxy = await this.applyProxyConfig(config)
    const response = await axios.request<T>(configWithProxy)
    return response.data
  }

  /**
   * 发送 POST 请求（自动应用代理配置）
   */
  protected async post<T = any>(url: string, data?: any, config?: any): Promise<T> {
    const configWithProxy = await this.applyProxyConfig({
      method: 'POST',
      url,
      data,
      ...config,
    })
    const response = await axios.request<T>(configWithProxy)
    return response.data
  }

  /**
   * 发送 GET 请求（自动应用代理配置）
   */
  protected async get<T = any>(url: string, config?: any): Promise<T> {
    const configWithProxy = await this.applyProxyConfig({
      method: 'GET',
      url,
      ...config,
    })
    const response = await axios.request<T>(configWithProxy)
    return response.data
  }

  /**
   * 获取 API Key
   * 优先使用供应商级别的 Key，然后使用环境变量
   */
  protected getApiKey(): string {
    // 数据库中的 Key
    if (this.config.provider.apiKey) {
      return this.config.provider.apiKey
    }

    // 环境变量 fallback
    const envVarName = `AI_PROVIDER_${this.config.provider.slug.toUpperCase().replace(/-/g, '_')}_API_KEY`
    return process.env[envVarName] || ''
  }

  /**
   * 获取 API 端点
   */
  protected getApiEndpoint(): string {
    return this.config.provider.apiEndpoint || ''
  }

  /**
   * 获取认证头
   * 子类可以覆盖此方法以自定义认证方式
   */
  protected getAuthHeaders(apiKey: string): Record<string, string> {
    return {
      Authorization: `Bearer ${apiKey}`,
    }
  }

  /**
   * 记录日志
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: unknown) {
    const prefix = `[${this.config.adapterName}]`
    const logData = data ? { data } : undefined

    switch (level) {
      case 'info':
        console.log(prefix, message, logData)
        break
      case 'warn':
        console.warn(prefix, message, logData)
        // 异步记录警告到错误日志（不阻塞）
        void this.logToErrorService('WARN', message, data)
        break
      case 'error':
        console.error(prefix, message, logData)
        // 异步记录错误到错误日志（不阻塞）
        void this.logToErrorService('ERROR', message, data)
        break
    }
  }

  /**
   * 记录到错误日志服务（异步，不阻塞主流程）
   */
  private async logToErrorService(
    level: 'WARN' | 'ERROR',
    message: string,
    data?: unknown
  ) {
    try {
      const { errorLogService } = await import('../services/error-log-service')
      await errorLogService.logError({
        level,
        source: this.config.adapterName,
        message,
        context: data ? (typeof data === 'object' ? (data as Record<string, unknown>) : { data }) : undefined,
      })
    } catch (error) {
      // 静默失败，避免影响主流程
      console.error('[BaseAdapter] Failed to log to error service:', error)
    }
  }

  /**
   * 子类必须实现：调度生成请求
   */
  abstract dispatch(request: GenerationRequest): Promise<AdapterResponse>

  /**
   * 子类可选实现：检查异步任务状态
   */
  async checkTaskStatus?(taskId: string): Promise<AdapterResponse>
}
