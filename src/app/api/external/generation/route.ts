/**
 * External Generation API - Create Generation
 *
 * POST /api/external/generation
 * Requires X-API-Key header
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '~/server/db'
import { validateApiKey, hashApiKey, extractKeyPrefix } from '~/lib/auth/api-key'
import { createAdapter } from '~/lib/adapters/adapter-factory'
import type { BaseAdapter } from '~/lib/adapters/base-adapter'
import { UnifiedGenerationRequestSchema } from '~/lib/adapters/types'
import type { AdapterResponse, ProviderConfig } from '~/lib/adapters/types'

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
  shortName?: string | null
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
    shortName: provider.shortName,
    apiEndpoint: provider.apiEndpoint,
    apiFlavor: provider.apiFlavor,
    encryptedAuthKey: provider.encryptedAuthKey,
    isActive: provider.isActive,
    uploadToS3: provider.uploadToS3,
    s3PathPrefix: provider.s3PathPrefix,
    modelVersion: provider.modelVersion,
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function monitorAsyncGenerationTask({
  adapter,
  taskId,
  requestId,
  providerId,
  startedAt,
  pollIntervalMs = 5000,
  maxAttempts = 120,
}: {
  adapter: BaseAdapter
  taskId: string
  requestId: string
  providerId: string
  startedAt: number
  pollIntervalMs?: number
  maxAttempts?: number
}) {
  const pollingFn = (adapter as unknown as { checkTaskStatus?: (taskId: string) => Promise<AdapterResponse> })

  if (typeof pollingFn.checkTaskStatus !== 'function') {
    console.warn(
      `[External API] Adapter ${adapter.constructor.name} does not expose checkTaskStatus, skip polling`,
    )
    return
  }

  console.log(
    `[External API] Start polling task ${taskId} for request ${requestId} via ${adapter.constructor.name}`,
  )

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const currentRequest = await db.generationRequest.findUnique({
      where: { id: requestId },
      select: { deletedAt: true, status: true },
    })

    if (!currentRequest || currentRequest.deletedAt) {
      console.log(`[External API] Request ${requestId} deleted, stop polling task ${taskId}`)
      return
    }

    if (currentRequest.status !== 'PROCESSING' && currentRequest.status !== 'PENDING') {
      console.log(
        `[External API] Request ${requestId} status now ${currentRequest.status}, stop polling task ${taskId}`,
      )
      return
    }
    try {
      const status = await pollingFn.checkTaskStatus.call(adapter, taskId)

      if (!status) {
        await sleep(pollIntervalMs)
        continue
      }

      if (status.status === 'SUCCESS') {
        await db.generationRequest.update({
          where: { id: requestId },
          data: {
            status: 'SUCCESS',
            results: JSON.stringify(status.results || []),
            completedAt: new Date(),
            responsePayload: JSON.stringify(status),
            durationMs: Date.now() - startedAt,
            progress: status.progress ?? 1,
          },
        })

        await db.apiProvider.update({
          where: { id: providerId },
          data: { callCount: { increment: 1 } },
        })

        console.log(
          `[External API] Task ${taskId} completed after ${attempt} attempts`,
        )
        return
      }

      if (status.status === 'ERROR') {
        await db.generationRequest.update({
          where: { id: requestId },
          data: {
            status: 'FAILED',
            errorMessage: status.message || status.error?.message || 'Generation failed',
            responsePayload: JSON.stringify(status),
            durationMs: Date.now() - startedAt,
            progress: status.progress ?? null,
          },
        })

        console.warn(
          `[External API] Task ${taskId} failed after ${attempt} attempts: ${status.message}`,
        )
        return
      }

      await db.generationRequest.update({
        where: { id: requestId },
        data: {
          progress: status.progress ?? null,
          responsePayload: JSON.stringify(status),
        },
      })
    } catch (error) {
      console.warn(`[External API] Polling error for task ${taskId} (attempt ${attempt})`, error)
    }

    await sleep(pollIntervalMs)
  }

  console.warn(
    `[External API] Task ${taskId} did not finish within ${maxAttempts} attempts`,
  )
}

export async function POST(request: NextRequest) {
  try {
    // 1. Validate API key
    const apiKey = request.headers.get('X-API-Key')

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing X-API-Key header' },
        { status: 401 }
      )
    }

    const keyInfo = await validateApiKey(apiKey)

    if (!keyInfo) {
      return NextResponse.json(
        { error: 'Invalid or inactive API key' },
        { status: 401 }
      )
    }

    console.log(`[External API] Authenticated: ${keyInfo.name}`)

    const clientKeyPrefix = extractKeyPrefix(apiKey)
    const clientKeyHash = hashApiKey(apiKey)

    // 2. Parse and validate request body
    const body = await request.json()
    const parseResult = UnifiedGenerationRequestSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: parseResult.error.errors,
        },
        { status: 400 }
      )
    }

    const input = parseResult.data

    // 3. Find provider
    const provider = await db.apiProvider.findUnique({
      where: {
        modelIdentifier: input.model_identifier,
        isActive: true,
      },
    })

    if (!provider) {
      return NextResponse.json(
        { error: `Provider not found or inactive: ${input.model_identifier}` },
        { status: 404 }
      )
    }

    // 4. Create generation request record
    const generationRequest = await db.generationRequest.create({
      data: {
        providerId: provider.id,
        modelIdentifier: provider.modelIdentifier,
        status: 'PENDING',
        prompt: input.prompt,
        inputImages: JSON.stringify(input.input_images || []),
        numberOfOutputs: input.number_of_outputs || 1,
        parameters: JSON.stringify(input.parameters || {}),
        clientKeyPrefix,
        clientKeyHash,
        requestPayload: JSON.stringify(input),
      },
    })

    console.log(`[External API] Created request ${generationRequest.id}`)

    const startedAt = Date.now()

    // 5. Dispatch to adapter
    try {
      await db.generationRequest.update({
        where: { id: generationRequest.id },
        data: { status: 'PROCESSING' },
      })

      const providerConfig = toProviderConfig(provider)
      const adapter = createAdapter(providerConfig)

      const result = await adapter.dispatch(input)

      // 6. Update with result
      if (result.status === 'SUCCESS') {
        const updatedRequest = await db.generationRequest.update({
          where: { id: generationRequest.id },
          data: {
            status: 'SUCCESS',
            results: JSON.stringify(result.results || []),
            completedAt: new Date(),
            responsePayload: JSON.stringify(result),
            durationMs: Date.now() - startedAt,
          },
        })

        await db.apiProvider.update({
          where: { id: provider.id },
          data: { callCount: { increment: 1 } },
        })

        return NextResponse.json(
          {
            id: generationRequest.id,
            status: 'SUCCESS',
            results: result.results,
            message: result.message,
            created_at: updatedRequest.createdAt.toISOString(),
            completed_at: updatedRequest.completedAt?.toISOString() || null,
            duration_ms: updatedRequest.durationMs ?? null,
            client_key_prefix: clientKeyPrefix,
          },
          { status: 200 }
        )
      } else if (result.status === 'PROCESSING') {
        const updatedRequest = await db.generationRequest.update({
          where: { id: generationRequest.id },
          data: {
            status: 'PROCESSING',
            taskId: result.task_id || null,
            progress: result.progress ?? null,
            responsePayload: JSON.stringify(result),
            durationMs: Date.now() - startedAt,
          },
        })

        if (result.task_id) {
          void monitorAsyncGenerationTask({
            adapter,
            taskId: result.task_id,
            requestId: generationRequest.id,
            providerId: provider.id,
            startedAt,
            pollIntervalMs: 5000,
            maxAttempts: 180,
          })
        }

        return NextResponse.json(
          {
            id: generationRequest.id,
            status: 'PROCESSING',
            task_id: result.task_id,
            progress: result.progress,
            message: result.message || 'Generation in progress',
            created_at: updatedRequest.createdAt.toISOString(),
            completed_at: updatedRequest.completedAt?.toISOString() || null,
            duration_ms: updatedRequest.durationMs ?? null,
            client_key_prefix: clientKeyPrefix,
          },
          { status: 202 }
        )
      } else {
        const updatedRequest = await db.generationRequest.update({
          where: { id: generationRequest.id },
          data: {
            status: 'FAILED',
            errorMessage: result.message || 'Unknown error',
            responsePayload: JSON.stringify(result),
            durationMs: Date.now() - startedAt,
          },
        })

        return NextResponse.json(
          {
            id: generationRequest.id,
            status: 'FAILED',
            error: result.message || 'Generation failed',
            created_at: updatedRequest.createdAt.toISOString(),
            completed_at: updatedRequest.completedAt?.toISOString() || null,
            duration_ms: updatedRequest.durationMs ?? null,
            client_key_prefix: clientKeyPrefix,
          },
          { status: 500 }
        )
      }
    } catch (error) {
      console.error(`[External API] Error:`, error)

        await db.generationRequest.update({
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

      return NextResponse.json(
        {
          id: generationRequest.id,
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error',
          client_key_prefix: clientKeyPrefix,
          created_at: generationRequest.createdAt.toISOString(),
          completed_at: null,
          duration_ms: Date.now() - startedAt,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[External API] Unhandled error:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
