/**
 * Generation tRPC Router
 *
 * Handles AI content generation requests through multiple providers
 */

import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '~/server/api/trpc'
import { createAdapter } from '~/lib/adapters/adapter-factory'
import { UnifiedGenerationRequestSchema } from '~/lib/adapters/types'
import type { ProviderConfig } from '~/lib/adapters/types'

/**
 * Convert database provider to ProviderConfig
 */
function toProviderConfig(provider: {
  id: string
  name: string
  modelIdentifier: string
  adapterName: string
  type: string
  provider: string | null
  apiEndpoint: string
  apiFlavor: string
  encryptedAuthKey: string | null
  isActive: boolean
  uploadToS3: boolean
  s3PathPrefix: string | null
  modelVersion: string | null
}): ProviderConfig {
  return {
    id: provider.id,
    name: provider.name,
    modelIdentifier: provider.modelIdentifier,
    adapterName: provider.adapterName,
    type: provider.type as 'image' | 'video' | 'stt',
    provider: provider.provider,
    apiEndpoint: provider.apiEndpoint,
    apiFlavor: provider.apiFlavor,
    encryptedAuthKey: provider.encryptedAuthKey,
    isActive: provider.isActive,
    uploadToS3: provider.uploadToS3,
    s3PathPrefix: provider.s3PathPrefix,
    modelVersion: provider.modelVersion,
  }
}

