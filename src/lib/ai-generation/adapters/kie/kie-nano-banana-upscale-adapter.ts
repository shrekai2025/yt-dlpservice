/**
 * KieNanoBananaUpscaleAdapter - Kie.ai Nano Banana Upscale
 *
 * 对应模型: kie-nano-banana-upscale
 * 功能: 基于 Nano Banana 的图像放大
 */

import { BaseAdapter } from '../base-adapter'
import type {
  GenerationRequest,
  GenerationResult,
  AdapterResponse,
} from '../types'

interface KieNanoBananaUpscaleTaskResponse {
  code: number
  msg: string
  data?: {
    taskId: string
  }
}

interface KieNanoBananaUpscaleStatusResponse {
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

export class KieNanoBananaUpscaleAdapter extends BaseAdapter {
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

      // 检查是否有输入图片
      if (!request.inputImages || request.inputImages.length === 0) {
        return {
          status: 'ERROR',
          message: 'Nano Banana Upscale requires at least one input image',
          error: {
            code: 'MISSING_INPUT_IMAGE',
            message: 'At least one input image is required',
            isRetryable: false,
          },
        }
      }

      // 构建请求参数
      const input: Record<string, unknown> = {
        image: request.inputImages[0], // 使用第一张图片
      }

      // 可选参数 - scale (放大倍数)
      if (request.parameters?.scale !== undefined) {
        input.scale = request.parameters.scale
      }

      // 可选参数 - face_enhance (面部增强)
      if (request.parameters?.face_enhance !== undefined) {
        input.face_enhance = request.parameters.face_enhance
      }

      const payload: Record<string, unknown> = {
        model: 'nano-banana-upscale',
        input,
      }

      // 可选参数 - callBackUrl
      if (request.parameters?.callBackUrl) {
        payload.callBackUrl = request.parameters.callBackUrl
      }

      this.log('info', 'Creating Kie Nano Banana Upscale task', payload)

      // 创建任务
      const response = await this.httpClient.post<KieNanoBananaUpscaleTaskResponse>(
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
      this.log('error', 'Kie Nano Banana Upscale dispatch failed', error)

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
      const response = await this.httpClient.get<KieNanoBananaUpscaleStatusResponse>(
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

      // 等待中或生成中
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

