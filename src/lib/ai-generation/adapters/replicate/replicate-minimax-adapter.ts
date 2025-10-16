/**
 * ReplicateMinimaxAdapter - Replicate Minimax Video Generation
 *
 * 对应模型: replicate-minimax
 * 功能: 文生视频
 */

import { BaseAdapter } from '../base-adapter'
import type {
  GenerationRequest,
  GenerationResult,
  AdapterResponse,
} from '../types'

interface ReplicatePredictionResponse {
  id: string
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled'
  output?: string | string[] | null
  error?: string | null
}

export class ReplicateMinimaxAdapter extends BaseAdapter {
  protected getAuthHeaders(apiKey: string): Record<string, string> {
    return {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
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
          message: 'Missing API key for Replicate',
          error: {
            code: 'MISSING_API_KEY',
            message: 'API key is required',
            isRetryable: false,
          },
        }
      }

      // 构建请求参数
      const input: Record<string, unknown> = {
        prompt: request.prompt,
      }

      // 可选参数
      if (request.parameters?.duration !== undefined) {
        input.duration = request.parameters.duration
      }

      if (request.parameters?.aspect_ratio) {
        input.aspect_ratio = request.parameters.aspect_ratio
      }

      if (request.parameters?.seed !== undefined) {
        input.seed = request.parameters.seed
      }

      const payload = {
        input,
      }

      this.log('info', 'Creating Replicate Minimax prediction', payload)

      // 创建预测任务
      const response = await this.httpClient.post<ReplicatePredictionResponse>(
        '/v1/predictions',
        payload,
        {
          baseURL: this.getApiEndpoint() || 'https://api.replicate.com',
        }
      )

      const { id, status, error } = response.data

      if (!id) {
        return {
          status: 'ERROR',
          message: error || 'Failed to create prediction',
          error: {
            code: 'PREDICTION_CREATION_FAILED',
            message: error || 'Unknown error',
            isRetryable: true,
          },
        }
      }

      this.log('info', `Prediction created: ${id}`)

      // 如果立即成功（少见）
      if (status === 'succeeded' && response.data.output) {
        const output = response.data.output
        const url = Array.isArray(output) ? output[0] : output
        if (url) {
          return {
            status: 'SUCCESS',
            results: [{ type: 'video', url }],
            message: 'Generation completed',
          }
        }
      }

      // 返回异步任务
      return {
        status: 'PROCESSING',
        providerTaskId: id,
        message: 'Prediction submitted, polling required',
      }
    } catch (error: unknown) {
      this.log('error', 'Replicate Minimax dispatch failed', error)

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
      const response = await this.httpClient.get<ReplicatePredictionResponse>(
        `/v1/predictions/${taskId}`,
        {
          baseURL: this.getApiEndpoint() || 'https://api.replicate.com',
        }
      )

      const { status, output, error } = response.data

      // 成功
      if (status === 'succeeded' && output) {
        const url = Array.isArray(output) ? output[0] : output
        if (url) {
          const results: GenerationResult[] = [
            {
              type: 'video',
              url,
            },
          ]

          return {
            status: 'SUCCESS',
            results,
            message: 'Generation completed',
          }
        }
      }

      // 处理中
      if (status === 'starting' || status === 'processing') {
        return {
          status: 'PROCESSING',
          providerTaskId: taskId,
          message: `Prediction status: ${status}`,
        }
      }

      // 失败或取消
      if (status === 'failed' || status === 'canceled') {
        return {
          status: 'ERROR',
          message: error || `Prediction ${status}`,
          providerTaskId: taskId,
          error: {
            code: 'PREDICTION_FAILED',
            message: error || 'Unknown error',
            isRetryable: false,
          },
        }
      }

      // 未知状态
      return {
        status: 'PROCESSING',
        providerTaskId: taskId,
        message: `Unknown status: ${status}`,
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
