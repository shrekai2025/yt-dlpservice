import { NextRequest, NextResponse } from 'next/server'
import { validateExternalApiKey, createAuthErrorResponse } from '~/lib/utils/auth'
import { parseTasksExtraMetadata } from '~/lib/utils/json'
import { db } from '~/server/db'
import { TaskProcessor } from '~/lib/services/task-processor'
import { validateVideoUrl, getPlatformFromUrl, getDownloadTypeDisplayName, createTaskSchema } from '~/lib/utils/validation'
import { Logger } from '~/lib/utils/logger'
import { z } from 'zod'

const taskProcessor = new TaskProcessor()

// 查询参数验证
const querySchema = z.object({
  status: z.enum(['PENDING', 'EXTRACTING', 'TRANSCRIBING', 'COMPLETED', 'FAILED']).optional(),
  platform: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0),
  orderBy: z.enum(['createdAt', 'updatedAt']).optional().default('createdAt'),
  orderDirection: z.enum(['asc', 'desc']).optional().default('desc')
})

/**
 * POST /api/external/tasks
 * 创建新的下载任务
 */
export async function POST(request: NextRequest) {
  try {
    // 验证API Key
    const authResult = validateExternalApiKey(request)
    if (!authResult.success) {
      return createAuthErrorResponse(authResult.error || 'Authentication failed')
    }

    // 解析和验证请求体
    const body = await request.json()
    const validation = createTaskSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.issues
      }, { status: 400 })
    }

    const { url, downloadType, compressionPreset, sttProvider, googleSttLanguage } = validation.data

    // 验证URL和获取平台信息
    const urlValidation = await validateVideoUrl(url)
    if (!urlValidation.isValid) {
      return NextResponse.json({
        success: false,
        error: urlValidation.error || '不支持的视频URL'
      }, { status: 400 })
    }

    const platform = urlValidation.platform!
    const normalizedUrl = urlValidation.normalizedUrl || url

    // 创建任务
    const task = await db.task.create({
      data: {
        url: normalizedUrl, // 使用标准化后的URL
        platform,
        downloadType,
        compressionPreset,
        sttProvider,
        googleSttLanguage,
        status: 'PENDING'
      }
    })

    Logger.info(`外部API创建任务: ${task.id}, URL: ${url}, 下载类型: ${getDownloadTypeDisplayName(downloadType)}`)

    // 异步启动任务处理
    taskProcessor.processTask(task.id).catch(error => {
      Logger.error(`外部API任务处理失败: ${task.id}, 错误: ${error}`)
    })

    return NextResponse.json({
      success: true,
      data: {
        id: task.id,
        url: task.url,
        platform: task.platform,
        downloadType: task.downloadType,
        compressionPreset: task.compressionPreset,
        status: task.status,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      },
      message: `任务创建成功，下载类型：${getDownloadTypeDisplayName(downloadType)}，压缩设置：${compressionPreset === 'none' ? '无压缩' : compressionPreset}`
    })

  } catch (error) {
    Logger.error(`外部API创建任务失败: ${error}`)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * GET /api/external/tasks
 * 获取任务列表
 */
export async function GET(request: NextRequest) {
  try {
    // 验证API Key
    const authResult = validateExternalApiKey(request)
    if (!authResult.success) {
      return createAuthErrorResponse(authResult.error || 'Authentication failed')
    }

    // 解析查询参数
    const { searchParams } = new URL(request.url)
    const queryValidation = querySchema.safeParse({
      status: searchParams.get('status'),
      platform: searchParams.get('platform'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
      orderBy: searchParams.get('orderBy'),
      orderDirection: searchParams.get('orderDirection')
    })

    if (!queryValidation.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid query parameters',
        details: queryValidation.error.issues
      }, { status: 400 })
    }

    const { status, platform, limit, offset, orderBy, orderDirection } = queryValidation.data

    // 构建查询条件
    const where = {
      ...(status && { status }),
      ...(platform && { platform })
    }

    // 查询任务
    const [tasks, total] = await Promise.all([
      db.task.findMany({
        where,
        orderBy: { [orderBy]: orderDirection },
        take: limit,
        skip: offset,
        select: {
          id: true,
          url: true,
          platform: true,
          title: true,
          status: true,
          downloadType: true,
          transcription: true,
          duration: true,
          fileSize: true,
          errorMessage: true,
          extraMetadata: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      db.task.count({ where })
    ])

    // 安全解析extraMetadata JSON字符串
    const tasksWithParsedMetadata = parseTasksExtraMetadata(tasks)

    return NextResponse.json({
      success: true,
      data: tasksWithParsedMetadata,
      pagination: {
        total,
        page: Math.floor(offset / limit) + 1,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })

  } catch (error) {
    Logger.error(`外部API获取任务列表失败: ${error}`)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 