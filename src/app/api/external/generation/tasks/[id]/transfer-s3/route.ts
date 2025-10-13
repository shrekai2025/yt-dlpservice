/**
 * External Generation API - Transfer Task Images to S3
 *
 * POST /api/external/generation/tasks/:id/transfer-s3
 * Requires X-API-Key header
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey } from '~/lib/auth/api-key'
import { s3Uploader } from '~/lib/adapters/utils/s3-uploader'
import { db } from '~/server/db'
import axios from 'axios'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Validate API key
    const apiKey = request.headers.get('X-API-Key')

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing X-API-Key header' }, { status: 401 })
    }

    const keyInfo = await validateApiKey(apiKey)

    if (!keyInfo) {
      return NextResponse.json(
        { error: 'Invalid or inactive API key' },
        { status: 401 }
      )
    }

    console.log(`[Transfer S3 API] Authenticated: ${keyInfo.name}`)

    // 2. Check S3 configuration
    if (!s3Uploader.isConfigured()) {
      return NextResponse.json(
        {
          error: 'S3 storage not configured',
          message:
            'Please configure AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, and AWS_S3_BUCKET',
        },
        { status: 503 }
      )
    }

    // 3. Get task from database
    const taskId = params.id

    const task = await db.generationRequest.findUnique({
      where: { id: taskId },
      include: { provider: true },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // 4. Check if task is completed
    if (task.status !== 'SUCCESS') {
      return NextResponse.json(
        { error: 'Task is not completed successfully' },
        { status: 400 }
      )
    }

    // 5. Parse results
    let results: Array<{ type: string; url: string; metadata?: any }> = []

    try {
      if (task.results) {
        results = JSON.parse(task.results)
      }
    } catch (error) {
      console.error('[Transfer S3 API] Failed to parse results:', error)
      return NextResponse.json(
        { error: 'Invalid results format' },
        { status: 400 }
      )
    }

    if (results.length === 0) {
      return NextResponse.json(
        { error: 'No results to transfer' },
        { status: 400 }
      )
    }

    // 6. Transfer images to S3
    const transferredResults: Array<{ type: string; url: string; s3Url: string; metadata?: any }> = []
    const s3Prefix = task.provider?.s3PathPrefix || 'kie-images'

    for (const result of results) {
      if (result.type !== 'image') {
        console.log(`[Transfer S3 API] Skipping non-image result: ${result.type}`)
        continue
      }

      try {
        // Check if already an S3 URL
        if (result.url.includes('s3.amazonaws.com') || result.url.includes('amazonaws.com')) {
          console.log(`[Transfer S3 API] Already an S3 URL: ${result.url}`)
          transferredResults.push({
            ...result,
            s3Url: result.url,
          })
          continue
        }

        // Download image from original URL
        console.log(`[Transfer S3 API] Downloading image: ${result.url}`)
        const imageResponse = await axios.get(result.url, {
          responseType: 'arraybuffer',
          timeout: 30000,
        })

        const imageBuffer = Buffer.from(imageResponse.data)

        // Determine content type
        const contentType = imageResponse.headers['content-type'] || 'image/png'

        // Upload to S3
        console.log(`[Transfer S3 API] Uploading to S3...`)
        const s3Url = await s3Uploader.uploadBuffer(imageBuffer, s3Prefix, contentType)

        console.log(`[Transfer S3 API] Uploaded successfully: ${s3Url}`)

        // Extract stored filename and s3Key from URL
        const urlParts = s3Url.split('/')
        const storedName = urlParts[urlParts.length - 1]
        if (!storedName) {
          throw new Error('Failed to extract filename from S3 URL')
        }

        const s3Key = `${s3Prefix}/${storedName}`

        // Save to database (StorageFile table)
        try {
          await db.storageFile.create({
            data: {
              fileName: storedName, // Use the generated filename
              storedName: storedName,
              s3Url: s3Url,
              s3Key: s3Key,
              fileSize: imageBuffer.length,
              mimeType: contentType,
              pathPrefix: s3Prefix,
            },
          })
          console.log(`[Transfer S3 API] File recorded in database: ${storedName}`)
        } catch (dbError) {
          console.error(`[Transfer S3 API] Failed to save to database:`, dbError)
          // Continue even if database save fails
        }

        transferredResults.push({
          ...result,
          url: s3Url,
          s3Url,
          metadata: {
            ...result.metadata,
            originalUrl: result.url,
            transferredAt: new Date().toISOString(),
          },
        })
      } catch (error) {
        console.error(`[Transfer S3 API] Failed to transfer image ${result.url}:`, error)
        // Continue with other images even if one fails
        transferredResults.push({
          ...result,
          s3Url: result.url, // Keep original URL
          metadata: {
            ...result.metadata,
            transferError: error instanceof Error ? error.message : 'Unknown error',
          },
        })
      }
    }

    // 7. Update task with new S3 URLs
    await db.generationRequest.update({
      where: { id: taskId },
      data: {
        results: JSON.stringify(transferredResults),
      },
    })

    console.log(`[Transfer S3 API] Task updated successfully: ${taskId}`)

    return NextResponse.json(
      {
        success: true,
        taskId: taskId,
        transferred: transferredResults.length,
        results: transferredResults,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Transfer S3 API] Unhandled error:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
