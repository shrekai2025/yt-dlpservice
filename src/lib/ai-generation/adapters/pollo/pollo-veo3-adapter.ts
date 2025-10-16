/**
 * PolloVeo3Adapter - Pollo AI Veo3 Video Generation
 *
 * 对应模型: pollo-veo3
 * 功能: 文生视频、图生视频
 */

import { BaseAdapter } from '../base-adapter'
import type {
  GenerationRequest,
  GenerationResult,
  AdapterResponse,
} from '../types'

interface PolloGenerationResponse {
  id: string
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED'
  output?: string[]
  error?: string
}

export class PolloVeo3Adapter extends BaseAdapter {
  private readonly BASE_URL = 'https://pollo.ai/api/platform/generation'
  private readonly maxPollingTime = 600000 // 10分钟
  private readonly pollingInterval = 60000 // 60秒

  protected getAuthHeaders(apiKey: string): Record<string, string> {
    return {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'User-Agent': 'AIGenerationHub/1.0',
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
          message: 'Missing API key for Pollo',
          error: {
            code: 'MISSING_API_KEY',
            message: 'API key is required',
            isRetryable: false,
          },
        }
      }

      // 构建生成输入
      const generationInput: Record<string, unknown> = {
        prompt: request.prompt,
        aspectRatio: '16:9', // Pollo veo3 only supports 16:9
        generateAudio: true, // 默认生成音频
      }

      // 处理输入图片
      if (request.inputImages && request.inputImages.length > 0) {
        const imageUrl = request.inputImages[0]
        if (imageUrl!.startsWith('data:')) {
          this.log('warn', 'Pollo API may not support base64 images, URL required')
          // TODO: 可以考虑先上传到S3再传URL
        }
        generationInput.image = imageUrl
      }

      // 参数处理
      const duration = request.parameters?.duration as number | undefined
      generationInput.length = duration || 8 // 默认8秒

      if (request.parameters?.negative_prompt) {
        generationInput.negativePrompt = request.parameters.negative_prompt
      }

      if (request.parameters?.seed) {
        generationInput.seed = request.parameters.seed
      }

      if (request.parameters?.generate_audio !== undefined) {
        generationInput.generateAudio = request.parameters.generate_audio
      }

      // API端点
      const apiEndpoint = this.config.provider.apiEndpoint || '/google/veo3'
      const url = `${this.BASE_URL}${apiEndpoint}`

      const payload = {
        input: generationInput,
      }

      this.log('info', 'Creating Pollo Veo3 generation task', { url, payload })

      // 发送请求
      const response = await this.httpClient.post<PolloGenerationResponse>(url, payload, {
        timeout: 60000,
      })

      const { id, status, output, error } = response.data

      if (!id) {
        return {
          status: 'ERROR',
          message: error || 'Failed to create generation task',
          error: {
            code: 'TASK_CREATION_FAILED',
            message: error || 'No task ID returned',
            isRetryable: true,
          },
        }
      }

      this.log('info', `Pollo generation task created: ${id}`)

      // 返回异步任务状态
      return {
        status: 'PROCESSING',
        providerTaskId: id,
        message: 'Video generation in progress',
      }
    } catch (error: unknown) {
      this.log('error', 'Pollo Veo3 dispatch failed', error)

      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { error?: string; message?: string } } }
        const errorMessage = axiosError.response?.data?.error || axiosError.response?.data?.message
        if (errorMessage) {
          return {
            status: 'ERROR',
            message: errorMessage,
            error: {
              code: 'API_ERROR',
              message: errorMessage,
              isRetryable: true,
            },
          }
        }
      }

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
      const url = `${this.BASE_URL}/task/${taskId}`

      this.log('info', `Checking Pollo task status: ${taskId}`)

      const response = await this.httpClient.get<PolloGenerationResponse>(url, {
        timeout: 30000,
      })

      const { status, output, error } = response.data

      // 处理中
      if (status === 'PENDING' || status === 'PROCESSING') {
        return {
          status: 'PROCESSING',
          providerTaskId: taskId,
          message: `Task ${status}`,
        }
      }

      // 成功
      if (status === 'SUCCESS' && output && output.length > 0) {
        const results: GenerationResult[] = output.map((url) => ({
          type: 'video',
          url,
        }))

        this.log('info', `Pollo task completed: ${results.length} videos`)

        return {
          status: 'SUCCESS',
          results,
          message: 'Video generation completed',
        }
      }

      // 失败
      return {
        status: 'ERROR',
        message: error || 'Generation failed',
        providerTaskId: taskId,
        error: {
          code: 'GENERATION_FAILED',
          message: error || 'Unknown error',
          isRetryable: false,
        },
      }
    } catch (error: unknown) {
      this.log('error', 'Failed to check Pollo task status', error)

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

