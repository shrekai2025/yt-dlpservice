/**
 * External AI Generation API - Create Generation Task
 *
 * POST /api/external/ai-generation
 * Requires X-API-Key header
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '~/server/db'
import { validateApiKey, hashApiKey, extractKeyPrefix } from '~/lib/auth/api-key'
import { modelService } from '~/lib/ai-generation/services/model-service'
import { taskManager } from '~/lib/ai-generation/services/task-manager'
import { createAdapter } from '~/lib/ai-generation/adapters/adapter-factory'
import { pollAsyncTask } from '~/lib/ai-generation/services/task-poller'
import { safeValidateModelParameters } from '~/lib/ai-generation/validation/parameter-schemas'
import { resultStorageService } from '~/lib/ai-generation/services/result-storage-service'
import type { ModelConfig } from '~/lib/ai-generation/adapters/types'
import { z } from 'zod'

// Request validation schema
const ExternalGenerationRequestSchema = z.object({
  model_slug: z.string().min(1, 'model_slug is required'),
  prompt: z.string().min(1, 'prompt is required'),
  input_images: z.array(z.string()).optional(),
  number_of_outputs: z.number().int().positive().optional(),
  parameters: z.record(z.unknown()).optional(),
})

type ExternalGenerationRequest = z.infer<typeof ExternalGenerationRequestSchema>

/**
 * Convert database model to ModelConfig
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

    console.log(`[AI Generation External API] Authenticated: ${keyInfo.name}`)

    // 2. Parse and validate request body
    const body = await request.json()
    const parseResult = ExternalGenerationRequestSchema.safeParse(body)

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

    // 3. Find model by slug
    const model = await modelService.getModelBySlug(input.model_slug)

    if (!model) {
      return NextResponse.json(
        { error: `Model not found: ${input.model_slug}` },
        { status: 404 }
      )
    }

    if (!model.isActive) {
      return NextResponse.json(
        { error: `Model is not active: ${model.name}` },
        { status: 400 }
      )
    }

    if (!model.provider.isActive) {
      return NextResponse.json(
        { error: `Provider is not active: ${model.provider.name}` },
        { status: 400 }
      )
    }

    // 4. Validate parameters
    const validationResult = safeValidateModelParameters(model.slug, input.parameters ?? {})
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid parameters',
          details: validationResult.errors,
        },
        { status: 400 }
      )
    }

    const validatedParameters = validationResult.data

    // 5. Create task record
    const task = await taskManager.createTask({
      modelId: model.id,
      prompt: input.prompt,
      inputImages: input.input_images,
      numberOfOutputs: input.number_of_outputs,
      parameters: validatedParameters,
    })

    console.log(`[AI Generation External API] Created task ${task.id} for model ${model.name}`)

    // 6. Dispatch to adapter
    const startedAt = Date.now()

    try {
      // Update status to PROCESSING
      await taskManager.updateTask(task.id, {
        status: 'PROCESSING',
      })

      const modelConfig = toModelConfig(model)
      const adapter = createAdapter(modelConfig)

      console.log(`[AI Generation External API] Dispatching to ${model.adapterName}`)

      const result = await adapter.dispatch({
        prompt: input.prompt,
        inputImages: input.input_images,
        numberOfOutputs: input.number_of_outputs,
        parameters: validatedParameters,
      })

      console.log(`[AI Generation External API] Result status: ${result.status}`)

      // 7. Handle results
      if (result.status === 'SUCCESS') {
        // 处理存储（可能上传到S3）
        const processedResults = await resultStorageService.processResults(
          result.results || [],
          {
            uploadToS3: model.provider.uploadToS3,
            s3PathPrefix: model.provider.s3PathPrefix || undefined,
          }
        )

        // Synchronous success
        await taskManager.updateTask(task.id, {
          status: 'SUCCESS',
          results: JSON.stringify(processedResults),
          completedAt: new Date(),
          responsePayload: JSON.stringify(result),
          durationMs: Date.now() - startedAt,
        })

        await taskManager.incrementModelUsage(model.id)

        return NextResponse.json(
          {
            task_id: task.id,
            status: 'SUCCESS',
            results: processedResults,
            message: result.message || 'Generation completed',
            duration_ms: Date.now() - startedAt,
          },
          { status: 200 }
        )
      } else if (result.status === 'PROCESSING') {
        // Asynchronous task - start polling in background
        await taskManager.updateTask(task.id, {
          status: 'PROCESSING',
          providerTaskId: result.providerTaskId || null,
          responsePayload: JSON.stringify(result),
          durationMs: Date.now() - startedAt,
        })

        if (result.providerTaskId) {
          // Background polling (non-blocking)
          void pollAsyncTask(
            task.id,
            result.providerTaskId,
            modelConfig,
            db,
            startedAt
          )
        }

        return NextResponse.json(
          {
            task_id: task.id,
            status: 'PROCESSING',
            provider_task_id: result.providerTaskId,
            message: result.message || 'Generation in progress',
          },
          { status: 202 }
        )
      } else {
        // Error
        await taskManager.updateTask(task.id, {
          status: 'FAILED',
          errorMessage: result.message || 'Unknown error',
          responsePayload: JSON.stringify(result),
          durationMs: Date.now() - startedAt,
        })

        return NextResponse.json(
          {
            task_id: task.id,
            status: 'FAILED',
            error: result.message || 'Generation failed',
          },
          { status: 500 }
        )
      }
    } catch (error) {
      console.error(`[AI Generation External API] Error:`, error)

      // Update task to failed
      await taskManager.updateTask(task.id, {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        responsePayload: JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
        durationMs: Date.now() - startedAt,
      })

      return NextResponse.json(
        {
          task_id: task.id,
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[AI Generation External API] Fatal error:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

