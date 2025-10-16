/**
 * KieFluxKontextAdapter - Kie.ai Flux Kontext Image Generation
 *
 * 对应模型: kie-flux-kontext
 * 功能: 高质量文生图
 */

import { BaseAdapter } from '../base-adapter'
import type {
  GenerationRequest,
  GenerationResult,
  AdapterResponse,
} from '../types'

interface KieFluxKontextTaskResponse {
  code: number
  msg: string
  data?: {
    taskId: string
  }
}

interface KieFluxKontextStatusResponse {
  code: number
  msg: string
  data?: {
    taskId: string
    successFlag: number
    errorCode: number | null
    errorMessage: string | null
    paramJson?: string
    completeTime?: string
    createTime?: string
    response?: {
      originImageUrl?: string
      resultImageUrl?: string
    }
  }
}

export class KieFluxKontextAdapter extends BaseAdapter {
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
      const payload: Record<string, unknown> = {
        prompt: request.prompt,
      }

      // 可选参数
      if (request.parameters?.enableTranslation !== undefined) {
        payload.enableTranslation = request.parameters.enableTranslation
      }

      if (request.parameters?.aspectRatio) {
        payload.aspectRatio = request.parameters.aspectRatio
      }

      if (request.parameters?.outputFormat) {
        payload.outputFormat = request.parameters.outputFormat
      }

      if (request.parameters?.promptUpsampling !== undefined) {
        payload.promptUpsampling = request.parameters.promptUpsampling
      }

      if (request.parameters?.model) {
        payload.model = request.parameters.model
      }

      if (request.parameters?.safetyTolerance !== undefined) {
        payload.safetyTolerance = request.parameters.safetyTolerance
      }

      if (request.parameters?.uploadCn !== undefined) {
        payload.uploadCn = request.parameters.uploadCn
      }

      if (request.parameters?.inputImage) {
        payload.inputImage = request.parameters.inputImage
      } else if (request.inputImages && request.inputImages.length > 0) {
        payload.inputImage = request.inputImages[0]
      }

      if (request.parameters?.callBackUrl) {
        payload.callBackUrl = request.parameters.callBackUrl
      }

      if (request.parameters?.watermark) {
        payload.watermark = request.parameters.watermark
      }

      this.log('info', 'Creating Kie Flux Kontext task', payload)

      // 创建任务
      const response = await this.httpClient.post<KieFluxKontextTaskResponse>(
        '/api/v1/flux/kontext/generate',
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
      this.log('error', 'Kie Flux Kontext dispatch failed', error)

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
      const response = await this.httpClient.get<KieFluxKontextStatusResponse>(
        '/api/v1/flux/kontext/record-info',
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

      const { successFlag, response: taskResponse, errorMessage } = data

      // 成功
      if (successFlag === 1 && taskResponse?.resultImageUrl) {
        const results: GenerationResult[] = [
          {
            type: 'image',
            url: taskResponse.resultImageUrl,
          },
        ]

        return {
          status: 'SUCCESS',
          results,
          message: 'Generation completed',
        }
      }

      // 处理中
      if (successFlag === 0 && !errorMessage) {
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
