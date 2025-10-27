import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params
    const filePath = join(process.cwd(), 'data', 'media-thumbnails', ...path)

    // Security check: ensure the path is within the media-thumbnails directory
    const normalizedPath = join(process.cwd(), 'data', 'media-thumbnails')
    if (!filePath.startsWith(normalizedPath)) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    // Check if file exists
    if (!existsSync(filePath)) {
      return new NextResponse('Not Found', { status: 404 })
    }

    // Read the file
    const fileBuffer = await readFile(filePath)

    // Determine content type based on file extension
    const ext = filePath.split('.').pop()?.toLowerCase()
    const contentType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
                       ext === 'png' ? 'image/png' :
                       ext === 'webp' ? 'image/webp' :
                       'application/octet-stream'

    // Return the file with appropriate headers
    // Use shorter cache time to allow thumbnail updates
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=300, must-revalidate', // 5分钟缓存，允许重新验证
        'Last-Modified': new Date().toUTCString(),
      },
    })
  } catch (error) {
    console.error('Error serving media thumbnail:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
