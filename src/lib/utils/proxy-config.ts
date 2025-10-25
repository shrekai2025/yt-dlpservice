/**
 * 代理配置工具
 *
 * 提供统一的代理配置管理，支持：
 * 1. 数据库配置优先（运行时可修改）
 * 2. 环境变量作为fallback
 */

import { env } from '~/env'
import { db } from '~/server/db'

export interface ProxyConfig {
  host: string
  port: number
  protocol: 'http' | 'https'
}

/**
 * 代理配置类型
 */
export enum ProxyType {
  AI_GENERATION = 'AI_GENERATION',
  GOOGLE_API = 'GOOGLE_API',
}

/**
 * 获取代理配置
 * 优先级：数据库配置 > 环境变量
 */
export async function getProxyConfig(type: ProxyType): Promise<ProxyConfig | false> {
  try {
    // 1. 尝试从数据库读取配置
    const dbEnabled = await getConfigValue(`${type}_PROXY_ENABLED`)
    const dbHost = await getConfigValue(`${type}_PROXY_HOST`)
    const dbPort = await getConfigValue(`${type}_PROXY_PORT`)

    // 如果数据库有配置，使用数据库配置
    if (dbEnabled !== null) {
      const enabled = dbEnabled === 'true'
      if (!enabled) {
        return false
      }

      if (dbHost && dbPort) {
        return {
          host: dbHost,
          port: parseInt(dbPort, 10),
          protocol: 'http',
        }
      }
    }

    // 2. 使用环境变量作为fallback
    let enabled: boolean
    let host: string | undefined
    let port: number | undefined

    if (type === ProxyType.AI_GENERATION) {
      enabled = env.AI_GENERATION_PROXY_ENABLED
      host = env.AI_GENERATION_PROXY_HOST
      port = env.AI_GENERATION_PROXY_PORT
    } else if (type === ProxyType.GOOGLE_API) {
      enabled = env.GOOGLE_API_PROXY_ENABLED
      host = env.GOOGLE_API_PROXY_HOST
      port = env.GOOGLE_API_PROXY_PORT
    } else {
      return false
    }

    if (!enabled) {
      return false
    }

    if (!host || !port) {
      return false
    }

    return {
      host,
      port,
      protocol: 'http',
    }
  } catch (error) {
    console.error(`[ProxyConfig] Failed to get proxy config for ${type}:`, error)
    return false
  }
}

/**
 * 设置代理配置到数据库
 */
export async function setProxyConfig(
  type: ProxyType,
  config: { enabled: boolean; host?: string; port?: number }
): Promise<void> {
  await setConfigValue(`${type}_PROXY_ENABLED`, config.enabled ? 'true' : 'false')

  if (config.enabled && config.host && config.port) {
    await setConfigValue(`${type}_PROXY_HOST`, config.host)
    await setConfigValue(`${type}_PROXY_PORT`, config.port.toString())
  }
}

/**
 * 获取数据库配置值
 */
async function getConfigValue(key: string): Promise<string | null> {
  try {
    const config = await db.config.findUnique({
      where: { key },
    })
    return config?.value ?? null
  } catch (error) {
    return null
  }
}

/**
 * 设置数据库配置值
 */
async function setConfigValue(key: string, value: string): Promise<void> {
  await db.config.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  })
}

/**
 * 获取 axios 代理配置对象
 */
export async function getAxiosProxyConfig(type: ProxyType): Promise<any> {
  const proxyConfig = await getProxyConfig(type)

  if (!proxyConfig) {
    return undefined
  }

  return {
    host: proxyConfig.host,
    port: proxyConfig.port,
    protocol: proxyConfig.protocol,
  }
}

/**
 * 将代理配置应用到 axios 请求配置
 */
export async function applyProxyToAxiosConfig(
  type: ProxyType,
  axiosConfig: any
): Promise<any> {
  const proxyConfig = await getAxiosProxyConfig(type)

  if (proxyConfig) {
    return {
      ...axiosConfig,
      proxy: proxyConfig,
    }
  }

  return axiosConfig
}
