/**
 * External AI Generation API - List Available Models
 *
 * GET /api/external/ai-generation/models
 * Requires X-API-Key header
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey } from '~/lib/auth/api-key'
import { modelService } from '~/lib/ai-generation/services/model-service'

export async function GET(request: NextRequest) {
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

    // 2. Get query parameters
    const searchParams = request.nextUrl.searchParams
    const outputType = searchParams.get('output_type') as 'IMAGE' | 'VIDEO' | 'AUDIO' | null

    // 3. List active models
    const models = await modelService.listModels({
      isActive: true,
      outputType: outputType || undefined,
    })

    // 4. Transform response
    const response = models.map((model) => ({
      slug: model.slug,
      name: model.name,
      description: model.description,
      output_type: model.outputType,
      provider: {
        slug: model.provider.slug,
        name: model.provider.name,
      },
      input_capabilities: model.inputCapabilities
        ? JSON.parse(model.inputCapabilities)
        : [],
      output_capabilities: model.outputCapabilities
        ? JSON.parse(model.outputCapabilities)
        : [],
      feature_tags: model.featureTags ? JSON.parse(model.featureTags) : [],
      function_tags: model.functionTags ? JSON.parse(model.functionTags) : [],
      usage_count: model.usageCount,
    }))

    return NextResponse.json(
      {
        models: response,
        total: response.length,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[AI Generation External API] List models error:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

