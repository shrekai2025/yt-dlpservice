/**
 * PolloKlingAdapter - Pollo AI Kling Video Generation
 *
 * 对应模型: pollo-kling
 * 功能: 图生视频（基于kling-ai/kling-1-5）
 */

import { PolloVeo3Adapter } from './pollo-veo3-adapter'
import type {
  GenerationRequest,
  AdapterResponse,
} from '../types'

export class PolloKlingAdapter extends PolloVeo3Adapter {
  /**
   * 调度生成请求 - Kling需要输入图片
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

      // Kling需要输入图片
      if (!request.inputImages || request.inputImages.length === 0) {
        return {
          status: 'ERROR',
          message: 'Pollo Kling requires input image for video generation',
          error: {
            code: 'MISSING_INPUT_IMAGE',
            message: 'Please provide at least one input image',
            isRetryable: false,
          },
        }
      }

      // 检查图片格式（不支持base64）
      const imageUrl = request.inputImages[0]!
      if (imageUrl.startsWith('data:')) {
        return {
          status: 'ERROR',
          message: 'Pollo Kling API only supports image URLs, not base64 format',
          error: {
            code: 'INVALID_IMAGE_FORMAT',
            message: 'Please provide a publicly accessible image URL (JPG, PNG, JPEG)',
            isRetryable: false,
          },
        }
      }

      // 构建Kling特定的生成输入
      const generationInput: Record<string, unknown> = {
        prompt: request.prompt,
        image: imageUrl,
        length: (request.parameters?.duration as number) || 5, // 默认5秒
      }

      // Kling参数处理
      if (request.parameters?.negative_prompt) {
        generationInput.negativePrompt = request.parameters.negative_prompt
      }

      if (request.parameters?.seed) {
        generationInput.seed = request.parameters.seed
      }

      if (request.parameters?.aspect_ratio) {
        // Kling supports: 16:9, 9:16, 1:1
        generationInput.aspectRatio = request.parameters.aspect_ratio
      }

      if (request.parameters?.camera_movement) {
        generationInput.cameraMovement = request.parameters.camera_movement
      }

      // API端点（从配置获取或使用默认）
      const apiEndpoint = this.config.provider.apiEndpoint || '/kling-ai/kling-1-5'
      const url = `${this.BASE_URL}${apiEndpoint}`

      const payload = {
        input: generationInput,
      }

      this.log('info', 'Creating Pollo Kling generation task', { url, payload })

      // 发送请求
      const response = await this.httpClient.post(url, payload, {
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

      this.log('info', `Pollo Kling task created: ${id}`)

      // 返回异步任务状态
      return {
        status: 'PROCESSING',
        providerTaskId: id,
        message: 'Video generation in progress',
      }
    } catch (error: unknown) {
      this.log('error', 'Pollo Kling dispatch failed', error)

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
}

