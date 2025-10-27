import { NextRequest, NextResponse } from 'next/server'
import { db } from '~/server/db'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as path from 'path'
import * as fs from 'fs/promises'
import { Logger } from '~/lib/utils/logger'

const execAsync = promisify(exec)

/**
 * POST /api/admin/media/trim-video
 *
 * 裁剪视频并保存为新文件
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fileId, startTime, endTime } = body

    Logger.info(`📥 收到时间裁剪请求: fileId=${fileId}, startTime=${startTime}, endTime=${endTime}`)
    Logger.info(`参数类型: fileId=${typeof fileId}, startTime=${typeof startTime}, endTime=${typeof endTime}`)

    // 验证参数
    if (!fileId || typeof startTime !== 'number' || typeof endTime !== 'number') {
      Logger.error(`参数验证失败: fileId=${fileId}, startTime=${startTime} (${typeof startTime}), endTime=${endTime} (${typeof endTime})`)
      return NextResponse.json(
        {
          success: false,
          error: '参数错误: 需要 fileId, startTime, endTime'
        },
        { status: 400 }
      )
    }

    if (startTime < 0 || endTime <= startTime) {
      Logger.error(`时间参数验证失败: startTime=${startTime}, endTime=${endTime}`)
      return NextResponse.json(
        {
          success: false,
          error: '时间参数错误: endTime 必须大于 startTime'
        },
        { status: 400 }
      )
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

    Logger.info(`🎬 开始裁剪视频:`)
    Logger.info(`  - 原文件: ${inputPath}`)
    Logger.info(`  - 开始时间: ${startTime}秒`)
    Logger.info(`  - 结束时间: ${endTime}秒`)
    Logger.info(`  - 裁剪时长: ${endTime - startTime}秒`)

    // 生成输出文件路径
    const timestamp = Date.now()
    const fileExt = path.extname(originalFile.name)
    const baseName = path.basename(originalFile.name, fileExt)
    const trimmedFileName = `${baseName}_trimmed_${timestamp}${fileExt}`

    const outputDir = path.join(process.cwd(), 'data', 'media-uploads')
    await fs.mkdir(outputDir, { recursive: true })

    const outputPath = path.join(outputDir, trimmedFileName)
    const relativeOutputPath = `data/media-uploads/${trimmedFileName}`

    // 使用 ffmpeg 裁剪视频
    // -ss: 开始时间
    // -to: 结束时间
    // -c copy: 直接复制流，不重新编码（快速）
    // -avoid_negative_ts make_zero: 避免负时间戳
    const duration = endTime - startTime
    const ffmpegCommand = `ffmpeg -i "${inputPath}" -ss ${startTime} -t ${duration} -c copy -avoid_negative_ts make_zero "${outputPath}"`

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
    let width: number | null = null
    let height: number | null = null
    let newDuration: number | null = duration

    try {
      const ffprobeCommand = `ffprobe -v error -select_streams v:0 -show_entries stream=width,height,duration -of csv=p=0 "${outputPath}"`
      const { stdout } = await execAsync(ffprobeCommand)
      const [w, h, d] = stdout.trim().split(',')
      width = w ? parseInt(w) : null
      height = h ? parseInt(h) : null
      newDuration = d ? parseFloat(d) : duration
    } catch (error) {
      Logger.warn(`⚠️ 无法获取视频元数据: ${error}`)
    }

    Logger.info(`✅ 视频裁剪完成:`)
    Logger.info(`  - 输出文件: ${outputPath}`)
    Logger.info(`  - 文件大小: ${(fileSize / 1024 / 1024).toFixed(2)}MB`)
    Logger.info(`  - 分辨率: ${width}x${height}`)
    Logger.info(`  - 时长: ${newDuration}秒`)

    // 创建新的媒体文件记录
    const newFile = await db.mediaFile.create({
      data: {
        userId: originalFile.userId,
        name: trimmedFileName,
        remark: `${originalFile.remark || originalFile.name} (裁剪片段)`,
        type: 'VIDEO',
        source: 'LOCAL',
        localPath: relativeOutputPath,
        fileSize: fileSize,
        duration: newDuration,
        width: width,
        height: height,
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
        fileName: trimmedFileName,
        fileSize: fileSize,
        duration: newDuration,
        width: width,
        height: height,
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
