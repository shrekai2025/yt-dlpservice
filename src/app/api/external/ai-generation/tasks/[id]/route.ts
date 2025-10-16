/**
 * External AI Generation API - Get Task Status
 *
 * GET /api/external/ai-generation/tasks/[id]
 * Requires X-API-Key header
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey } from '~/lib/auth/api-key'
import { taskManager } from '~/lib/ai-generation/services/task-manager'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // 2. Get task
    const task = await taskManager.getTask(params.id)

    if (!task) {
      return NextResponse.json(
        { error: `Task not found: ${params.id}` },
        { status: 404 }
      )
    }

    // 3. Parse results
    const results = task.results ? JSON.parse(task.results) : null
    const parameters = task.parameters ? JSON.parse(task.parameters) : {}
    const inputImages = task.inputImages ? JSON.parse(task.inputImages) : []

    // 4. Return task data
    return NextResponse.json(
      {
        task_id: task.id,
        status: task.status,
        prompt: task.prompt,
        input_images: inputImages,
        number_of_outputs: task.numberOfOutputs,
        parameters: parameters,
        results: results,
        error_message: task.errorMessage,
        provider_task_id: task.providerTaskId,
        progress: task.progress,
        duration_ms: task.durationMs,
        created_at: task.createdAt.toISOString(),
        updated_at: task.updatedAt.toISOString(),
        completed_at: task.completedAt?.toISOString() || null,
        model: {
          id: task.model.id,
          slug: task.model.slug,
          name: task.model.name,
          output_type: task.model.outputType,
          provider: {
            id: task.model.provider.id,
            slug: task.model.provider.slug,
            name: task.model.provider.name,
          },
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[AI Generation External API] Get task error:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

