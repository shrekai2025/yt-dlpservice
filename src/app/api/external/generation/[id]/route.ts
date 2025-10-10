/**
 * External Generation API - Get Generation Status
 *
 * GET /api/external/generation/:id
 * Requires X-API-Key header
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '~/server/db'
import { validateApiKey, hashApiKey } from '~/lib/auth/api-key'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
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

    // 2. Get request ID from params
    const params = await context.params
    const { id } = params

    // 3. Fetch generation request
    const generationRequest = await db.generationRequest.findUnique({
      where: { id },
      include: { provider: true },
    })

    if (!generationRequest || generationRequest.deletedAt) {
      return NextResponse.json(
        { error: `Generation request not found: ${id}` },
        { status: 404 }
      )
    }

    // 4. Build response
    const response = {
      id: generationRequest.id,
      status: generationRequest.status,
      model_identifier: generationRequest.modelIdentifier,
      prompt: generationRequest.prompt,
      input_images: JSON.parse(generationRequest.inputImages || '[]'),
      number_of_outputs: generationRequest.numberOfOutputs,
      parameters: JSON.parse(generationRequest.parameters || '{}'),
      results: generationRequest.results
        ? JSON.parse(generationRequest.results)
        : null,
      error_message: generationRequest.errorMessage,
      task_id: generationRequest.taskId,
      created_at: generationRequest.createdAt.toISOString(),
      updated_at: generationRequest.updatedAt.toISOString(),
      completed_at: generationRequest.completedAt?.toISOString() || null,
      duration_ms: generationRequest.durationMs ?? null,
      client_key_prefix: generationRequest.clientKeyPrefix,
      request_payload: generationRequest.requestPayload
        ? JSON.parse(generationRequest.requestPayload)
        : null,
      response_payload: generationRequest.responsePayload
        ? JSON.parse(generationRequest.responsePayload)
        : null,
      provider: {
        id: generationRequest.provider.id,
        name: generationRequest.provider.name,
        type: generationRequest.provider.type,
      },
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('[External API] Error:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
    const clientKeyHash = hashApiKey(apiKey)
    if (generationRequest.clientKeyHash && generationRequest.clientKeyHash !== clientKeyHash) {
      return NextResponse.json(
        { error: `Generation request not found: ${id}` },
        { status: 404 }
      )
    }
