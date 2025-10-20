import { NextRequest, NextResponse } from 'next/server'
import { db } from '~/server/db'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as path from 'path'
import * as fs from 'fs/promises'
import { Logger } from '~/lib/utils/logger'

const execAsync = promisify(exec)

/**
 * POST /api/admin/media/rotate-video
 *
 * 将视频向右旋转90度并覆盖原文件
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fileId } = body

    // 验证参数
    if (!fileId) {
      return NextResponse.json(
        {
          success: false,
          error: '参数错误: 需要 fileId'
        },
        { status: 400 }
      )
    }

    // 查找文件
    const file = await db.mediaFile.findUnique({
      where: { id: fileId }
    })

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: '文件不存在'
        },
        { status: 404 }
      )
    }

    if (file.type !== 'VIDEO') {
      return NextResponse.json(
        {
          success: false,
          error: '只能旋转视频文件'
        },
        { status: 400 }
      )
    }

    // 获取文件路径
    let inputPath: string
    if (file.localPath) {
      inputPath = path.join(process.cwd(), file.localPath)
    } else if (file.originalPath && file.source === 'LOCAL_REF') {
      inputPath = file.originalPath
    } else {
      return NextResponse.json(
        {
          success: false,
          error: '无法获取文件路径，只能旋转本地文件'
        },
        { status: 400 }
      )
    }

    // 检查文件是否存在
    try {
      await fs.access(inputPath)
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: '文件不存在或无法访问'
        },
        { status: 404 }
      )
    }

    Logger.info(`🔄 开始旋转视频:`)
    Logger.info(`  - 文件: ${inputPath}`)
    Logger.info(`  - 旋转角度: 90° (顺时针)`)

    // 创建临时输出文件
    const tempPath = inputPath + '.rotating.mp4'

    // 使用 FFmpeg 旋转视频
    // -vf "transpose=1" - 顺时针旋转90度
    // transpose值:
    //   0 = 逆时针旋转90度并垂直翻转
    //   1 = 顺时针旋转90度
    //   2 = 逆时针旋转90度
    //   3 = 顺时针旋转90度并垂直翻转
    // -c:a copy - 音频流直接复制，不重新编码
    const ffmpegCommand = `ffmpeg -i "${inputPath}" -vf "transpose=1" -c:a copy "${tempPath}"`

    Logger.info(`📝 执行 FFmpeg 命令...`)

    try {
      const { stdout, stderr } = await execAsync(ffmpegCommand, {
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      })

      if (stderr) {
        Logger.info(`FFmpeg stderr: ${stderr}`)
      }
    } catch (error: any) {
      Logger.error(`❌ FFmpeg 执行失败: ${error.message}`)

      // 清理临时文件
      try {
        await fs.unlink(tempPath)
      } catch {}

      return NextResponse.json(
        {
          success: false,
          error: `视频旋转失败: ${error.message}`
        },
        { status: 500 }
      )
    }

    // 获取新文件信息
    const stats = await fs.stat(tempPath)
    const fileSize = stats.size

    // 获取视频元数据（宽高会互换）
    let width: number | null = null
    let height: number | null = null
    let duration: number | null = null

    try {
      const ffprobeCommand = `ffprobe -v error -select_streams v:0 -show_entries stream=width,height,duration -of csv=p=0 "${tempPath}"`
      const { stdout } = await execAsync(ffprobeCommand)
      const [w, h, d] = stdout.trim().split(',')
      width = w ? parseInt(w) : null
      height = h ? parseInt(h) : null
      duration = d ? parseFloat(d) : null
    } catch (error) {
      Logger.warn(`⚠️ 无法获取视频元数据: ${error}`)
    }

    Logger.info(`✅ 视频旋转完成:`)
    Logger.info(`  - 新文件大小: ${(fileSize / 1024 / 1024).toFixed(2)}MB`)
    Logger.info(`  - 新分辨率: ${width}x${height}`)

    // 备份原文件（可选）
    const backupPath = inputPath + '.backup'
    try {
      await fs.rename(inputPath, backupPath)
    } catch (error) {
      Logger.warn(`⚠️ 无法创建备份: ${error}`)
    }

    // 将旋转后的文件替换原文件
    try {
      await fs.rename(tempPath, inputPath)

      // 删除备份
      try {
        await fs.unlink(backupPath)
      } catch {}
    } catch (error: any) {
      Logger.error(`❌ 文件替换失败: ${error.message}`)

      // 恢复备份
      try {
        await fs.rename(backupPath, inputPath)
      } catch {}

      return NextResponse.json(
        {
          success: false,
          error: `文件替换失败: ${error.message}`
        },
        { status: 500 }
      )
    }

    // 更新数据库中的宽高信息（如果获取到了）
    if (width !== null && height !== null) {
      await db.mediaFile.update({
        where: { id: fileId },
        data: {
          width: width,
          height: height,
          fileSize: fileSize,
          duration: duration,
        }
      })
    }

    Logger.info(`✅ 数据库已更新`)

    // 重新生成缩略图
    try {
      const { generateThumbnail } = await import('~/lib/services/thumbnail-generator')
      await generateThumbnail({
        userId: file.userId,
        fileId: file.id,
        localPath: inputPath,
        type: 'video'
      })
      Logger.info(`✅ 缩略图已重新生成`)
    } catch (error) {
      Logger.warn(`⚠️ 缩略图生成失败: ${error}`)
    }

    return NextResponse.json({
      success: true,
      data: {
        fileId: file.id,
        fileSize: fileSize,
        width: width,
        height: height,
        duration: duration,
      }
    })

  } catch (error: any) {
    Logger.error(`❌ 视频旋转API错误: ${error.message}`)
    Logger.error(error.stack)

    return NextResponse.json(
      {
        success: false,
        error: error.message || '服务器内部错误'
      },
      { status: 500 }
    )
  }
}
