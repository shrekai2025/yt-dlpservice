import { NextRequest, NextResponse } from 'next/server'
import { stat } from 'fs/promises'
import { join } from 'path'
import { existsSync, createReadStream } from 'fs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params
    const filePath = join(process.cwd(), 'data', 'media-uploads', ...path)

    // Security check: ensure the path is within the media-uploads directory
    const normalizedPath = join(process.cwd(), 'data', 'media-uploads')
    if (!filePath.startsWith(normalizedPath)) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    // Check if file exists
    if (!existsSync(filePath)) {
      return new NextResponse('Not Found', { status: 404 })
    }

    // Get file stats
    const fileStats = await stat(filePath)
    const fileSize = fileStats.size

    // Determine content type based on file extension
    const ext = filePath.split('.').pop()?.toLowerCase()
    const contentType =
      ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
      ext === 'png' ? 'image/png' :
      ext === 'gif' ? 'image/gif' :
      ext === 'webp' ? 'image/webp' :
      ext === 'mp4' ? 'video/mp4' :
      ext === 'webm' ? 'video/webm' :
      ext === 'mov' ? 'video/quicktime' :
      ext === 'mp3' ? 'audio/mpeg' :
      ext === 'wav' ? 'audio/wav' :
      ext === 'ogg' ? 'audio/ogg' :
      'application/octet-stream'

    // Check for Range header (for video streaming)
    const range = request.headers.get('range')

    if (range) {
      // Parse range header
      const parts = range.replace(/bytes=/, '').split('-')
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
      const chunkSize = (end - start) + 1

      // Use stream for partial content (more efficient for large files)
      const stream = createReadStream(filePath, { start, end })

      // Convert Node.js ReadableStream to Web ReadableStream
      const webStream = new ReadableStream({
        start(controller) {
          stream.on('data', (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)))
          stream.on('end', () => controller.close())
          stream.on('error', (error) => controller.error(error))
        },
        cancel() {
          stream.destroy()
        }
      })

      // Return partial content with stream
      return new NextResponse(webStream, {
        status: 206,
        headers: {
          'Content-Type': contentType,
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize.toString(),
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      })
    }

    // For full file, also use streaming
    const stream = createReadStream(filePath)

    // Convert Node.js ReadableStream to Web ReadableStream
    const webStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)))
        stream.on('end', () => controller.close())
        stream.on('error', (error) => controller.error(error))
      },
      cancel() {
        stream.destroy()
      }
    })

    // Return the file with appropriate headers
    return new NextResponse(webStream, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileSize.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Error serving media file:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
