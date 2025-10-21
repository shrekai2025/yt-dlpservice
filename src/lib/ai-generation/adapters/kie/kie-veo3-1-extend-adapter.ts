/**
 * KieVeo31ExtendAdapter - Kie.ai Veo 3.1 Video Extension
 *
 * 对应模型: kie-veo3-1-extend
 * 功能: 基于已生成的视频进行扩展（Veo 3.1 Extend）
 *
 * API文档: https://api.kie.ai/api/v1/veo/extend
 *
 * 价格: 60 Credits per extension
 */

import { BaseAdapter } from '../base-adapter'
import type {
  GenerationRequest,
  GenerationResult,
  AdapterResponse,
} from '../types'

interface KieVeo31ExtendTaskResponse {
  code: number
  msg: string
  data: {
    taskId: string
  }
}

interface KieVeo31ExtendStatusResponse {
  code: number
  msg: string
  data: {
    taskId: string
    paramJson: string
    completeTime: string | null
    response: {
      taskId: string
      resultUrls: string[]
      originUrls?: string[]
      resolution: string
    } | null
    successFlag: 0 | 1 | 2 | 3  // 0: Generating, 1: Success, 2: Failed, 3: Generation Failed
    errorCode: number | null
    errorMessage: string | null
    createTime: string
    fallbackFlag: boolean
  }
}

export class KieVeo31ExtendAdapter extends BaseAdapter {
  /**
   * 调度扩展请求
   */
  async dispatch(request: GenerationRequest): Promise<AdapterResponse> {
    try {
      const apiKey = this.getApiKey()
      if (!apiKey) {
        return {
          status: 'ERROR',
          message: 'Missing API key for Kie.ai',
          error: {
            code: 'MISSING_API_KEY',
            message: 'API key is required',
            isRetryable: false,
          },
        }
      }

      // 获取原始视频的taskId（必需参数）
      const parentTaskId = request.parameters?.parentTaskId as string | undefined
      if (!parentTaskId) {
        return {
          status: 'ERROR',
          message: 'Missing parentTaskId parameter. Please provide the taskId of the original video.',
          error: {
            code: 'MISSING_PARENT_TASK_ID',
            message: 'parentTaskId is required for video extension',
            isRetryable: false,
          },
        }
      }

      // 构建请求参数
      const payload: Record<string, unknown> = {
        taskId: parentTaskId,
        prompt: request.prompt,
      }

      // 可选参数: seeds
      if (request.parameters?.seeds) {
        payload.seeds = request.parameters.seeds
      }

      // 可选参数: watermark
      if (request.parameters?.watermark) {
        payload.watermark = request.parameters.watermark
      }

      // 可选参数: callBackUrl
      if (request.parameters?.callBackUrl) {
        payload.callBackUrl = request.parameters.callBackUrl
      }

      this.log('info', 'Creating Kie Veo 3.1 Extend task', payload)

      // 创建扩展任务
      const response = await this.httpClient.post<KieVeo31ExtendTaskResponse>(
        '/api/v1/veo/extend',
        payload,
        {
          baseURL: this.getApiEndpoint() || 'https://api.kie.ai',
        }
      )

      const { code, msg, data } = response.data

      if (code !== 200 || !data?.taskId) {
        return {
          status: 'ERROR',
          message: msg || 'Failed to create extension task',
          error: {
            code: 'TASK_CREATION_FAILED',
            message: msg,
            isRetryable: code === 429 || code >= 500, // 429 或 5xx 可重试
          },
        }
      }

      this.log('info', `Veo 3.1 Extend task created: ${data.taskId}`)

      // 返回异步任务
      return {
        status: 'PROCESSING',
        providerTaskId: data.taskId,
        message: 'Video extension in progress',
      }
    } catch (error: unknown) {
      this.log('error', 'Kie Veo 3.1 Extend dispatch failed', error)

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
   * 检查任务状态（复用Veo 3.1的状态查询接口）
   */
  async checkTaskStatus(taskId: string): Promise<AdapterResponse> {
    try {
      const response = await this.httpClient.get<KieVeo31ExtendStatusResponse>(
        '/api/v1/veo/record-info',
        {
          baseURL: this.getApiEndpoint() || 'https://api.kie.ai',
          params: { taskId },
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

      const { successFlag, response: taskResponse, errorCode, errorMessage } = data

      // 处理中 (successFlag = 0)
      if (successFlag === 0) {
        return {
          status: 'PROCESSING',
          providerTaskId: taskId,
          message: 'Extending video...',
        }
      }

      // 成功 (successFlag = 1)
      if (successFlag === 1 && taskResponse?.resultUrls && taskResponse.resultUrls.length > 0) {
        const results: GenerationResult[] = taskResponse.resultUrls.map((url) => ({
          type: 'video',
          url,
        }))

        return {
          status: 'SUCCESS',
          results,
          message: 'Video extension completed',
        }
      }

      // 失败 (successFlag = 2 或 3)
      if (successFlag === 2 || successFlag === 3) {
        return {
          status: 'ERROR',
          message: errorMessage || 'Extension failed',
          providerTaskId: taskId,
          error: {
            code: errorCode ? String(errorCode) : 'EXTENSION_FAILED',
            message: errorMessage || 'Unknown error',
            isRetryable: errorCode === 500, // 500 错误可重试
          },
        }
      }

      // 未知状态
      return {
        status: 'ERROR',
        message: `Unknown task state: successFlag=${successFlag}`,
        providerTaskId: taskId,
      }
    } catch (error: unknown) {
      this.log('error', 'Failed to check Veo 3.1 Extend task status', error)

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
