/**
 * TuziKlingAdapter - TuZi Kling Video Generation
 *
 * 对应模型: tuzi-kling
 * 功能: 文生视频、图生视频
 */

import { BaseAdapter } from '../base-adapter'
import type {
  GenerationRequest,
  GenerationResult,
  AdapterResponse,
} from '../types'

interface TuziKlingTaskResponse {
  code: number
  msg: string
  data?: {
    taskId: string
  }
}

interface TuziKlingStatusResponse {
  code: number
  msg: string
  data?: {
    taskId: string
    status: string
    resultUrl?: string
    errorMessage?: string
  }
}

export class TuziKlingAdapter extends BaseAdapter {
  protected getAuthHeaders(apiKey: string): Record<string, string> {
    // TuZi 使用自定义认证头
    return {
      'X-API-Key': apiKey,
    }
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

      // 构建请求参数
      const payload: Record<string, unknown> = {
        prompt: request.prompt,
      }

      // 可选参数
      if (request.parameters?.duration) {
        payload.duration = request.parameters.duration
      }

      if (request.parameters?.mode) {
        payload.mode = request.parameters.mode
      }

      // 输入图片
      if (request.inputImages && request.inputImages.length > 0) {
        payload.imageUrl = request.inputImages[0]
      }

      this.log('info', 'Creating TuZi Kling task', payload)

      // 创建任务
      const response = await this.httpClient.post<TuziKlingTaskResponse>(
        '/api/v1/kling/generate',
        payload,
        {
          baseURL: this.getApiEndpoint(),
        }
      )

      const { code, msg, data } = response.data

      if (code !== 200 || !data?.taskId) {
        return {
          status: 'ERROR',
          message: msg || 'Failed to create task',
          error: {
            code: 'TASK_CREATION_FAILED',
            message: msg,
            isRetryable: true,
          },
        }
      }

      this.log('info', `Task created: ${data.taskId}`)

      // 返回异步任务
      return {
        status: 'PROCESSING',
        providerTaskId: data.taskId,
        message: 'Task submitted, polling required',
      }
    } catch (error: unknown) {
      this.log('error', 'TuZi Kling dispatch failed', error)

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
      const response = await this.httpClient.get<TuziKlingStatusResponse>(
        `/api/v1/kling/status/${taskId}`,
        {
          baseURL: this.getApiEndpoint(),
        }
      )

      const { code, msg, data } = response.data

      if (code !== 200 || !data) {
        return {
          status: 'ERROR',
          message: msg || 'Failed to fetch task status',
          providerTaskId: taskId,
        }
      }

      const { status, resultUrl, errorMessage } = data

      // 成功
      if (status === 'SUCCESS' && resultUrl) {
        const results: GenerationResult[] = [
          {
            type: 'video',
            url: resultUrl,
          },
        ]

        return {
          status: 'SUCCESS',
          results,
          message: 'Generation completed',
        }
      }

      // 处理中
      if (status === 'PROCESSING' || status === 'PENDING') {
        return {
          status: 'PROCESSING',
          providerTaskId: taskId,
          message: 'Task is still processing',
        }
      }

      // 失败
      return {
        status: 'ERROR',
        message: errorMessage || 'Generation failed',
        providerTaskId: taskId,
        error: {
          code: 'GENERATION_FAILED',
          message: errorMessage || 'Unknown error',
          isRetryable: false,
        },
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
