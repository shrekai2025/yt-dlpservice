/**
 * 代理配置 tRPC Router
 *
 * 提供代理配置的读写接口
 */

import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '~/server/api/trpc'
import { getProxyConfig, setProxyConfig, ProxyType } from '~/lib/utils/proxy-config'

/**
 * 代理配置 Schema
 */
const ProxyConfigSchema = z.object({
  type: z.enum(['AI_GENERATION', 'GOOGLE_API']),
  enabled: z.boolean(),
  host: z.string().optional(),
  port: z.number().int().min(1).max(65535).optional(),
})

export const proxyRouter = createTRPCRouter({
  /**
   * 获取代理配置
   */
  getConfig: publicProcedure
    .input(
      z.object({
        type: z.enum(['AI_GENERATION', 'GOOGLE_API']),
      })
    )
    .query(async ({ input }) => {
      const proxyType = ProxyType[input.type]
      const config = await getProxyConfig(proxyType)

      if (config === false) {
        return {
          enabled: false,
          host: '',
          port: 0,
        }
      }

      return {
        enabled: true,
        host: config.host,
        port: config.port,
      }
    }),

  /**
   * 获取所有代理配置
   */
  getAllConfigs: publicProcedure.query(async () => {
    const aiGenerationConfig = await getProxyConfig(ProxyType.AI_GENERATION)
    const googleApiConfig = await getProxyConfig(ProxyType.GOOGLE_API)

    return {
      aiGeneration: aiGenerationConfig === false
        ? { enabled: false, host: '', port: 0 }
        : { enabled: true, host: aiGenerationConfig.host, port: aiGenerationConfig.port },
      googleApi: googleApiConfig === false
        ? { enabled: false, host: '', port: 0 }
        : { enabled: true, host: googleApiConfig.host, port: googleApiConfig.port },
    }
  }),

  /**
   * 设置代理配置
   */
  setConfig: publicProcedure
    .input(ProxyConfigSchema)
    .mutation(async ({ input }) => {
      const proxyType = ProxyType[input.type]

      await setProxyConfig(proxyType, {
        enabled: input.enabled,
        host: input.host,
        port: input.port,
      })

      return {
        success: true,
        message: '代理配置已更新',
      }
    }),

  /**
   * 测试代理连接
   */
  testConnection: publicProcedure
    .input(
      z.object({
        host: z.string(),
        port: z.number().int().min(1).max(65535),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // 简单测试：尝试通过代理连接到 Google
        const axios = require('axios')

        const response = await axios.get('https://www.google.com', {
          proxy: {
            host: input.host,
            port: input.port,
            protocol: 'http',
          },
          timeout: 5000,
          validateStatus: () => true, // 接受任何状态码
        })

        return {
          success: true,
          message: `代理连接成功 (HTTP ${response.status})`,
          statusCode: response.status,
        }
      } catch (error: any) {
        return {
          success: false,
          message: `代理连接失败: ${error.message}`,
          error: error.message,
        }
      }
    }),
})
