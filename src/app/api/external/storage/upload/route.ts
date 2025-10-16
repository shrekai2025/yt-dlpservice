/**
 * External Storage API - Upload File to S3
 *
 * POST /api/external/storage/upload
 * Requires X-API-Key header
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey } from '~/lib/auth/api-key'
import { s3Uploader } from '~/lib/services/s3-uploader'
import { db } from '~/server/db'

export async function POST(request: NextRequest) {
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

    console.log(`[Storage API] Authenticated: ${keyInfo.name}`)

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

    // 3. Parse request body
    const contentType = request.headers.get('content-type')
    const pathPrefix = 'yt' // 固定为 "yt"

    let fileData: string
    let fileName: string | undefined
    let originalFileName: string | undefined
    let mimeType: string | undefined
    let fileSize: number = 0

    if (contentType?.includes('application/json')) {
      // JSON format
      const body = await request.json()

      if (!body.fileData) {
        return NextResponse.json(
          { error: 'Missing fileData in request body' },
          { status: 400 }
        )
      }

      fileData = body.fileData
      fileName = body.fileName
      originalFileName = body.fileName
      mimeType = body.contentType

      // Calculate file size from base64
      const base64Length = fileData.length
      fileSize = Math.floor((base64Length * 3) / 4)
    } else if (contentType?.includes('multipart/form-data')) {
      // Form data (file upload)
      const formData = await request.formData()
      const file = formData.get('file') as File | null

      if (!file) {
        return NextResponse.json({ error: 'Missing file in form data' }, { status: 400 })
      }

      // Check file size limit (500MB)
      const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500MB in bytes
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            error: 'File too large',
            message: 'Maximum file size is 500MB',
            maxSize: MAX_FILE_SIZE,
            actualSize: file.size,
          },
          { status: 400 }
        )
      }

      // Read file as buffer
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      fileData = buffer.toString('base64')

      originalFileName = file.name
      fileName = formData.get('fileName') as string | undefined
      if (!fileName) {
        // Extract filename from uploaded file (without extension)
        fileName = file.name.replace(/\.[^/.]+$/, '')
      }

      mimeType = file.type || undefined
      fileSize = file.size
    } else {
      return NextResponse.json(
        {
          error: 'Invalid content type',
          message: 'Use application/json or multipart/form-data',
        },
        { status: 400 }
      )
    }

    // 4. Decode base64 and upload
    const buffer = Buffer.from(fileData, 'base64')

    const url = await s3Uploader.uploadBuffer(buffer, pathPrefix, mimeType, fileName)

    // 5. Extract stored filename and s3Key from URL
    const urlParts = url.split('/')
    const storedName = urlParts[urlParts.length - 1]
    if (!storedName) {
      throw new Error('Failed to extract filename from S3 URL')
    }

    const s3Key = `${pathPrefix}/${storedName}`

    // 6. Save to database
    await db.storageFile.create({
      data: {
        fileName: originalFileName || storedName,
        storedName: storedName,
        s3Url: url,
        s3Key: s3Key,
        fileSize: fileSize,
        mimeType: mimeType || null,
        pathPrefix: pathPrefix,
      },
    })

    console.log(`[Storage API] File recorded in database: ${storedName}`)

    return NextResponse.json(
      {
        success: true,
        url,
        message: 'File uploaded successfully',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Storage API] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Upload failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
