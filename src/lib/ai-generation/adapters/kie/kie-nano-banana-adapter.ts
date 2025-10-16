/**
 * KieNanoBananaAdapter - Kie.ai Nano Banana Image Generation
 *
 * 对应模型: kie-nano-banana
 * 功能: 基于 Google Nano Banana 的图像生成
 */

import { BaseAdapter } from '../base-adapter'
import type {
  GenerationRequest,
  GenerationResult,
  AdapterResponse,
} from '../types'

interface KieNanoBananaTaskResponse {
  code: number
  msg: string
  data?: {
    taskId: string
  }
}

interface KieNanoBananaStatusResponse {
  code: number
  msg: string
  data?: {
    taskId: string
    model: string
    state: 'waiting' | 'generating' | 'success' | 'fail'
    param: string
    resultJson?: string
    failCode: string | null
    failMsg: string | null
    costTime: number | null
    completeTime: number | null
    createTime: number
  }
}

export class KieNanoBananaAdapter extends BaseAdapter {
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

      // 构建请求参数
      const input: Record<string, unknown> = {
        prompt: request.prompt,
      }

      // 可选参数 - output_format
      if (request.parameters?.output_format) {
        input.output_format = request.parameters.output_format
      }

      // 可选参数 - image_size
      if (request.parameters?.image_size) {
        input.image_size = request.parameters.image_size
      }

      const payload: Record<string, unknown> = {
        model: 'google/nano-banana',
        input,
      }

      // 可选参数 - callBackUrl
      if (request.parameters?.callBackUrl) {
        payload.callBackUrl = request.parameters.callBackUrl
      }

      this.log('info', 'Creating Kie Nano Banana task', payload)

      // 创建任务
      const response = await this.httpClient.post<KieNanoBananaTaskResponse>(
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

      this.log('info', `Task created: ${data.taskId}`)

      // 返回异步任务
      return {
        status: 'PROCESSING',
        providerTaskId: data.taskId,
        message: 'Task submitted, polling required',
      }
    } catch (error: unknown) {
      this.log('error', 'Kie Nano Banana dispatch failed', error)

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
      const response = await this.httpClient.get<KieNanoBananaStatusResponse>(
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

      const { state, resultJson, failMsg } = data

      // 等待中
      if (state === 'waiting' || state === 'generating') {
        return {
          status: 'PROCESSING',
          providerTaskId: taskId,
          message: state === 'generating' ? 'Generating...' : 'Task is waiting',
        }
      }

      // 成功
      if (state === 'success' && resultJson) {
        try {
          const result = JSON.parse(resultJson) as { resultUrls?: string[] }
          
          if (result.resultUrls && result.resultUrls.length > 0) {
            const results: GenerationResult[] = result.resultUrls.map((url: string) => ({
              type: 'image',
              url,
            }))

            return {
              status: 'SUCCESS',
              results,
              message: 'Generation completed',
            }
          }
        } catch (parseError) {
          this.log('error', 'Failed to parse resultJson', parseError)
          return {
            status: 'ERROR',
            message: 'Failed to parse result',
            providerTaskId: taskId,
            error: {
              code: 'PARSE_ERROR',
              message: 'Failed to parse result JSON',
              isRetryable: false,
            },
          }
        }
      }

      // 失败
      if (state === 'fail') {
        return {
          status: 'ERROR',
          message: failMsg || 'Generation failed',
          providerTaskId: taskId,
          error: {
            code: 'GENERATION_FAILED',
            message: failMsg || 'Unknown error',
            isRetryable: false,
          },
        }
      }

      // 其他未知状态
      return {
        status: 'ERROR',
        message: failMsg || `Unknown state: ${state}`,
        providerTaskId: taskId,
        error: {
          code: 'UNKNOWN_STATUS',
          message: failMsg || 'Unknown error',
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

