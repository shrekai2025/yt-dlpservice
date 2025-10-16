/**
 * KieImageAdapter - Kie.ai 4o Image Generation
 *
 * 对应模型: kie-4o-image
 * 功能: 文生图、图生图
 */

import { BaseAdapter } from '../base-adapter'
import type {
  GenerationRequest,
  GenerationResult,
  AdapterResponse,
} from '../types'

interface KieTaskResponse {
  code: number
  msg: string
  data: {
    taskId: string
  }
}

interface KieTaskStatusResponse {
  code: number
  msg: string
  data: {
    taskId: string
    response: {
      resultUrls: string[]
    }
    successFlag: number
    status: 'GENERATING' | 'SUCCESS' | 'CREATE_TASK_FAILED' | 'GENERATE_FAILED'
    errorMessage: string
    progress: string
  }
}

export class KieImageAdapter extends BaseAdapter {
  /**
   * 映射尺寸格式到 Kie 支持的比例
   * Kie 支持: 1:1, 3:2, 2:3
   */
  private mapSizeToKieFormat(userInput?: string): string {
    const defaultSize = '1:1'

    if (!userInput) return defaultSize

    // 直接匹配
    if (['1:1', '3:2', '2:3'].includes(userInput)) {
      return userInput
    }

    // 解析尺寸或比例
    let requestedRatio: number | null = null

    if (userInput.includes('x')) {
      const [w, h] = userInput.split('x').map(Number)
      if (w && h) requestedRatio = w / h
    } else if (userInput.includes(':')) {
      const [w, h] = userInput.split(':').map(Number)
      if (w && h) requestedRatio = w / h
    }

    if (requestedRatio) {
      const ratios = [
        { format: '1:1', value: 1.0 },
        { format: '3:2', value: 1.5 },
        { format: '2:3', value: 0.6667 },
      ]

      let bestMatch = defaultSize
      let minDiff = Math.abs(ratios[0]!.value - requestedRatio)

      for (const ratio of ratios) {
        const diff = Math.abs(ratio.value - requestedRatio)
        if (diff < minDiff) {
          minDiff = diff
          bestMatch = ratio.format
        }
      }

      return bestMatch
    }

    return defaultSize
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
          message: 'Missing API key for Kie.ai',
          error: {
            code: 'MISSING_API_KEY',
            message: 'API key is required',
            isRetryable: false,
          },
        }
      }

      // 构建请求参数
      const size = this.mapSizeToKieFormat(
        (request.parameters?.size as string) || '1:1'
      )

      const payload: Record<string, unknown> = {
        prompt: request.prompt,
        size,
      }

      // 可选参数
      if (request.inputImages && request.inputImages.length > 0) {
        payload.filesUrl = request.inputImages.slice(0, 5)
      }

      if (request.parameters?.maskUrl) {
        payload.maskUrl = request.parameters.maskUrl
      }

      if (request.parameters?.isEnhance !== undefined) {
        payload.isEnhance = request.parameters.isEnhance
      }

      if (request.parameters?.uploadCn !== undefined) {
        payload.uploadCn = request.parameters.uploadCn
      }

      if (request.parameters?.enableFallback !== undefined) {
        payload.enableFallback = request.parameters.enableFallback
      }

      if (request.parameters?.fallbackModel) {
        payload.fallbackModel = request.parameters.fallbackModel
      }

      if (request.parameters?.callBackUrl) {
        payload.callBackUrl = request.parameters.callBackUrl
      }

      // 生成数量 (变体数) - 默认 API 仅支持 1 / 2 / 4
      const resolveVariantCount = (value: unknown): number | undefined => {
        if (typeof value === 'number') return value
        if (typeof value === 'string') {
          const parsed = Number(value)
          return Number.isFinite(parsed) ? parsed : undefined
        }
        return undefined
      }

      const variantCandidate =
        resolveVariantCount(request.parameters?.nVariants) ??
        resolveVariantCount(request.numberOfOutputs)

      if (variantCandidate && (variantCandidate === 1 || variantCandidate === 2 || variantCandidate === 4)) {
        payload.nVariants = variantCandidate
      }

      this.log('info', 'Creating Kie 4o Image task', payload)

      // 创建任务
      const response = await this.httpClient.post<KieTaskResponse>(
        '/api/v1/gpt4o-image/generate',
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
      this.log('error', 'Kie 4o Image dispatch failed', error)

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
      const response = await this.httpClient.get<KieTaskStatusResponse>(
        '/api/v1/gpt4o-image/record-info',
        {
          baseURL: this.getApiEndpoint() || 'https://api.kie.ai',
          params: { taskId },
        }
      )

      const { code, msg, data } = response.data

      this.log('info', `Task status response for ${taskId}`, { code, msg, hasData: !!data })

      if (code !== 200 || !data) {
        this.log('error', `Invalid status response for ${taskId}`, { code, msg, data })
        return {
          status: 'ERROR',
          message: msg || 'Failed to fetch task status',
          providerTaskId: taskId,
        }
      }

      // 根据文档，status、successFlag、errorMessage、progress 在 data 下
      // resultUrls 在 data.response 下
      const { status, successFlag, errorMessage, progress } = data
      const resultUrls = data.response?.resultUrls || []

      this.log('info', `Task ${taskId} status: ${status}, progress: ${progress}`)

      // 处理中
      if (status === 'GENERATING') {
        const progressNum = progress ? parseFloat(progress) : 0
        return {
          status: 'PROCESSING',
          providerTaskId: taskId,
          progress: progressNum,
          message: `Generating... ${Math.round(progressNum * 100)}%`,
        }
      }

      // 成功
      if (status === 'SUCCESS' && successFlag === 1 && resultUrls.length > 0) {
        const results: GenerationResult[] = resultUrls.map((url: string) => ({
          type: 'image',
          url,
        }))

        return {
          status: 'SUCCESS',
          results,
          message: 'Generation completed',
        }
      }

      // 失败
      if (status === 'CREATE_TASK_FAILED' || status === 'GENERATE_FAILED') {
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
      }

      // 其他未知状态
      return {
        status: 'ERROR',
        message: errorMessage || `Unknown status: ${status}`,
        providerTaskId: taskId,
        error: {
          code: 'UNKNOWN_STATUS',
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
