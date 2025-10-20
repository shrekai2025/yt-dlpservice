/**
 * LLM Providers tRPC Router
 *
 * 语言模型供应商管理的 tRPC 接口
 */

import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '~/server/api/trpc'

export const llmProvidersRouter = createTRPCRouter({
  // ==================== 供应商相关 ====================

  /**
   * 列出所有语言模型供应商
   */
  listProviders: publicProcedure
    .input(
      z.object({
        isActive: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const providers = await ctx.db.lLMProvider.findMany({
        where: {
          isActive: input.isActive,
        },
        include: {
          endpoints: {
            where: {
              isActive: true,
            },
            include: {
              models: {
                where: {
                  isActive: true,
                },
                orderBy: {
                  sortOrder: 'asc',
                },
              },
            },
            orderBy: {
              sortOrder: 'asc',
            },
          },
        },
        orderBy: {
          sortOrder: 'asc',
        },
      })

      return providers
    }),

  /**
   * 获取单个供应商详情
   */
  getProvider: publicProcedure
    .input(z.object({ providerId: z.string() }))
    .query(async ({ ctx, input }) => {
      const provider = await ctx.db.lLMProvider.findUnique({
        where: {
          id: input.providerId,
        },
        include: {
          endpoints: {
            include: {
              models: {
                orderBy: {
                  sortOrder: 'asc',
                },
              },
            },
            orderBy: {
              sortOrder: 'asc',
            },
          },
        },
      })

      if (!provider) {
        throw new Error(`Provider not found: ${input.providerId}`)
      }

      return provider
    }),

  // ==================== 端点相关 ====================

  /**
   * 列出供应商的所有端点
   */
  listEndpoints: publicProcedure
    .input(
      z.object({
        providerId: z.string(),
        isActive: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const endpoints = await ctx.db.lLMEndpoint.findMany({
        where: {
          providerId: input.providerId,
          isActive: input.isActive,
        },
        include: {
          models: {
            where: {
              isActive: true,
            },
            orderBy: {
              sortOrder: 'asc',
            },
          },
        },
        orderBy: {
          sortOrder: 'asc',
        },
      })

      return endpoints
    }),

  /**
   * 获取端点详情
   */
  getEndpoint: publicProcedure
    .input(z.object({ endpointId: z.string() }))
    .query(async ({ ctx, input }) => {
      const endpoint = await ctx.db.lLMEndpoint.findUnique({
        where: {
          id: input.endpointId,
        },
        include: {
          provider: true,
          models: {
            orderBy: {
              sortOrder: 'asc',
            },
          },
        },
      })

      if (!endpoint) {
        throw new Error(`Endpoint not found: ${input.endpointId}`)
      }

      return endpoint
    }),

  // ==================== 模型相关 ====================

  /**
   * 列出端点的所有模型
   */
  listModels: publicProcedure
    .input(
      z.object({
        endpointId: z.string(),
        isActive: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const models = await ctx.db.lLMModel.findMany({
        where: {
          endpointId: input.endpointId,
          isActive: input.isActive,
        },
        orderBy: {
          sortOrder: 'asc',
        },
      })

      return models
    }),

  /**
   * 获取模型详情
   */
  getModel: publicProcedure
    .input(z.object({ modelId: z.string() }))
    .query(async ({ ctx, input }) => {
      const model = await ctx.db.lLMModel.findUnique({
        where: {
          id: input.modelId,
        },
        include: {
          endpoint: {
            include: {
              provider: true,
            },
          },
        },
      })

      if (!model) {
        throw new Error(`Model not found: ${input.modelId}`)
      }

      return model
    }),

  // ==================== 管理功能 ====================

  /**
   * 更新供应商 API Key
   */
  updateProviderApiKey: publicProcedure
    .input(
      z.object({
        providerId: z.string(),
        apiKey: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const provider = await ctx.db.lLMProvider.update({
        where: {
          id: input.providerId,
        },
        data: {
          apiKey: input.apiKey,
        },
      })

      return provider
    }),

  /**
   * 更新端点状态
   */
  updateEndpointStatus: publicProcedure
    .input(
      z.object({
        endpointId: z.string(),
        isActive: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const endpoint = await ctx.db.lLMEndpoint.update({
        where: {
          id: input.endpointId,
        },
        data: {
          isActive: input.isActive,
        },
      })

      return endpoint
    }),

  /**
   * 更新模型状态
   */
  updateModelStatus: publicProcedure
    .input(
      z.object({
        modelId: z.string(),
        isActive: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const model = await ctx.db.lLMModel.update({
        where: {
          id: input.modelId,
        },
        data: {
          isActive: input.isActive,
        },
      })

      return model
    }),
})
