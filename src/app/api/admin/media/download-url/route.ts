/**
 * API: 下载URL到媒体浏览器
 *
 * 创建URL2STT任务并在下载完成后将文件移动到媒体浏览器
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '~/server/db'
import { taskProcessor } from '~/lib/init'
import { validateVideoUrl, getDownloadTypeDisplayName } from '~/lib/utils/validation'
import { Logger } from '~/lib/utils/logger'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { url, downloadType, folderId } = body

    Logger.info(`下载URL请求: url=${url}, type=${downloadType}, folderId=${folderId}`)

    // 验证参数
    if (!url || !downloadType) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数: url 和 downloadType' },
        { status: 400 }
      )
    }

    if (!['audio', 'video', 'video+audio', 'AUDIO_ONLY', 'VIDEO_ONLY', 'BOTH'].includes(downloadType)) {
      return NextResponse.json(
        { success: false, error: 'downloadType 必须是 AUDIO_ONLY, VIDEO_ONLY 或 BOTH' },
        { status: 400 }
      )
    }

    // 验证URL
    const urlValidation = await validateVideoUrl(url)
    if (!urlValidation.isValid) {
      return NextResponse.json(
        { success: false, error: urlValidation.error || '不支持的视频URL' },
        { status: 400 }
      )
    }

    const platform = urlValidation.platform!
    const normalizedUrl = urlValidation.normalizedUrl || url

    // 获取userId（从文件夹或默认admin）
    let userId = 'admin'

    // 验证文件夹（如果提供且不为空）
    if (folderId && folderId !== null && folderId !== undefined) {
      Logger.info(`验证文件夹: ${folderId}`)
      const folder = await db.mediaFolder.findUnique({
        where: { id: folderId },
      })
      if (!folder) {
        Logger.warn(`文件夹不存在: ${folderId}`)
        return NextResponse.json(
          { success: false, error: `文件夹不存在: ${folderId}` },
          { status: 404 }
        )
      }
      Logger.info(`文件夹验证成功: ${folder.name}`)
      userId = folder.userId // 使用文件夹的userId
    } else {
      Logger.info(`未指定文件夹，文件将保存到根目录，使用默认用户: ${userId}`)
    }

    // 创建 URL2STT 任务
    const task = await db.task.create({
      data: {
        url: normalizedUrl,
        platform,
        downloadType,
        compressionPreset: 'none', // 不压缩
        sttProvider: 'none', // 不识别
        enableTranscription: false, // 不转录
        status: 'PENDING',
        s3TransferFileType: 'none', // 不转存
        s3TransferStatus: 'none',
        s3TransferProgress: '未启用',
        // 存储媒体浏览器相关信息
        extraMetadata: JSON.stringify({
          moveToMediaBrowser: true,
          userId: userId,
          folderId: folderId || null,
        }),
      },
    })

    Logger.info(`创建下载URL任务: ${task.id}, URL: ${normalizedUrl}, 类型: ${downloadType}, 用户: ${userId}`)

    // 异步处理任务
    setImmediate(() => {
      taskProcessor.processTask(task.id).catch((error: any) => {
        Logger.error(`下载URL任务处理失败: ${task.id}, 错误: ${error}`)
      })
    })

    return NextResponse.json({
      success: true,
      data: {
        taskId: task.id,
        url: normalizedUrl,
        downloadType,
        message: `任务创建成功，下载类型：${getDownloadTypeDisplayName(downloadType)}`,
      },
    })
  } catch (error: any) {
    Logger.error(`创建下载URL任务失败: ${error?.message || error}`)

    return NextResponse.json(
      { success: false, error: error?.message || '创建下载任务失败' },
      { status: 500 }
    )
  }
}
