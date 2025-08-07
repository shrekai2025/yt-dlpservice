import { NextRequest, NextResponse } from 'next/server'
import { validateExternalApiKey, createAuthErrorResponse } from '~/lib/utils/auth'
import { parseTaskExtraMetadata } from '~/lib/utils/json'
import { db } from '~/server/db'
import { Logger } from '~/lib/utils/logger'

/**
 * GET /api/external/tasks/[id]
 * 获取任务详情（包含转录文本）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证API Key
    const authResult = validateExternalApiKey(request)
    if (!authResult.success) {
      return createAuthErrorResponse(authResult.error || 'Authentication failed')
    }

    const { id } = await params

    // 查询任务详情
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

    // 安全解析extraMetadata JSON字符串
    const taskWithParsedMetadata = parseTaskExtraMetadata(task)

    return NextResponse.json({
      success: true,
      data: taskWithParsedMetadata
    })

  } catch (error) {
    Logger.error(`外部API获取任务详情失败: ${error}`)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 