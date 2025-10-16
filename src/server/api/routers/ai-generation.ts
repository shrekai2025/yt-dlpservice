/**
 * AI Generation tRPC Router
 *
 * AI 内容生成服务的 tRPC 接口
 */

import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '~/server/api/trpc'
import { modelService } from '~/lib/ai-generation/services/model-service'
import { taskManager } from '~/lib/ai-generation/services/task-manager'
import { createAdapter } from '~/lib/ai-generation/adapters/adapter-factory'
import { pollAsyncTask } from '~/lib/ai-generation/services/task-poller'
import { safeValidateModelParameters } from '~/lib/ai-generation/validation/parameter-schemas'
import { resultStorageService } from '~/lib/ai-generation/services/result-storage-service'
import { healthCheckService } from '~/lib/ai-generation/services/health-check-service'
import type { ModelConfig } from '~/lib/ai-generation/adapters/types'

/**
 * 将数据库模型转换为适配器配置
 */
function toModelConfig(model: {
  id: string
  slug: string
  name: string
  adapterName: string
  outputType: string
  provider: {
    id: string
    slug: string
    name: string
    apiEndpoint: string | null
    apiKey: string | null
    uploadToS3: boolean
    s3PathPrefix: string | null
  }
}): ModelConfig {
  return {
    id: model.id,
    slug: model.slug,
    name: model.name,
    provider: {
      id: model.provider.id,
      slug: model.provider.slug,
      name: model.provider.name,
      apiKey: model.provider.apiKey || undefined,
      apiEndpoint: model.provider.apiEndpoint || undefined,
    },
    outputType: model.outputType as 'IMAGE' | 'VIDEO' | 'AUDIO',
    adapterName: model.adapterName,
  }
}

