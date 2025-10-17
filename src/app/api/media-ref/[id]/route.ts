import { NextRequest, NextResponse } from 'next/server'
import { readFile, access } from 'fs/promises'
import { db } from '~/server/db'

/**
 * 访问引用的本地文件（LOCAL_REF模式）
 * 通过文件ID从数据库获取原始路径，然后读取文件
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 从数据库获取文件记录
    const file = await db.mediaFile.findUnique({
      where: { id },
      select: {
        originalPath: true,
        source: true,
        mimeType: true,
        name: true,
      },
    })

    if (!file) {
      return new NextResponse('File not found', { status: 404 })
    }

    // 只处理 LOCAL_REF 类型的文件
    if (file.source !== 'LOCAL_REF' || !file.originalPath) {
      return new NextResponse('Not a referenced file', { status: 400 })
    }

    // 检查文件是否存在
    try {
      await access(file.originalPath)
    } catch {
      return new NextResponse('File not found or inaccessible (offline)', { status: 404 })
    }

    // 读取文件
    const fileBuffer = await readFile(file.originalPath)

    // 使用存储的 MIME 类型或根据扩展名推断
    let contentType = file.mimeType || 'application/octet-stream'
    if (!file.mimeType) {
      const ext = file.originalPath.split('.').pop()?.toLowerCase()
      contentType =
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
    }

    // 返回文件
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600', // 1小时缓存（引用文件可能会变化）
        'Content-Disposition': `inline; filename="${encodeURIComponent(file.name)}"`,
      },
    })
  } catch (error) {
    console.error('Error serving referenced media file:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