export const generationRouter = createTRPCRouter({
  /**
   * Create a new generation request
   */
  generate: publicProcedure
    .input(UnifiedGenerationRequestSchema)
    .mutation(async ({ ctx, input }) => {
      // 1. Find provider by model identifier
      const provider = await ctx.db.apiProvider.findUnique({
        where: {
          modelIdentifier: input.model_identifier,
          isActive: true,
        },
      })

      if (!provider) {
        throw new Error(`Provider not found or inactive: ${input.model_identifier}`)
      }

      // 2. Create generation request record
      const generationRequest = await ctx.db.generationRequest.create({
        data: {
          providerId: provider.id,
          modelIdentifier: provider.modelIdentifier,
          status: 'PENDING',
          prompt: input.prompt,
          inputImages: JSON.stringify(input.input_images || []),
          numberOfOutputs: input.number_of_outputs || 1,
          parameters: JSON.stringify(input.parameters || {}),
          requestPayload: JSON.stringify(input),
        },
      })

      console.log(`[Generation] Created request ${generationRequest.id} for ${provider.name}`)

      // 3. Create adapter and dispatch request
      const startedAt = Date.now()
      try {
        // Update status to PROCESSING
        await ctx.db.generationRequest.update({
          where: { id: generationRequest.id },
          data: { status: 'PROCESSING' },
        })

        const providerConfig = toProviderConfig(provider)
        const adapter = createAdapter(providerConfig)

        console.log(`[Generation] Dispatching to ${provider.adapterName}`)

        const result = await adapter.dispatch(input)

        console.log(`[Generation] Result status: ${result.status}`)

        // 4. Update request with result
        if (result.status === 'SUCCESS') {
          await ctx.db.generationRequest.update({
            where: { id: generationRequest.id },
            data: {
              status: 'SUCCESS',
              results: JSON.stringify(result.results || []),
              completedAt: new Date(),
              responsePayload: JSON.stringify(result),
              durationMs: Date.now() - startedAt,
            },
          })

          // Increment provider call count
          await ctx.db.apiProvider.update({
            where: { id: provider.id },
            data: { callCount: { increment: 1 } },
          })

          return {
            id: generationRequest.id,
            status: 'SUCCESS' as const,
            results: result.results,
            message: result.message,
          }
        } else if (result.status === 'PROCESSING') {
          // Async task - return task_id
          await ctx.db.generationRequest.update({
            where: { id: generationRequest.id },
            data: {
              status: 'PROCESSING',
              taskId: result.task_id || null,
              responsePayload: JSON.stringify(result),
              durationMs: Date.now() - startedAt,
            },
          })

          return {
            id: generationRequest.id,
            status: 'PROCESSING' as const,
            task_id: result.task_id,
            message: result.message || 'Generation in progress',
          }
        } else {
          // Error
          await ctx.db.generationRequest.update({
            where: { id: generationRequest.id },
            data: {
              status: 'FAILED',
              errorMessage: result.message || 'Unknown error',
              responsePayload: JSON.stringify(result),
              durationMs: Date.now() - startedAt,
            },
          })

          throw new Error(result.message || 'Generation failed')
        }
      } catch (error) {
        console.error(`[Generation] Error:`, error)

        // Update request with error
        await ctx.db.generationRequest.update({
          where: { id: generationRequest.id },
          data: {
            status: 'FAILED',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            responsePayload: JSON.stringify({
              error: error instanceof Error ? error.message : 'Unknown error',
            }),
            durationMs: Date.now() - startedAt,
          },
        })

        throw error
      }
    }),

  /**
   * Get generation request by ID
   */
  getRequest: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const request = await ctx.db.generationRequest.findUnique({
        where: { id: input.id },
        include: { provider: true },
      })

      if (!request) {
        throw new Error(`Generation request not found: ${input.id}`)
      }

      return {
        id: request.id,
        status: request.status,
        modelIdentifier: request.modelIdentifier,
        prompt: request.prompt,
        inputImages: JSON.parse(request.inputImages || '[]') as string[],
        numberOfOutputs: request.numberOfOutputs,
        parameters: JSON.parse(request.parameters || '{}') as Record<string, unknown>,
        results: request.results ? (JSON.parse(request.results) as unknown[]) : null,
        errorMessage: request.errorMessage,
        taskId: request.taskId,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
        completedAt: request.completedAt,
        provider: {
          id: request.provider.id,
          name: request.provider.name,
          type: request.provider.type,
        },
      }
    }),

  /**
   * List generation requests with pagination
   */
  listRequests: publicProcedure
    .input(
      z.object({
        status: z.enum(['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED']).optional(),
        providerId: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: {
        status?: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED'
        providerId?: string
        deletedAt?: null
      } = { deletedAt: null }

      if (input.status) where.status = input.status
      if (input.providerId) where.providerId = input.providerId

      const [requests, total] = await Promise.all([
        ctx.db.generationRequest.findMany({
          where,
          include: { provider: true },
          orderBy: { createdAt: 'desc' },
          take: input.limit,
          skip: input.offset,
        }),
        ctx.db.generationRequest.count({ where }),
      ])

      return {
        requests: requests.map((r) => ({
          id: r.id,
          status: r.status,
          modelIdentifier: r.modelIdentifier,
          prompt: r.prompt.substring(0, 100) + (r.prompt.length > 100 ? '...' : ''),
          createdAt: r.createdAt,
          completedAt: r.completedAt,
          provider: {
            id: r.provider.id,
            name: r.provider.name,
            type: r.provider.type,
          },
        })),
        total,
        limit: input.limit,
        offset: input.offset,
      }
    }),

  /**
   * List available providers
   */
  listProviders: publicProcedure
    .input(
      z.object({
        type: z.enum(['image', 'video', 'stt']).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: { type?: string; isActive?: boolean } = {}

      if (input.type) where.type = input.type
      if (input.isActive !== undefined) where.isActive = input.isActive

      const providers = await ctx.db.apiProvider.findMany({
        where,
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
      })

      return providers.map((p) => ({
        id: p.id,
        name: p.name,
        modelIdentifier: p.modelIdentifier,
        type: p.type,
        provider: p.provider,
        isActive: p.isActive,
        callCount: p.callCount,
      }))
    }),

  /**
   * Get provider by model identifier
   */
  getProvider: publicProcedure
    .input(z.object({ modelIdentifier: z.string() }))
    .query(async ({ ctx, input }) => {
      const provider = await ctx.db.apiProvider.findUnique({
        where: { modelIdentifier: input.modelIdentifier },
      })

      if (!provider) {
        throw new Error(`Provider not found: ${input.modelIdentifier}`)
      }

      return {
        id: provider.id,
        name: provider.name,
        modelIdentifier: provider.modelIdentifier,
        adapterName: provider.adapterName,
        type: provider.type,
        provider: provider.provider,
        isActive: provider.isActive,
        callCount: provider.callCount,
        apiEndpoint: provider.apiEndpoint,
        apiFlavor: provider.apiFlavor,
        uploadToS3: provider.uploadToS3,
        s3PathPrefix: provider.s3PathPrefix,
      }
    }),

  /**
   * Toggle provider active status
   */
  toggleProvider: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const provider = await ctx.db.apiProvider.findUnique({
        where: { id: input.id },
      })

      if (!provider) {
        throw new Error(`Provider not found: ${input.id}`)
      }

      const updated = await ctx.db.apiProvider.update({
        where: { id: input.id },
        data: { isActive: !provider.isActive },
      })

      return {
        id: updated.id,
        name: updated.name,
        isActive: updated.isActive,
      }
    }),

  /**
   * Update provider configuration
   */
  updateProvider: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        apiEndpoint: z.string().optional(),
        encryptedAuthKey: z.string().optional(),
        uploadToS3: z.boolean().optional(),
        s3PathPrefix: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input

      const updated = await ctx.db.apiProvider.update({
        where: { id },
        data: updateData,
      })

      return {
        id: updated.id,
        name: updated.name,
        modelIdentifier: updated.modelIdentifier,
        isActive: updated.isActive,
      }
    }),
})
