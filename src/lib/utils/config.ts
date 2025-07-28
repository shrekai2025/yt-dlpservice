import { db } from '~/server/db'
import { env } from '~/env.js'
import type { ConfigInput } from '~/types/task'

// 配置缓存
const configCache = new Map<string, string>()

// 默认配置值
const DEFAULT_CONFIG = {
  MAX_CONCURRENT_TASKS: '10',
  TEMP_DIR: '/tmp/yt-dlpservice',
  AUDIO_FORMAT: 'mp3',
  AUDIO_BITRATE: '128k',
  MAX_FILE_AGE_HOURS: '1',
  CLEANUP_INTERVAL_HOURS: '24',
} as const

export class ConfigManager {
  /**
   * 获取配置值
   * 优先级: 环境变量 > 数据库配置 > 默认值
   */
  static async get(key: string): Promise<string> {
    // 1. 优先从环境变量获取
    const envValue = process.env[key]
    if (envValue) {
      return envValue
    }

    // 2. 从缓存获取
    if (configCache.has(key)) {
      return configCache.get(key)!
    }

    // 3. 从数据库获取
    try {
      const config = await db.config.findUnique({
        where: { key }
      })
      
      if (config) {
        configCache.set(key, config.value)
        return config.value
      }
    } catch (error) {
      console.error(`Failed to get config ${key} from database:`, error)
    }

    // 4. 返回默认值
    const defaultValue = DEFAULT_CONFIG[key as keyof typeof DEFAULT_CONFIG]
    if (defaultValue) {
      return defaultValue
    }

    throw new Error(`Configuration key '${key}' not found`)
  }

  /**
   * 设置配置值
   */
  static async set(input: ConfigInput): Promise<void> {
    try {
      await db.config.upsert({
        where: { key: input.key },
        update: {
          value: input.value,
        },
        create: input,
      })

      // 更新缓存
      configCache.set(input.key, input.value)
    } catch (error) {
      console.error(`Failed to set config ${input.key}:`, error)
      throw error
    }
  }

  /**
   * 获取所有配置
   */
  static async getAll(): Promise<Record<string, string>> {
    try {
      const configs = await db.config.findMany()
      const result: Record<string, string> = {}

      // 添加数据库配置
      for (const config of configs) {
        result[config.key] = config.value
      }

      // 添加默认配置（如果不在数据库中）
      for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
        if (!result[key]) {
          result[key] = value
        }
      }

      return result
    } catch (error) {
      console.error('Failed to get all configs:', error)
      return { ...DEFAULT_CONFIG }
    }
  }

  /**
   * 删除配置
   */
  static async delete(key: string): Promise<void> {
    try {
      await db.config.delete({
        where: { key }
      })

      // 从缓存删除
      configCache.delete(key)
    } catch (error) {
      console.error(`Failed to delete config ${key}:`, error)
      throw error
    }
  }

  /**
   * 清空缓存
   */
  static clearCache(): void {
    configCache.clear()
  }

  /**
   * 预热缓存
   */
  static async warmup(): Promise<void> {
    try {
      const configs = await db.config.findMany()
      for (const config of configs) {
        configCache.set(config.key, config.value)
      }
    } catch (error) {
      console.error('Failed to warmup config cache:', error)
    }
  }

  /**
   * 获取类型化的配置值
   */
  static async getTyped() {
    return {
      maxConcurrentTasks: parseInt(await this.get('MAX_CONCURRENT_TASKS')),
      tempDir: await this.get('TEMP_DIR'),
      audioFormat: await this.get('AUDIO_FORMAT'),
      audioBitrate: await this.get('AUDIO_BITRATE'),
      maxFileAgeHours: parseInt(await this.get('MAX_FILE_AGE_HOURS')),
      cleanupIntervalHours: parseInt(await this.get('CLEANUP_INTERVAL_HOURS')),
    }
  }
} 