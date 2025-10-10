import { NextRequest, NextResponse } from 'next/server'
import { db } from '~/server/db'
import { Logger } from '~/lib/utils/logger'
import { parseTaskExtraMetadata } from '~/lib/utils/json'

/**
 * GET /api/admin/tasks/[id]
 * 内部管理用：获取任务详情（无需外部API鉴权）
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const task = await db.task.findUnique({
      where: { id },
      select: {
        id: true,
        url: true,
        platform: true,
        title: true,
        status: true,
        downloadType: true,
        videoPath: true,
        audioPath: true,
        transcription: true,
        tingwuTaskId: true,
        duration: true,
        fileSize: true,
        retryCount: true,
        errorMessage: true,
        extraMetadata: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!task) {
      return NextResponse.json({
        success: false,
        error: 'Task not found',
        message: '任务不存在'
      }, { status: 404 })
    }

    const payload = parseTaskExtraMetadata(task)

    return NextResponse.json({ success: true, data: payload })
  } catch (error) {
    Logger.error(`Admin获取任务详情失败: ${error}`)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
