import { Logger } from '~/lib/utils/logger'
import type { IPlatform, PlatformValidation } from './platform-interface'

/**
 * 平台注册中心
 * 管理所有平台实例，提供平台查找和匹配功能
 */
export class PlatformRegistry {
  private static instance: PlatformRegistry
  private platforms: Map<string, IPlatform> = new Map()

  private constructor() {}

  public static getInstance(): PlatformRegistry {
    if (!PlatformRegistry.instance) {
      PlatformRegistry.instance = new PlatformRegistry()
    }
    return PlatformRegistry.instance
  }

  /**
   * 注册平台
   */
  register(platform: IPlatform): void {
    if (this.platforms.has(platform.name)) {
      Logger.warn(`平台 ${platform.name} 已存在，将被覆盖`)
    }
    
    this.platforms.set(platform.name, platform)
    Logger.info(`✅ 注册平台: ${platform.name}`, {
      domains: platform.supportedDomains,
      contentTypes: platform.supportedContentTypes,
      requiresAuth: platform.requiresAuth
    })
  }

  /**
   * 获取所有已注册的平台
   */
  getAllPlatforms(): IPlatform[] {
    return Array.from(this.platforms.values())
  }

  /**
   * 根据名称获取平台
   */
  getPlatformByName(name: string): IPlatform | null {
    return this.platforms.get(name) || null
  }

  /**
   * 根据URL查找最佳匹配的平台
   */
  async findPlatformForUrl(url: string): Promise<IPlatform> {
    Logger.debug(`🔍 查找URL的平台: ${url}`)
    
    const candidates: Array<{ platform: IPlatform; validation: PlatformValidation }> = []

    // 测试所有平台
    for (const platform of this.platforms.values()) {
      try {
        const validation = platform.validateUrl(url)
        if (validation.isSupported) {
          candidates.push({ platform, validation })
          Logger.debug(`✓ 平台 ${platform.name} 支持此URL，置信度: ${validation.confidence}`)
        } else {
          Logger.debug(`✗ 平台 ${platform.name} 不支持此URL: ${validation.reason}`)
        }
      } catch (error) {
        Logger.warn(`平台 ${platform.name} 验证URL时出错: ${error}`)
      }
    }

    if (candidates.length === 0) {
      throw new Error(`未找到支持URL的平台: ${url}`)
    }

    // 按置信度排序
    candidates.sort((a, b) => b.validation.confidence - a.validation.confidence)
    
    const bestMatch = candidates[0]!
    Logger.info(`🎯 选择平台: ${bestMatch.platform.name}，置信度: ${bestMatch.validation.confidence}`)
    
    return bestMatch.platform
  }

  /**
   * 获取平台统计信息
   */
  getStats(): {
    totalPlatforms: number
    platformsByType: Record<string, number>
    authRequiredCount: number
  } {
    const platforms = this.getAllPlatforms()
    const platformsByType: Record<string, number> = {}
    let authRequiredCount = 0

    for (const platform of platforms) {
      // 统计内容类型
      for (const contentType of platform.supportedContentTypes) {
        platformsByType[contentType] = (platformsByType[contentType] || 0) + 1
      }
      
      // 统计需要认证的平台
      if (platform.requiresAuth) {
        authRequiredCount++
      }
    }

    return {
      totalPlatforms: platforms.length,
      platformsByType,
      authRequiredCount
    }
  }

  /**
   * 清空所有平台 (主要用于测试)
   */
  clear(): void {
    this.platforms.clear()
    Logger.info('🧹 清空所有平台注册')
  }

  /**
   * 批量注册平台
   */
  registerMultiple(platforms: IPlatform[]): void {
    for (const platform of platforms) {
      this.register(platform)
    }
  }
}

// 导出单例实例
export const platformRegistry = PlatformRegistry.getInstance() 