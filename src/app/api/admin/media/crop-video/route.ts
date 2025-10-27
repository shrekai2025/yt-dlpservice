import { NextRequest, NextResponse } from 'next/server'
import { db } from '~/server/db'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as path from 'path'
import * as fs from 'fs/promises'
import { Logger } from '~/lib/utils/logger'

const execAsync = promisify(exec)

/**
 * POST /api/admin/media/crop-video
 *
 * 裁剪视频空间区域（可选：同时裁剪时间）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fileId, cropArea, startTime, endTime } = body

    // 验证参数
    if (!fileId || !cropArea) {
      return NextResponse.json(
        {
          success: false,
          error: '参数错误: 需要 fileId 和 cropArea'
        },
        { status: 400 }
      )
    }

    const { x, y, width, height } = cropArea

    if (
      typeof x !== 'number' ||
      typeof y !== 'number' ||
      typeof width !== 'number' ||
      typeof height !== 'number'
    ) {
      return NextResponse.json(
        {
          success: false,
          error: '裁剪区域参数错误: x, y, width, height 必须是数字'
        },
        { status: 400 }
      )
    }

    if (width <= 0 || height <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: '裁剪区域宽高必须大于0'
        },
        { status: 400 }
      )
    }

    // 如果提供了时间参数，验证它们
    if (startTime !== undefined || endTime !== undefined) {
      if (typeof startTime !== 'number' || typeof endTime !== 'number') {
        return NextResponse.json(
          {
            success: false,
            error: '时间参数错误: startTime 和 endTime 必须同时提供且为数字'
          },
          { status: 400 }
        )
      }

      if (startTime < 0 || endTime <= startTime) {
        return NextResponse.json(
          {
            success: false,
            error: '时间参数错误: endTime 必须大于 startTime'
          },
          { status: 400 }
        )
      }
    }

    // 查找原文件
    const originalFile = await db.mediaFile.findUnique({
      where: { id: fileId }
    })

    if (!originalFile) {
      return NextResponse.json(
        {
          success: false,
          error: '文件不存在'
        },
        { status: 404 }
      )
    }

    if (originalFile.type !== 'VIDEO') {
      return NextResponse.json(
        {
          success: false,
          error: '只能裁剪视频文件'
        },
        { status: 400 }
      )
    }

    // 记录文件信息用于调试
    Logger.info(`文件信息: source=${originalFile.source}, localPath=${originalFile.localPath}, originalPath=${originalFile.originalPath}`)

    // 获取原文件路径 - 支持多种路径来源
    let inputPath: string
    if (originalFile.localPath) {
      inputPath = path.join(process.cwd(), originalFile.localPath)
      Logger.info(`使用 localPath: ${inputPath}`)
    } else if (originalFile.originalPath) {
      // originalPath 可以是绝对路径（LOCAL_REF）或相对路径
      if (path.isAbsolute(originalFile.originalPath)) {
        inputPath = originalFile.originalPath
      } else {
        inputPath = path.join(process.cwd(), originalFile.originalPath)
      }
      Logger.info(`使用 originalPath: ${inputPath}`)
    } else {
      Logger.error(`无可用路径: localPath=${originalFile.localPath}, originalPath=${originalFile.originalPath}`)
      return NextResponse.json(
        {
          success: false,
          error: '无法获取文件路径，只能裁剪本地文件'
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

    // 确保宽高为偶数（H.264 编码要求）
    const cropWidth = Math.floor(width / 2) * 2
    const cropHeight = Math.floor(height / 2) * 2
    const cropX = Math.floor(x)
    const cropY = Math.floor(y)

    Logger.info(`✂️ 开始裁剪视频:`)
    Logger.info(`  - 原文件: ${inputPath}`)
    Logger.info(`  - 裁剪区域: X=${cropX}, Y=${cropY}, W=${cropWidth}, H=${cropHeight}`)
    if (startTime !== undefined && endTime !== undefined) {
      Logger.info(`  - 时间范围: ${startTime}秒 - ${endTime}秒`)
    }

    // 生成输出文件路径
    const timestamp = Date.now()
    const fileExt = path.extname(originalFile.name)
    const baseName = path.basename(originalFile.name, fileExt)
    const croppedFileName = `${baseName}_cropped_${timestamp}${fileExt}`

    const outputDir = path.join(process.cwd(), 'data', 'media-uploads')
    await fs.mkdir(outputDir, { recursive: true })

    const outputPath = path.join(outputDir, croppedFileName)
    const relativeOutputPath = `data/media-uploads/${croppedFileName}`

    // 构建 FFmpeg 命令
    let ffmpegCommand = `ffmpeg -i "${inputPath}"`

    // 如果有时间裁剪
    if (startTime !== undefined && endTime !== undefined) {
      const duration = endTime - startTime
      ffmpegCommand += ` -ss ${startTime} -t ${duration}`
    }

    // 添加空间裁剪滤镜
    ffmpegCommand += ` -vf "crop=${cropWidth}:${cropHeight}:${cropX}:${cropY}"`

    // 视频编码设置 - 高质量保留
    // 使用 libx264 编码器，CRF 18 是近乎无损的质量
    // preset slow 提供更好的压缩效率和质量
    // pix_fmt yuv420p 确保兼容性
    ffmpegCommand += ` -c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p`

    // 音频流直接复制（避免重新编码音频）
    ffmpegCommand += ` -c:a copy`

    // 输出文件
    ffmpegCommand += ` "${outputPath}"`

    Logger.info(`📝 执行 FFmpeg 命令...`)
    Logger.info(`   命令: ${ffmpegCommand}`)

    try {
      const { stdout, stderr } = await execAsync(ffmpegCommand, {
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      })

      if (stderr) {
        Logger.info(`FFmpeg stderr: ${stderr}`)
      }
    } catch (error: any) {
      Logger.error(`❌ FFmpeg 执行失败: ${error.message}`)

      // 清理可能创建的文件
      try {
        await fs.unlink(outputPath)
      } catch {}

      return NextResponse.json(
        {
          success: false,
          error: `视频裁剪失败: ${error.message}`
        },
        { status: 500 }
      )
    }

    // 获取输出文件信息
    const stats = await fs.stat(outputPath)
    const fileSize = stats.size

    // 获取视频元数据
    let outputWidth: number | null = null
    let outputHeight: number | null = null
    let outputDuration: number | null = null

    try {
      const ffprobeCommand = `ffprobe -v error -select_streams v:0 -show_entries stream=width,height,duration -of csv=p=0 "${outputPath}"`
      const { stdout } = await execAsync(ffprobeCommand)
      const [w, h, d] = stdout.trim().split(',')
      outputWidth = w ? parseInt(w) : null
      outputHeight = h ? parseInt(h) : null
      outputDuration = d ? parseFloat(d) : null
    } catch (error) {
      Logger.warn(`⚠️ 无法获取视频元数据: ${error}`)
    }

    Logger.info(`✅ 视频裁剪完成:`)
    Logger.info(`  - 输出文件: ${outputPath}`)
    Logger.info(`  - 文件大小: ${(fileSize / 1024 / 1024).toFixed(2)}MB`)
    Logger.info(`  - 分辨率: ${outputWidth}x${outputHeight}`)
    Logger.info(`  - 时长: ${outputDuration}秒`)

    // 创建新的媒体文件记录
    const newFile = await db.mediaFile.create({
      data: {
        userId: originalFile.userId,
        name: croppedFileName,
        remark: `${originalFile.remark || originalFile.name} (裁剪区域)`,
        type: 'VIDEO',
        source: 'LOCAL',
        localPath: relativeOutputPath,
        fileSize: fileSize,
        duration: outputDuration,
        width: outputWidth,
        height: outputHeight,
        mimeType: originalFile.mimeType,
        folderId: originalFile.folderId,
        actorId: originalFile.actorId,
      }
    })

    Logger.info(`✅ 新文件记录已创建: ${newFile.id}`)

    // 生成缩略图
    try {
      const { generateThumbnail } = await import('~/lib/services/thumbnail-generator')
      await generateThumbnail({
        userId: 'admin',
        fileId: newFile.id,
        localPath: outputPath,
        type: 'video'
      })
      Logger.info(`✅ 缩略图已生成`)
    } catch (error) {
      Logger.warn(`⚠️ 缩略图生成失败: ${error}`)
    }

    return NextResponse.json({
      success: true,
      data: {
        fileId: newFile.id,
        fileName: croppedFileName,
        fileSize: fileSize,
        duration: outputDuration,
        width: outputWidth,
        height: outputHeight,
      }
    })

  } catch (error: any) {
    Logger.error(`❌ 视频裁剪API错误: ${error.message}`)
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
