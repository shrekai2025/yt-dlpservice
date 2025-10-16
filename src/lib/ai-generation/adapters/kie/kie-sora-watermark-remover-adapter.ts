/**
 * KieSoraWatermarkRemoverAdapter - Kie.ai Sora Watermark Remover
 *
 * 对应模型: kie-sora-watermark-remover
 * 功能: 移除 Sora 2 视频水印
 *
 * API文档: https://api.kie.ai/api/v1/jobs/createTask
 * 定价: 10 credits ($0.05) per use
 */

import { BaseAdapter } from '../base-adapter'
import type {
  GenerationRequest,
  GenerationResult,
  AdapterResponse,
} from '../types'

interface KieSoraWatermarkRemoverTaskResponse {
  code: number
  msg: string
  data: {
    taskId: string
  }
}

interface KieSoraWatermarkRemoverStatusResponse {
  code: number
  msg: string
  data: {
    taskId: string
    model: string
    state: 'waiting' | 'success' | 'fail'
    param: string
    resultJson: string | null
    failCode: string | null
    failMsg: string | null
    costTime: number | null
    completeTime: number | null
    createTime: number
  }
}

interface KieSoraWatermarkRemoverResultJson {
  resultUrls: string[]
}

export class KieSoraWatermarkRemoverAdapter extends BaseAdapter {
  /**
   * 调度生成请求
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

      // 验证 video_url 参数
      const videoUrl = request.parameters?.video_url as string
      if (!videoUrl) {
        return {
          status: 'ERROR',
          message: 'Missing required parameter: video_url',
          error: {
            code: 'MISSING_PARAMETER',
            message: 'video_url is required',
            isRetryable: false,
          },
        }
      }

      // 验证 video_url 格式
      if (!videoUrl.startsWith('https://sora.chatgpt.com/')) {
        return {
          status: 'ERROR',
          message: 'Invalid video_url: must be a Sora 2 video URL from sora.chatgpt.com',
          error: {
            code: 'INVALID_PARAMETER',
            message: 'video_url must start with https://sora.chatgpt.com/',
            isRetryable: false,
          },
        }
      }

      // 构建 input 参数对象
      const input: Record<string, unknown> = {
        video_url: videoUrl,
      }

      // 构建完整的请求体
      const payload: Record<string, unknown> = {
        model: 'sora-watermark-remover',
        input,
      }

      // 可选参数: callBackUrl
      if (request.parameters?.callBackUrl) {
        payload.callBackUrl = request.parameters.callBackUrl
      }

      this.log('info', 'Creating Kie Sora Watermark Remover task', payload)

      // 创建任务
      const response = await this.httpClient.post<KieSoraWatermarkRemoverTaskResponse>(
        '/api/v1/jobs/createTask',
        payload,
        {
          baseURL: this.getApiEndpoint() || 'https://api.kie.ai',
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

      this.log('info', `Sora Watermark Remover task created: ${data.taskId}`)

      // 返回异步任务
      return {
        status: 'PROCESSING',
        providerTaskId: data.taskId,
        message: 'Watermark removal in progress',
      }
    } catch (error: unknown) {
      this.log('error', 'Kie Sora Watermark Remover dispatch failed', error)

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
      const response = await this.httpClient.get<KieSoraWatermarkRemoverStatusResponse>(
        '/api/v1/jobs/recordInfo',
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

      const { state, resultJson, failCode, failMsg } = data

      // 等待中
      if (state === 'waiting') {
        return {
          status: 'PROCESSING',
          providerTaskId: taskId,
          message: 'Waiting for watermark removal...',
        }
      }

      // 成功
      if (state === 'success' && resultJson) {
        let parsedResult: KieSoraWatermarkRemoverResultJson
        try {
          parsedResult = JSON.parse(resultJson) as KieSoraWatermarkRemoverResultJson
        } catch {
          return {
            status: 'ERROR',
            message: 'Failed to parse result JSON',
            providerTaskId: taskId,
          }
        }

        if (parsedResult.resultUrls && parsedResult.resultUrls.length > 0) {
          const results: GenerationResult[] = parsedResult.resultUrls.map((url) => ({
            type: 'video',
            url,
          }))

          return {
            status: 'SUCCESS',
            results,
            message: 'Watermark removal completed',
          }
        }
      }

      // 失败
      if (state === 'fail') {
        return {
          status: 'ERROR',
          message: failMsg || 'Watermark removal failed',
          providerTaskId: taskId,
          error: {
            code: failCode || 'GENERATION_FAILED',
            message: failMsg || 'Unknown error',
            isRetryable: false,
          },
        }
      }

      // 未知状态
      return {
        status: 'ERROR',
        message: `Unknown task state: ${state}`,
        providerTaskId: taskId,
      }
    } catch (error: unknown) {
      this.log('error', 'Failed to check Sora Watermark Remover task status', error)

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
