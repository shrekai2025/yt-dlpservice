import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '~/server/db'
import { validateApiKey, hashApiKey, extractKeyPrefix } from '~/lib/auth/api-key'

const querySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0),
})

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
    provider: record.provider
      ? {
          id: record.provider.id,
          name: record.provider.name,
          type: record.provider.type,
        }
      : null,
  }
}

export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('X-API-Key') || request.headers.get('x-api-key')

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

    const { searchParams } = new URL(request.url)
    const parsedQuery = querySchema.safeParse({
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    })

    if (!parsedQuery.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: parsedQuery.error.issues,
        },
        { status: 400 }
      )
    }

    const { limit, offset } = parsedQuery.data
    const clientKeyHash = hashApiKey(apiKey)
    const clientKeyPrefix = extractKeyPrefix(apiKey)

    const where = {
      deletedAt: null,
      clientKeyHash,
    }

    const [records, total] = await Promise.all([
      db.generationRequest.findMany({
        where,
        include: { provider: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.generationRequest.count({ where }),
    ])

    return NextResponse.json({
      data: records.map(mapGenerationRequest),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
      key: {
        prefix: clientKeyPrefix,
        name: keyInfo.name,
      },
    })
  } catch (error) {
    console.error('[External API] List generation tasks error:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
