/**
 * KieVeo31Adapter - Kie.ai Veo 3.1 Video Generation
 *
 * 对应模型: kie-veo3-1
 * 功能: 文生视频和图生视频（Google Veo 3.1模型）
 *
 * API文档: https://api.kie.ai/api/v1/veo/generate
 *
 * 价格:
 * - 5秒 720P: 12 Credits
 * - 5秒 1080P: 30 Credits
 * - 10秒 720P: 30 Credits
 */

import { BaseAdapter } from '../base-adapter'
import type {
  GenerationRequest,
  GenerationResult,
  AdapterResponse,
} from '../types'

interface KieVeo31TaskResponse {
  code: number
  msg: string
  data: {
    taskId: string
  }
}

interface KieVeo31StatusResponse {
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

export class KieVeo31Adapter extends BaseAdapter {
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

      // 模型选择: veo3 (Veo 3.1 使用 veo3 作为 model 参数)
      payload.model = 'veo3'

      // 可选参数: aspectRatio
      if (request.parameters?.aspectRatio) {
        payload.aspectRatio = request.parameters.aspectRatio
      }

      // 可选参数: seeds
      if (request.parameters?.seeds) {
        payload.seeds = request.parameters.seeds
      }

      // 可选参数: generationType
      if (request.parameters?.generationType) {
        payload.generationType = request.parameters.generationType
      }

      // 可选参数: enableTranslation
      if (request.parameters?.enableTranslation !== undefined) {
        payload.enableTranslation = request.parameters.enableTranslation
      }

      // 可选参数: watermark
      if (request.parameters?.watermark) {
        payload.watermark = request.parameters.watermark
      }

      // 可选参数: callBackUrl
      if (request.parameters?.callBackUrl) {
        payload.callBackUrl = request.parameters.callBackUrl
      }

      // 输入图片（图生视频模式，优先使用参数中的image_url）
      if (request.parameters?.image_url) {
        // 从参数字段获取（新方式）
        const imageUrl = request.parameters.image_url as string
        payload.imageUrls = [imageUrl]
      } else if (request.inputImages && request.inputImages.length > 0) {
        // 从通用上传区域获取（旧方式，向后兼容）
        payload.imageUrls = request.inputImages
      }

      this.log('info', 'Creating Kie Veo 3.1 task', payload)

      // 创建任务
      const response = await this.httpClient.post<KieVeo31TaskResponse>(
        '/api/v1/veo/generate',
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
            isRetryable: code === 429 || code >= 500, // 429 或 5xx 可重试
          },
        }
      }

      this.log('info', `Veo 3.1 task created: ${data.taskId}`)

      // 返回异步任务
      return {
        status: 'PROCESSING',
        providerTaskId: data.taskId,
        message: 'Video generation in progress',
      }
    } catch (error: unknown) {
      this.log('error', 'Kie Veo 3.1 dispatch failed', error)

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
      const response = await this.httpClient.get<KieVeo31StatusResponse>(
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
          message: 'Generating video...',
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
          message: 'Video generation completed',
        }
      }

      // 失败 (successFlag = 2 或 3)
      if (successFlag === 2 || successFlag === 3) {
        return {
          status: 'ERROR',
          message: errorMessage || 'Generation failed',
          providerTaskId: taskId,
          error: {
            code: errorCode ? String(errorCode) : 'GENERATION_FAILED',
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
      this.log('error', 'Failed to check Veo 3.1 task status', error)

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
