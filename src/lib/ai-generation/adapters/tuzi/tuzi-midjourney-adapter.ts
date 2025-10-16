/**
 * TuziMidjourneyAdapter - TuZi Midjourney Image & Video Generation
 *
 * 对应模型: tuzi-midjourney-image, tuzi-midjourney-video
 * 功能: Midjourney 图像和视频生成
 */

import { BaseAdapter } from '../base-adapter'
import type {
  GenerationRequest,
  GenerationResult,
  AdapterResponse,
} from '../types'

interface TuziMjTaskResponse {
  code: number
  result?: string // Task ID
  description?: string
}

interface TuziMjStatusResponse {
  code: number
  result?: {
    status: string
    imageUrl?: string
    uri?: string
    buttons?: Array<{ label: string; customId: string }>
  }
  description?: string
}

export class TuziMidjourneyAdapter extends BaseAdapter {
  protected getAuthHeaders(apiKey: string): Record<string, string> {
    return {
      'mj-api-secret': apiKey,
    }
  }

  /**
   * 判断是图像还是视频任务
   */
  private isVideoTask(parameters?: Record<string, unknown>): boolean {
    const action = parameters?.action as string
    return action === 'video' || action === 'extend'
  }

  /**
   * 调度生成请求
   */
  async dispatch(request: GenerationRequest): Promise<AdapterResponse> {
    try {
      const apiKey = this.getApiKey()
      if (!apiKey) {
        return {
          status: 'ERROR',
          message: 'Missing API key for TuZi',
          error: {
            code: 'MISSING_API_KEY',
            message: 'API key is required',
            isRetryable: false,
          },
        }
      }

      const isVideo = this.isVideoTask(request.parameters)
      const endpoint = isVideo
        ? '/mj/submit/action'
        : '/mj/submit/imagine'

      // 构建请求参数
      const payload: Record<string, unknown> = {
        prompt: request.prompt,
      }

      // 复制所有参数
      if (request.parameters) {
        Object.assign(payload, request.parameters)
      }

      // 处理 base64Array（图片上传）
      if (request.inputImages && request.inputImages.length > 0) {
        const base64Array = request.inputImages.map((img) => {
          // 如果是 URL，直接返回；如果是 base64，去掉前缀
          if (img.startsWith('http')) {
            return img
          }
          return img.replace(/^data:image\/[a-z]+;base64,/, '')
        })
        payload.base64Array = base64Array
      }

      this.log('info', `Creating TuZi Midjourney ${isVideo ? 'video' : 'image'} task`, payload)

      // 创建任务
      const response = await this.httpClient.post<TuziMjTaskResponse>(
        endpoint,
        payload,
        {
          baseURL: this.getApiEndpoint(),
        }
      )

      const { code, result, description } = response.data

      if (code !== 1 || !result) {
        return {
          status: 'ERROR',
          message: description || 'Failed to create task',
          error: {
            code: 'TASK_CREATION_FAILED',
            message: description || 'Unknown error',
            isRetryable: true,
          },
        }
      }

      this.log('info', `Task created: ${result}`)

      // 返回异步任务
      return {
        status: 'PROCESSING',
        providerTaskId: result,
        message: 'Task submitted, polling required',
      }
    } catch (error: unknown) {
      this.log('error', 'TuZi Midjourney dispatch failed', error)

      return {
        status: 'ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: {
          code: 'DISPATCH_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          isRetryable: true,
        },
      }
    }
  }

  /**
   * 检查任务状态
   */
  async checkTaskStatus(taskId: string): Promise<AdapterResponse> {
    try {
      const response = await this.httpClient.get<TuziMjStatusResponse>(
        `/mj/task/${taskId}/fetch`,
        {
          baseURL: this.getApiEndpoint(),
        }
      )

      const { code, result, description } = response.data

      if (code !== 1 || !result) {
        return {
          status: 'ERROR',
          message: description || 'Failed to fetch task status',
          providerTaskId: taskId,
        }
      }

      const { status, imageUrl, uri } = result

      // 成功
      if (status === 'SUCCESS' && (imageUrl || uri)) {
        const url = imageUrl || uri || ''
        const results: GenerationResult[] = [
          {
            type: 'image', // TuZi MJ 主要是图像
            url,
          },
        ]

        return {
          status: 'SUCCESS',
          results,
          message: 'Generation completed',
        }
      }

      // 处理中
      if (
        status === 'IN_PROGRESS' ||
        status === 'SUBMITTED' ||
        status === 'PENDING'
      ) {
        return {
          status: 'PROCESSING',
          providerTaskId: taskId,
          message: `Task status: ${status}`,
        }
      }

      // 失败
      if (status === 'FAILURE' || status === 'FAILED') {
        return {
          status: 'ERROR',
          message: description || 'Generation failed',
          providerTaskId: taskId,
          error: {
            code: 'GENERATION_FAILED',
            message: description || 'Unknown error',
            isRetryable: false,
          },
        }
      }

      // 其他状态
      return {
        status: 'PROCESSING',
        providerTaskId: taskId,
        message: `Task status: ${status}`,
      }
    } catch (error: unknown) {
      this.log('error', 'Failed to check task status', error)

      return {
        status: 'ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        providerTaskId: taskId,
        error: {
          code: 'STATUS_CHECK_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          isRetryable: true,
        },
      }
    }
  }
}
