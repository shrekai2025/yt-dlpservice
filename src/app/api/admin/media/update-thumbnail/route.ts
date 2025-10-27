/**
 * API: 更新视频预览图
 *
 * 从视频的指定时间点提取帧作为新的预览图
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '~/server/db'
import ffmpeg from 'fluent-ffmpeg'
import path from 'path'
import fs from 'fs/promises'
import { Logger } from '~/lib/utils/logger'

const THUMBNAIL_SIZE = 400
const THUMBNAIL_DIR = 'data/media-thumbnails'

/**
 * 从视频指定时间点生成缩略图
 */
async function generateThumbnailAtTime(
  videoPath: string,
  outputPath: string,
  timeInSeconds: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    Logger.info(`开始生成缩略图: 视频=${videoPath}, 输出=${outputPath}, 时间=${timeInSeconds}秒`)

    // 使用 setStartTime 方法来精确定位时间点
    // 这个方法在 fluent-ffmpeg 中会在输入后应用 -ss，确保精确性
    const command = ffmpeg(videoPath)
      .setStartTime(timeInSeconds) // 精确跳转到指定时间
      .outputOptions([
        '-vframes 1', // 只提取一帧
        '-vf', `scale=${THUMBNAIL_SIZE}:-1`, // 缩放到指定宽度，高度自动
      ])
      .output(outputPath)
      .on('start', (commandLine) => {
        Logger.info(`FFmpeg 命令: ${commandLine}`)
      })
      .on('end', () => {
        Logger.info(`✅ 缩略图生成成功: ${outputPath}, 时间点: ${timeInSeconds}秒`)
        resolve()
      })
      .on('error', (error) => {
        Logger.error(`❌ 缩略图生成失败: ${error.message}`)
        reject(new Error(`Failed to generate thumbnail: ${error.message}`))
      })

    command.run()
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { fileId, timeInSeconds } = body

    Logger.info(`📥 收到更新预览图请求: fileId=${fileId}, timeInSeconds=${timeInSeconds}`)

    // 验证参数
    if (!fileId || typeof timeInSeconds !== 'number') {
      return NextResponse.json(
        { success: false, error: '缺少必要参数: fileId 和 timeInSeconds' },
        { status: 400 }
      )
    }

    if (timeInSeconds < 0) {
      return NextResponse.json(
        { success: false, error: 'timeInSeconds 必须大于等于 0' },
        { status: 400 }
      )
    }

    // 查找媒体文件
    const mediaFile = await db.mediaFile.findUnique({
      where: { id: fileId },
      select: {
        id: true,
        name: true,
        type: true,
        localPath: true,
        originalPath: true,
        sourceUrl: true,
        source: true,
        duration: true,
        userId: true,
      },
    })

    if (!mediaFile) {
      return NextResponse.json(
        { success: false, error: '媒体文件不存在' },
        { status: 404 }
      )
    }

    // 验证是否为视频文件
    if (mediaFile.type !== 'VIDEO') {
      return NextResponse.json(
        { success: false, error: '只能为视频文件设置预览图' },
        { status: 400 }
      )
    }

    // 验证时间点是否在视频时长范围内
    if (mediaFile.duration && timeInSeconds > mediaFile.duration) {
      return NextResponse.json(
        { success: false, error: `时间点不能超过视频时长 ${mediaFile.duration} 秒` },
        { status: 400 }
      )
    }

    // 记录文件信息用于调试
    Logger.info(`文件信息: source=${mediaFile.source}, localPath=${mediaFile.localPath}, originalPath=${(mediaFile as any).originalPath}`)

    // 确定视频源路径 - 支持多种路径来源
    let videoPath: string
    if (mediaFile.localPath) {
      videoPath = path.join(process.cwd(), mediaFile.localPath)
      Logger.info(`使用 localPath: ${videoPath}`)
    } else if ((mediaFile as any).originalPath) {
      // originalPath 可以是绝对路径（LOCAL_REF）或相对路径
      const originalPath = (mediaFile as any).originalPath
      if (path.isAbsolute(originalPath)) {
        videoPath = originalPath
      } else {
        videoPath = path.join(process.cwd(), originalPath)
      }
      Logger.info(`使用 originalPath: ${videoPath}`)
    } else if (mediaFile.sourceUrl) {
      return NextResponse.json(
        { success: false, error: '暂不支持从远程视频URL更新预览图，请先下载视频' },
        { status: 400 }
      )
    } else {
      Logger.error(`无可用路径: localPath=${mediaFile.localPath}, originalPath=${(mediaFile as any).originalPath}`)
      return NextResponse.json(
        { success: false, error: '视频文件路径不存在' },
        { status: 400 }
      )
    }

    // 检查视频文件是否存在
    try {
      await fs.access(videoPath)
    } catch {
      return NextResponse.json(
        { success: false, error: '视频文件不存在或无法访问' },
        { status: 404 }
      )
    }

    // 生成缩略图路径
    const userThumbnailDir = path.join(process.cwd(), THUMBNAIL_DIR, mediaFile.userId)
    await fs.mkdir(userThumbnailDir, { recursive: true })

    const thumbnailPath = path.join(userThumbnailDir, `${mediaFile.id}.jpg`)
    const relativeThumbnailPath = path.relative(process.cwd(), thumbnailPath)

    // 生成新的缩略图
    await generateThumbnailAtTime(videoPath, thumbnailPath, timeInSeconds)

    // 更新数据库中的缩略图路径
    await db.mediaFile.update({
      where: { id: fileId },
      data: {
        thumbnailPath: relativeThumbnailPath,
      },
    })

    Logger.info(`预览图更新成功: 文件=${fileId}, 时间=${timeInSeconds}秒, 路径=${relativeThumbnailPath}`)

    return NextResponse.json({
      success: true,
      data: {
        fileId,
        thumbnailPath: relativeThumbnailPath,
        timeInSeconds,
      },
    })
  } catch (error: any) {
    Logger.error(`更新预览图失败: ${error?.message || error}`)

    return NextResponse.json(
      { success: false, error: error?.message || '更新预览图失败' },
      { status: 500 }
    )
  }
}
