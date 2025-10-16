/**
 * ReplicateFluxAdapter - Replicate Flux Image Generation
 *
 * 对应模型: replicate-flux-pro, replicate-flux-dev
 * 功能: 高质量文生图
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
  output?: string[] | null
  error?: string | null
}

export class ReplicateFluxAdapter extends BaseAdapter {
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
      if (request.parameters?.aspect_ratio) {
        input.aspect_ratio = request.parameters.aspect_ratio
      }

      if (request.parameters?.num_outputs !== undefined) {
        input.num_outputs = request.parameters.num_outputs
      } else if (request.numberOfOutputs) {
        input.num_outputs = request.numberOfOutputs
      }

      if (request.parameters?.seed !== undefined) {
        input.seed = request.parameters.seed
      }

      if (request.parameters?.output_format) {
        input.output_format = request.parameters.output_format
      }

      if (request.parameters?.output_quality !== undefined) {
        input.output_quality = request.parameters.output_quality
      }

      // 输入图片（用于 img2img）
      if (request.inputImages && request.inputImages.length > 0) {
        input.image = request.inputImages[0]
      }

      const payload = {
        input,
      }

      this.log('info', 'Creating Replicate Flux prediction', payload)

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
        const results: GenerationResult[] = response.data.output.map((url) => ({
          type: 'image',
          url,
        }))

        return {
          status: 'SUCCESS',
          results,
          message: 'Generation completed',
        }
      }

      // 返回异步任务
      return {
        status: 'PROCESSING',
        providerTaskId: id,
        message: 'Prediction submitted, polling required',
      }
    } catch (error: unknown) {
      this.log('error', 'Replicate Flux dispatch failed', error)

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
        const results: GenerationResult[] = output.map((url) => ({
          type: 'image',
          url,
        }))

        return {
          status: 'SUCCESS',
          results,
          message: 'Generation completed',
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
