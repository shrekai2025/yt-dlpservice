import { NextRequest, NextResponse } from 'next/server'
import { db } from '~/server/db'
import { validateApiKey, hashApiKey } from '~/lib/auth/api-key'

function mapGenerationRequest(record: any) {
  return {
    id: record.id,
    status: record.status,
    model_identifier: record.modelIdentifier,
    prompt: record.prompt,
    input_images: record.inputImages ? JSON.parse(record.inputImages) : [],
    number_of_outputs: record.numberOfOutputs,
    parameters: record.parameters ? JSON.parse(record.parameters) : {},
    results: record.results ? JSON.parse(record.results) : null,
    error_message: record.errorMessage,
    task_id: record.taskId,
    created_at: record.createdAt.toISOString(),
    updated_at: record.updatedAt.toISOString(),
    completed_at: record.completedAt ? record.completedAt.toISOString() : null,
    duration_ms: record.durationMs ?? null,
    client_key_prefix: record.clientKeyPrefix,
    request_payload: record.requestPayload ? JSON.parse(record.requestPayload) : null,
    response_payload: record.responsePayload ? JSON.parse(record.responsePayload) : null,
    provider: record.provider
      ? {
          id: record.provider.id,
          name: record.provider.name,
          type: record.provider.type,
        }
      : null,
  }
}

async function authenticate(request: NextRequest) {
  const apiKey = request.headers.get('X-API-Key') || request.headers.get('x-api-key')

  if (!apiKey) {
    return { error: NextResponse.json({ error: 'Missing X-API-Key header' }, { status: 401 }) }
  }

  const keyInfo = await validateApiKey(apiKey)

  if (!keyInfo) {
    return { error: NextResponse.json({ error: 'Invalid or inactive API key' }, { status: 401 }) }
  }

  return { apiKey, keyInfo }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(request)
    if ('error' in auth) return auth.error

    const params = await context.params
    const generationRequest = await db.generationRequest.findUnique({
      where: { id: params.id },
      include: { provider: true },
    })

    if (!generationRequest || generationRequest.deletedAt) {
      return NextResponse.json(
        { error: `Generation request not found: ${params.id}` },
        { status: 404 }
      )
    }

    const clientKeyHash = hashApiKey(auth.apiKey)
    if (generationRequest.clientKeyHash !== clientKeyHash) {
      return NextResponse.json(
        { error: `Generation request not found: ${params.id}` },
        { status: 404 }
      )
    }

    return NextResponse.json(mapGenerationRequest(generationRequest))
  } catch (error) {
    console.error('[External API] Get generation task error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(request)
    if ('error' in auth) return auth.error

    const params = await context.params
    const clientKeyHash = hashApiKey(auth.apiKey)

    const generationRequest = await db.generationRequest.findUnique({
      where: { id: params.id },
    })

    if (!generationRequest || generationRequest.deletedAt) {
      return NextResponse.json(null, { status: 204 })
    }

    if (generationRequest.clientKeyHash !== clientKeyHash) {
      return NextResponse.json(null, { status: 204 })
    }

    if (generationRequest.status === 'PROCESSING' || generationRequest.status === 'PENDING') {
      return NextResponse.json(
        { error: 'Task is still in progress and cannot be deleted' },
        { status: 409 }
      )
    }

    await db.generationRequest.update({
      where: { id: params.id },
      data: { deletedAt: new Date() },
    })

    return NextResponse.json(null, { status: 204 })
  } catch (error) {
    console.error('[External API] Delete generation task error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
