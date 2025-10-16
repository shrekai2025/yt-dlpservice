/**
 * Health Check Service
 *
 * 定期检查AI供应商的健康状态和可用性
 */

import { db } from '~/server/db'
import { createAdapter } from '../adapters/adapter-factory'
import type { ModelConfig } from '../adapters/types'

export interface ProviderHealthStatus {
  providerId: string
  providerName: string
  providerSlug: string
  isOnline: boolean
  lastCheckAt: Date
  errorMessage?: string
  responseTime?: number
  apiKeyValid: boolean
}

export class HealthCheckService {
  /**
   * 检查单个供应商的健康状态
   */
  async checkProviderHealth(providerId: string): Promise<ProviderHealthStatus> {
    const startTime = Date.now()

    try {
      // 获取供应商信息
      const provider = await db.aIProvider.findUnique({
        where: { id: providerId },
        include: {
          models: {
            where: { isActive: true },
            take: 1, // 只需要一个模型来测试
          },
        },
      })

      if (!provider) {
        return {
          providerId,
          providerName: 'Unknown',
          providerSlug: 'unknown',
          isOnline: false,
          lastCheckAt: new Date(),
          errorMessage: 'Provider not found',
          apiKeyValid: false,
        }
      }

      // 检查是否有可用的模型
      if (provider.models.length === 0) {
        return {
          providerId: provider.id,
          providerName: provider.name,
          providerSlug: provider.slug,
          isOnline: false,
          lastCheckAt: new Date(),
          errorMessage: 'No active models',
          apiKeyValid: !!provider.apiKey,
        }
      }

      // 使用第一个可用模型进行健康检查
      const testModel = provider.models[0]!
      const modelConfig: ModelConfig = {
        id: testModel.id,
        slug: testModel.slug,
        name: testModel.name,
        provider: {
          id: provider.id,
          slug: provider.slug,
          name: provider.name,
          apiKey: provider.apiKey || undefined,
          apiEndpoint: provider.apiEndpoint || undefined,
        },
        outputType: testModel.outputType as 'IMAGE' | 'VIDEO' | 'AUDIO',
        adapterName: testModel.adapterName,
      }

      // 创建适配器并进行简单的健康检查
      const adapter = createAdapter(modelConfig)

      // 检查适配器是否可用（不实际调用API，只检查配置）
      const hasApiKey = !!provider.apiKey || this.hasEnvApiKey(provider.slug)
      
      if (!hasApiKey) {
        return {
          providerId: provider.id,
          providerName: provider.name,
          providerSlug: provider.slug,
          isOnline: false,
          lastCheckAt: new Date(),
          errorMessage: 'API key not configured',
          apiKeyValid: false,
          responseTime: Date.now() - startTime,
        }
      }

      // 如果适配器有健康检查方法，调用它
      if (typeof (adapter as any).healthCheck === 'function') {
        const healthCheckResult = await (adapter as any).healthCheck()
        return {
          providerId: provider.id,
          providerName: provider.name,
          providerSlug: provider.slug,
          isOnline: healthCheckResult.isHealthy,
          lastCheckAt: new Date(),
          errorMessage: healthCheckResult.error,
          responseTime: Date.now() - startTime,
          apiKeyValid: true,
        }
      }

      // 默认：假设配置正确就是健康的
      return {
        providerId: provider.id,
        providerName: provider.name,
        providerSlug: provider.slug,
        isOnline: true,
        lastCheckAt: new Date(),
        apiKeyValid: true,
        responseTime: Date.now() - startTime,
      }
    } catch (error) {
      return {
        providerId,
        providerName: 'Unknown',
        providerSlug: 'unknown',
        isOnline: false,
        lastCheckAt: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime,
        apiKeyValid: false,
      }
    }
  }

  /**
   * 检查所有活跃供应商的健康状态
   */
  async checkAllProviders(): Promise<ProviderHealthStatus[]> {
    const providers = await db.aIProvider.findMany({
      where: { isActive: true },
      select: { id: true },
    })

    const healthChecks = await Promise.all(
      providers.map((p) => this.checkProviderHealth(p.id))
    )

    return healthChecks
  }

  /**
   * 获取供应商的配额信息（如果API支持）
   */
  async getProviderQuota(providerId: string): Promise<{
    total?: number
    used?: number
    remaining?: number
    resetAt?: Date
  } | null> {
    // TODO: 根据不同供应商实现配额查询
    // 大多数AI供应商不提供配额API，需要手动配置或估算
    return null
  }

  /**
   * 检查环境变量中是否配置了API Key
   */
  private hasEnvApiKey(providerSlug: string): boolean {
    const envKey = `AI_PROVIDER_${providerSlug.toUpperCase().replace(/-/g, '_')}_API_KEY`
    return !!process.env[envKey]
  }

  /**
   * 批量更新供应商健康状态（可定时执行）
   */
  async updateProviderHealthStatus() {
    console.log('[HealthCheckService] Starting health check for all providers...')
    
    const healthStatuses = await this.checkAllProviders()
    
    for (const status of healthStatuses) {
      console.log(
        `[HealthCheckService] ${status.providerName}: ${status.isOnline ? 'ONLINE' : 'OFFLINE'} ` +
        `(${status.responseTime}ms) ${status.errorMessage ? `- ${status.errorMessage}` : ''}`
      )
      
      // 如果供应商不健康，可以记录告警
      if (!status.isOnline) {
        const { systemAlertService } = await import('./system-alert-service')
        await systemAlertService.alertApiDown(
          status.providerName,
          status.errorMessage || 'Unknown error',
          {
            providerId: status.providerId,
            providerSlug: status.providerSlug,
            responseTime: status.responseTime,
          }
        )
      }
    }
    
    console.log('[HealthCheckService] Health check completed')
    
    return healthStatuses
  }
}

export const healthCheckService = new HealthCheckService()

