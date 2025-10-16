/**
 * KieSeedreamV4EditAdapter - Kie.ai Seedream V4 Edit
 *
 * 对应模型: bytedance/seedream-v4-edit
 * 功能: 图生图编辑
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
    model: string
    state: 'waiting' | 'generating' | 'success' | 'fail'
    param: string
    resultJson: string | null
    failCode: string | null
    failMsg: string | null
    costTime: number | null
    completeTime: number | null
    createTime: number
  }
}

export class KieSeedreamV4EditAdapter extends BaseAdapter {
  /**
   * 映射图片尺寸格式到 Seedream V4 支持的格式
   * Seedream V4 支持: square, square_hd, portrait_4_3, portrait_3_2, portrait_16_9,
   *                   landscape_4_3, landscape_3_2, landscape_16_9, landscape_21_9
   */
  private mapSizeToSeedreamFormat(userInput?: string): string {
    const defaultSize = 'square_hd'

    if (!userInput) return defaultSize

    // 直接匹配
    const validSizes = [
      'square',
      'square_hd',
      'portrait_4_3',
      'portrait_3_2',
      'portrait_16_9',
      'landscape_4_3',
      'landscape_3_2',
      'landscape_16_9',
      'landscape_21_9',
    ]

    if (validSizes.includes(userInput)) {
      return userInput
    }

    // 解析常见的尺寸格式
    const lowerInput = userInput.toLowerCase()

    // Portrait formats
    if (lowerInput.includes('portrait') || lowerInput.includes('3:4')) {
      if (lowerInput.includes('16:9') || lowerInput.includes('9:16')) {
        return 'portrait_16_9'
      }
      if (lowerInput.includes('3:2') || lowerInput.includes('2:3')) {
        return 'portrait_3_2'
      }
      return 'portrait_4_3'
    }

    // Landscape formats
    if (lowerInput.includes('landscape') || lowerInput.includes('wide')) {
      if (lowerInput.includes('21:9')) {
        return 'landscape_21_9'
      }
      if (lowerInput.includes('16:9')) {
        return 'landscape_16_9'
      }
      if (lowerInput.includes('3:2')) {
        return 'landscape_3_2'
      }
      return 'landscape_4_3'
    }

    // Square formats
    if (lowerInput.includes('square') || lowerInput.includes('1:1')) {
      if (lowerInput.includes('hd')) {
        return 'square_hd'
      }
      return 'square'
    }

    // Parse ratio
    if (userInput.includes(':')) {
      const [w, h] = userInput.split(':').map(Number)
      if (w && h) {
        const ratio = w / h
        if (ratio > 1.5) {
          // Wide aspect ratios
          if (ratio > 2.0) return 'landscape_21_9'
          if (ratio > 1.4) return 'landscape_16_9'
          return 'landscape_3_2'
        } else if (ratio < 0.7) {
          // Portrait aspect ratios
          if (ratio < 0.6) return 'portrait_16_9'
          if (ratio < 0.68) return 'portrait_3_2'
          return 'portrait_4_3'
        } else {
          // Square-ish
          return 'square_hd'
        }
      }
    }

    return defaultSize
  }

  /**
   * 映射分辨率格式
   * Seedream V4 支持: 1K, 2K, 4K
   */
  private mapResolutionToSeedreamFormat(userInput?: string): string {
    const defaultResolution = '1K'

    if (!userInput) return defaultResolution

    const lowerInput = userInput.toLowerCase()

    if (lowerInput.includes('4k')) return '4K'
    if (lowerInput.includes('2k')) return '2K'
    if (lowerInput.includes('1k')) return '1K'

    return defaultResolution
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

      // 验证必需的 image_urls
      if (!request.inputImages || request.inputImages.length === 0) {
        return {
          status: 'ERROR',
          message: 'Seedream V4 Edit requires at least one input image',
          error: {
            code: 'MISSING_INPUT_IMAGES',
            message: 'image_urls parameter is required for edit model',
            isRetryable: false,
          },
        }
      }

      // 限制最多 10 张图片
      const imageUrls = request.inputImages.slice(0, 10)

      // 构建请求参数
      const imageSize = this.mapSizeToSeedreamFormat(
        (request.parameters?.image_size as string) || 
        (request.parameters?.size as string)
      )

      const imageResolution = this.mapResolutionToSeedreamFormat(
        (request.parameters?.image_resolution as string) ||
        (request.parameters?.resolution as string)
      )

      const input: Record<string, unknown> = {
        prompt: request.prompt,
        image_urls: imageUrls,
        image_size: imageSize,
        image_resolution: imageResolution,
      }

      // 可选参数: max_images (1-6)
      const maxImages = 
        (request.parameters?.max_images as number) || 
        request.numberOfOutputs || 
        1
      
      if (maxImages && maxImages >= 1 && maxImages <= 6) {
        input.max_images = maxImages
      }

      // 可选参数: seed
      if (request.parameters?.seed !== undefined) {
        input.seed = request.parameters.seed
      }

      const payload = {
        model: 'bytedance/seedream-v4-edit',
        input,
      }

      // 可选参数: callBackUrl
      if (request.parameters?.callBackUrl) {
        (payload as Record<string, unknown>).callBackUrl = request.parameters.callBackUrl
      }

      this.log('info', 'Creating Kie Seedream V4 Edit task', payload)

      // 创建任务
      const response = await this.httpClient.post<KieTaskResponse>(
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
      this.log('error', 'Kie Seedream V4 Edit dispatch failed', error)

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
        '/api/v1/jobs/recordInfo',
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

      const { state, resultJson, failCode, failMsg } = data

      this.log('info', `Task ${taskId} state: ${state}`)

      // 处理中
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
          const resultUrls = result.resultUrls || []

          if (resultUrls.length > 0) {
            const results: GenerationResult[] = resultUrls.map((url: string) => ({
              type: 'image',
              url,
            }))

            return {
              status: 'SUCCESS',
              results,
              message: 'Generation completed',
            }
          } else {
            return {
              status: 'ERROR',
              message: 'No result URLs found',
              providerTaskId: taskId,
              error: {
                code: 'NO_RESULTS',
                message: 'No result URLs in response',
                isRetryable: false,
              },
            }
          }
        } catch (parseError) {
          this.log('error', `Failed to parse resultJson for ${taskId}`, parseError)
          return {
            status: 'ERROR',
            message: 'Failed to parse result JSON',
            providerTaskId: taskId,
            error: {
              code: 'PARSE_ERROR',
              message: parseError instanceof Error ? parseError.message : 'Unknown parse error',
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
            code: failCode || 'GENERATION_FAILED',
            message: failMsg || 'Unknown error',
            isRetryable: false,
          },
        }
      }

      // 其他未知状态
      return {
        status: 'ERROR',
        message: `Unknown state: ${state}`,
        providerTaskId: taskId,
        error: {
          code: 'UNKNOWN_STATE',
          message: `Unexpected task state: ${state}`,
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