export const aiGenerationRouter = createTRPCRouter({
  // ==================== 平台相关 ====================

  /**
   * 获取所有平台
   */
  listPlatforms: publicProcedure.query(async () => {
    const platforms = await modelService.listPlatforms()
    return platforms
  }),

  /**
   * 获取平台详情
   */
  getPlatform: publicProcedure
    .input(z.object({ platformId: z.string() }))
    .query(async ({ input }) => {
      const platform = await modelService.getPlatform(input.platformId)
      if (!platform) {
        throw new Error(`Platform not found: ${input.platformId}`)
      }
      return platform
    }),

  // ==================== 供应商相关 ====================

  /**
   * 列出供应商
   */
  listProviders: publicProcedure
    .input(
      z.object({
        isActive: z.boolean().optional(),
        platformId: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const providers = await modelService.listProviders(input)
      return providers
    }),

  /**
   * 获取供应商详情
   */
  getProvider: publicProcedure
    .input(z.object({ providerId: z.string() }))
    .query(async ({ input }) => {
      const provider = await modelService.getProvider(input.providerId)
      if (!provider) {
        throw new Error(`Provider not found: ${input.providerId}`)
      }
      return provider
    }),

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
    .mutation(async ({ input }) => {
      const provider = await modelService.updateProviderApiKey(
        input.providerId,
        input.apiKey
      )
      return provider
    }),

  /**
   * 检查供应商健康状态
   */
  checkProviderHealth: publicProcedure
    .input(z.object({ providerId: z.string() }))
    .query(async ({ input }) => {
      const health = await healthCheckService.checkProviderHealth(input.providerId)
      return health
    }),

  /**
   * 检查所有供应商健康状态
   */
  checkAllProvidersHealth: publicProcedure
    .query(async () => {
      const healthStatuses = await healthCheckService.checkAllProviders()
      return healthStatuses
    }),

  // ==================== 模型相关 ====================

  /**
   * 列出模型
   */
  listModels: publicProcedure
    .input(
      z.object({
        providerId: z.string().optional(),
        outputType: z.enum(['IMAGE', 'VIDEO', 'AUDIO']).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .query(async ({ input }) => {
      const models = await modelService.listModels(input)
      return models
    }),

  /**
   * 获取模型详情
   */
  getModel: publicProcedure
    .input(z.object({ modelId: z.string() }))
    .query(async ({ input }) => {
      const model = await modelService.getModel(input.modelId)
      if (!model) {
        throw new Error(`Model not found: ${input.modelId}`)
      }
      return model
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
    .mutation(async ({ input }) => {
      const model = await modelService.updateModelStatus(input.modelId, input.isActive)
      return model
    }),

  // ==================== 生成任务相关 ====================

  /**
   * 创建生成任务
   */
  generate: publicProcedure
    .input(
      z.object({
        modelId: z.string(),
        prompt: z.string(),
        inputImages: z.array(z.string()).optional(),
        numberOfOutputs: z.number().int().positive().optional(),
        parameters: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 1. 获取模型配置
      const model = await modelService.getModel(input.modelId)
      if (!model) {
        throw new Error(`Model not found: ${input.modelId}`)
      }

      if (!model.isActive) {
        throw new Error(`Model is not active: ${model.name}`)
      }

      if (!model.provider.isActive) {
        throw new Error(`Provider is not active: ${model.provider.name}`)
      }

      // 2. 验证参数
      const validationResult = safeValidateModelParameters(model.slug, input.parameters ?? {})
      
      if (!validationResult.success) {
        throw new Error(
          `Invalid parameters for model ${model.slug}: ${JSON.stringify(validationResult.errors)}`
        )
      }

      const validatedParameters = validationResult.data as Record<string, unknown>

      const isFluxKontextModel = model.slug === 'kie-flux-kontext'

      if (isFluxKontextModel && input.numberOfOutputs && input.numberOfOutputs !== 1) {
        throw new Error('Flux Kontext 当前仅支持单张输出，请将输出数量设置为 1')
      }

      if (
        isFluxKontextModel &&
        input.inputImages &&
        input.inputImages.length > 0
      ) {
        const safetyTolerance = validatedParameters.safetyTolerance as number | undefined
        if (typeof safetyTolerance === 'number' && safetyTolerance > 2) {
          throw new Error(
            'Flux Kontext 图像编辑模式下 safetyTolerance 必须在 0-2 之间'
          )
        }
      }

      const effectiveNumberOfOutputs = isFluxKontextModel
        ? 1
        : input.numberOfOutputs

      // 3. 创建任务记录
      const task = await taskManager.createTask({
        modelId: input.modelId,
        prompt: input.prompt,
        inputImages: input.inputImages,
        numberOfOutputs: effectiveNumberOfOutputs,
        parameters: validatedParameters,
      })

      console.log(`[AI Generation] Created task ${task.id} for model ${model.name}`)

      // 4. 调用适配器
      const startedAt = Date.now()

      try {
        // 更新状态为 PROCESSING
        await taskManager.updateTask(task.id, {
          status: 'PROCESSING',
        })

        const modelConfig = toModelConfig(model)
        const adapter = createAdapter(modelConfig)

        console.log(`[AI Generation] Dispatching to ${model.adapterName}`)

        const result = await adapter.dispatch({
          prompt: input.prompt,
          inputImages: input.inputImages,
          numberOfOutputs: effectiveNumberOfOutputs,
          parameters: validatedParameters,
        })

        console.log(`[AI Generation] Result status: ${result.status}`)

        // 4. 处理结果
        if (result.status === 'SUCCESS') {
          // 处理存储（可能上传到S3）
          const processedResults = await resultStorageService.processResults(
            result.results || [],
            {
              uploadToS3: model.provider.uploadToS3,
              s3PathPrefix: model.provider.s3PathPrefix || undefined,
            }
          )

          // 同步成功
          await taskManager.updateTask(task.id, {
            status: 'SUCCESS',
            results: JSON.stringify(processedResults),
            completedAt: new Date(),
            responsePayload: JSON.stringify(result),
            durationMs: Date.now() - startedAt,
          })

          await taskManager.incrementModelUsage(model.id)

          return {
            id: task.id,
            status: 'SUCCESS' as const,
            results: processedResults,
            message: result.message,
          }
        } else if (result.status === 'PROCESSING') {
          // 异步任务 - 启动轮询
          await taskManager.updateTask(task.id, {
            status: 'PROCESSING',
            providerTaskId: result.providerTaskId || null,
            responsePayload: JSON.stringify(result),
            durationMs: Date.now() - startedAt,
          })

          if (result.providerTaskId) {
            // 后台轮询（不阻塞响应）
            void pollAsyncTask(
              task.id,
              result.providerTaskId,
              modelConfig,
              ctx.db,
              startedAt
            )
          }

          return {
            id: task.id,
            status: 'PROCESSING' as const,
            providerTaskId: result.providerTaskId,
            message: result.message || 'Generation in progress',
          }
        } else {
          // 错误
          await taskManager.updateTask(task.id, {
            status: 'FAILED',
            errorMessage: result.message || 'Unknown error',
            responsePayload: JSON.stringify(result),
            durationMs: Date.now() - startedAt,
          })

          throw new Error(result.message || 'Generation failed')
        }
      } catch (error) {
        console.error(`[AI Generation] Error:`, error)

        // 更新任务为失败
        await taskManager.updateTask(task.id, {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          responsePayload: JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error',
          }),
          durationMs: Date.now() - startedAt,
        })

        throw error
      }
    }),

  /**
   * 获取任务详情
   */
  getTask: publicProcedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ input }) => {
      const task = await taskManager.getTask(input.taskId)
      if (!task) {
        throw new Error(`Task not found: ${input.taskId}`)
      }

      return {
        id: task.id,
        status: task.status,
        prompt: task.prompt,
        inputImages: task.inputImages ? (JSON.parse(task.inputImages) as string[]) : [],
        numberOfOutputs: task.numberOfOutputs,
        parameters: task.parameters ? (JSON.parse(task.parameters) as Record<string, unknown>) : {},
        results: task.results ? (JSON.parse(task.results) as unknown[]) : null,
        errorMessage: task.errorMessage,
        providerTaskId: task.providerTaskId,
        progress: task.progress,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        completedAt: task.completedAt,
        durationMs: task.durationMs,
        model: {
          id: task.model.id,
          name: task.model.name,
          slug: task.model.slug,
          outputType: task.model.outputType,
          provider: {
            id: task.model.provider.id,
            name: task.model.provider.name,
            slug: task.model.provider.slug,
          },
        },
      }
    }),

  /**
   * 列出任务
   */
  listTasks: publicProcedure
    .input(
      z.object({
        status: z.enum(['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED']).optional(),
        modelId: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const result = await taskManager.listTasks({
        status: input.status,
        modelId: input.modelId,
        limit: input.limit,
        offset: input.offset,
      })

      return {
        tasks: result.tasks.map((t) => {
          const inputImages: string[] = (() => {
            if (!t.inputImages) return []
            try {
              const parsed = JSON.parse(t.inputImages)
              return Array.isArray(parsed)
                ? parsed.filter((item: unknown): item is string => typeof item === 'string')
                : []
            } catch {
              return []
            }
          })()

          const parameters: Record<string, unknown> = (() => {
            if (!t.parameters) return {}
            try {
              const parsed = JSON.parse(t.parameters)
              if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                return parsed as Record<string, unknown>
              }
              return {}
            } catch {
              return {}
            }
          })()

          const results =
            t.results
              ? (JSON.parse(t.results) as Array<{
                  type: string
                  url: string
                  metadata?: Record<string, unknown>
                }>)
              : []

          return {
            id: t.id,
            status: t.status,
            prompt: t.prompt,
            progress: t.progress,
            errorMessage: t.errorMessage,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
            completedAt: t.completedAt,
            durationMs: t.durationMs,
            inputImages,
            numberOfOutputs: t.numberOfOutputs ?? 1,
            parameters,
            results,
            model: {
              id: t.model.id,
              name: t.model.name,
              slug: t.model.slug,
              outputType: t.model.outputType,
              provider: {
                id: t.model.provider.id,
                name: t.model.provider.name,
                slug: t.model.provider.slug,
              },
            },
          }
        }),
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.hasMore,
      }
    }),

  /**
   * 删除任务
   */
  deleteTask: publicProcedure
    .input(z.object({ taskId: z.string() }))
    .mutation(async ({ input }) => {
      await taskManager.deleteTask(input.taskId)
      return { success: true }
    }),
})
