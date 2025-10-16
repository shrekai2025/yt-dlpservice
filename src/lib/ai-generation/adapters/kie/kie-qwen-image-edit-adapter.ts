/**
 * KieQwenImageEditAdapter - Kie.ai Qwen Image Edit
 *
 * 对应模型: qwen/image-edit
 * 功能: 图像编辑
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

export class KieQwenImageEditAdapter extends BaseAdapter {
  /**
   * 映射图片尺寸格式
   * Qwen Image Edit 支持: square, square_hd, portrait_4_3, portrait_16_9,
   *                       landscape_4_3, landscape_16_9
   */
  private mapSizeToQwenFormat(userInput?: string): string {
    const defaultSize = 'landscape_4_3'

    if (!userInput) return defaultSize

    // 直接匹配
    const validSizes = [
      'square',
      'square_hd',
      'portrait_4_3',
      'portrait_16_9',
      'landscape_4_3',
      'landscape_16_9',
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
      return 'portrait_4_3'
    }

    // Landscape formats
    if (lowerInput.includes('landscape') || lowerInput.includes('wide')) {
      if (lowerInput.includes('16:9')) {
        return 'landscape_16_9'
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
        if (ratio > 1.2) {
          // Landscape
          if (ratio > 1.5) return 'landscape_16_9'
          return 'landscape_4_3'
        } else if (ratio < 0.8) {
          // Portrait
          if (ratio < 0.6) return 'portrait_16_9'
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

      // 验证必需的 image_url
      if (!request.inputImages || request.inputImages.length === 0) {
        return {
          status: 'ERROR',
          message: 'Qwen Image Edit requires an input image',
          error: {
            code: 'MISSING_INPUT_IMAGE',
            message: 'image_url parameter is required',
            isRetryable: false,
          },
        }
      }

      // 使用第一张图片作为输入
      const imageUrl = request.inputImages[0]

      // 构建请求参数
      const imageSize = this.mapSizeToQwenFormat(
        (request.parameters?.image_size as string) || 
        (request.parameters?.size as string)
      )

      const input: Record<string, unknown> = {
        prompt: request.prompt,
        image_url: imageUrl,
        image_size: imageSize,
      }

      // 可选参数: acceleration
      const acceleration = request.parameters?.acceleration as string
      if (acceleration && ['none', 'regular', 'high'].includes(acceleration)) {
        input.acceleration = acceleration
      }

      // 可选参数: num_inference_steps (2-49)
      const numInferenceSteps = request.parameters?.num_inference_steps as number
      if (numInferenceSteps && numInferenceSteps >= 2 && numInferenceSteps <= 49) {
        input.num_inference_steps = numInferenceSteps
      }

      // 可选参数: seed
      if (request.parameters?.seed !== undefined) {
        input.seed = request.parameters.seed
      }

      // 可选参数: guidance_scale (0-20)
      const guidanceScale = request.parameters?.guidance_scale as number
      if (guidanceScale !== undefined && guidanceScale >= 0 && guidanceScale <= 20) {
        input.guidance_scale = guidanceScale
      }

      // 可选参数: sync_mode
      if (request.parameters?.sync_mode !== undefined) {
        input.sync_mode = request.parameters.sync_mode
      }

      // 可选参数: num_images (1-4)
      const numImages = 
        (request.parameters?.num_images as number) || 
        request.numberOfOutputs
      
      if (numImages && numImages >= 1 && numImages <= 4) {
        input.num_images = String(numImages)
      }

      // 可选参数: enable_safety_checker
      if (request.parameters?.enable_safety_checker !== undefined) {
        input.enable_safety_checker = request.parameters.enable_safety_checker
      }

      // 可选参数: output_format
      const outputFormat = request.parameters?.output_format as string
      if (outputFormat && ['jpeg', 'png'].includes(outputFormat)) {
        input.output_format = outputFormat
      }

      // 可选参数: negative_prompt
      if (request.parameters?.negative_prompt) {
        input.negative_prompt = request.parameters.negative_prompt
      }

      const payload = {
        model: 'qwen/image-edit',
        input,
      }

      // 可选参数: callBackUrl
      if (request.parameters?.callBackUrl) {
        (payload as Record<string, unknown>).callBackUrl = request.parameters.callBackUrl
      }

      this.log('info', 'Creating Kie Qwen Image Edit task', payload)

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
      this.log('error', 'Kie Qwen Image Edit dispatch failed', error)

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

