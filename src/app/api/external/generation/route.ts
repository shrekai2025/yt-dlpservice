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
            responsePayload: JSON.stringify(result),
            durationMs: Date.now() - startedAt,
          },
        })

        return NextResponse.json(
          {
            id: generationRequest.id,
            status: 'PROCESSING',
            task_id: result.task_id,
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
