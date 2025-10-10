import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '~/server/db'
import { validateApiKey } from '~/lib/auth/api-key'

const querySchema = z.object({
  type: z.enum(['image', 'video', 'stt']).optional(),
  include_inactive: z
    .union([z.literal('true'), z.literal('false'), z.boolean()])
    .optional()
    .transform((value) => {
      if (value === undefined) return false
      if (typeof value === 'boolean') return value
      return value === 'true'
    }),
})

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
      type: searchParams.get('type') || undefined,
      include_inactive: searchParams.get('include_inactive') || undefined,
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

    const { type, include_inactive } = parsedQuery.data

    const providers = await db.apiProvider.findMany({
      where: {
        ...(type ? { type } : {}),
        ...(include_inactive ? {} : { isActive: true }),
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    })

    return NextResponse.json({
      data: providers.map((provider) => ({
        id: provider.id,
        name: provider.name,
        model_identifier: provider.modelIdentifier,
        type: provider.type,
        provider: provider.provider,
        is_active: provider.isActive,
        call_count: provider.callCount,
      })),
      key: {
        name: keyInfo.name,
      },
    })
  } catch (error) {
    console.error('[External API] List generation providers error:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
