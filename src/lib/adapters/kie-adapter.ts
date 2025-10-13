/**
 * KieAdapter - Kie.ai 4o Image Generation API Adapter
 *
 * Handles Kie.ai's 4o image generation API with OpenAI-compatible style
 */

import axios, { type AxiosInstance } from 'axios'
import { BaseAdapter } from './base-adapter'
import { s3Uploader } from './utils/s3-uploader'
import type {
  UnifiedGenerationRequest,
  GenerationResult,
  AdapterResponse,
} from './types'
import type { z } from 'zod'

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
    paramJson: string
    completeTime: number
    response: {
      resultUrls: string[]
    }
    successFlag: number
    status: 'GENERATING' | 'SUCCESS' | 'CREATE_TASK_FAILED' | 'GENERATE_FAILED'
    errorCode: number | null
    errorMessage: string
    createTime: number
    progress: string
  }
}

export class KieAdapter extends BaseAdapter {
  protected getValidationSchema(): z.ZodSchema | null {
    return null // Using custom validation
  }

  protected getHttpClient(): AxiosInstance {
    const client = axios.create({
      baseURL: this.sourceInfo.apiEndpoint || 'https://api.kie.ai',
      headers: {
        Authorization: `Bearer ${this.sourceInfo.encryptedAuthKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 600000, // 10 minutes
    })
    return client
  }

  /**
   * Map unified size format to Kie's aspect ratio format
   * Kie supports: 1:1, 3:2, 2:3
   */
  private mapSizeToKieFormat(userInput?: string): string {
    const defaultSize = '1:1'

    if (!userInput) {
      return defaultSize
    }

    // Direct ratio match
    if (['1:1', '3:2', '2:3'].includes(userInput)) {
      return userInput
    }

    // Parse dimensions or ratio
    let requestedRatio: number | null = null

    if (userInput.includes('x')) {
      const [w, h] = userInput.split('x').map(Number)
      if (w && h) {
        requestedRatio = w / h
      }
    } else if (userInput.includes(':')) {
      const [w, h] = userInput.split(':').map(Number)
      if (w && h) {
        requestedRatio = w / h
      }
    }

    if (requestedRatio) {
      // Map to closest supported ratio
      const ratios = [
        { format: '1:1', value: 1.0 },
        { format: '3:2', value: 1.5 },
        { format: '2:3', value: 0.6667 },
      ]

      let bestMatch = defaultSize
      let smallestDiff = Infinity

      for (const { format, value } of ratios) {
        const diff = Math.abs(value - requestedRatio)
        if (diff < smallestDiff) {
          smallestDiff = diff
          bestMatch = format
        }
      }

      return bestMatch
    }

    return defaultSize
  }

  /**
   * Check task status once (for internal polling)
   */
  private async checkTaskStatus(taskId: string): Promise<AdapterResponse> {
    try {
      const response = await this.httpClient.get<KieTaskStatusResponse>(
        `/api/v1/gpt4o-image/record-info?taskId=${taskId}`
      )

      const { code, msg, data } = response.data

      if (code !== 200) {
        return {
          status: 'ERROR',
          message: msg || 'Failed to fetch task status',
        }
      }

      const { status, response: taskResponse, errorMessage, progress } = data

      if (status === 'SUCCESS' && taskResponse?.resultUrls && taskResponse.resultUrls.length > 0) {
        // Process successful results
        const results: GenerationResult[] = []
        const uploadS3 = this.sourceInfo.uploadToS3 ?? false
        const s3Prefix = this.sourceInfo.s3PathPrefix || 'kie-images'

        for (const imageUrl of taskResponse.resultUrls) {
          let finalUrl = imageUrl

          // Optional: Download and upload to S3 if configured
          if (uploadS3 && imageUrl) {
            try {
              const imageResponse = await axios.get(imageUrl, {
                responseType: 'arraybuffer',
                timeout: 30000,
              })
              const imageBuffer = Buffer.from(imageResponse.data)
              finalUrl = await s3Uploader.uploadBuffer(imageBuffer, s3Prefix, 'image/png')
            } catch (uploadError) {
              this.logger.warn({ uploadError, url: imageUrl }, 'Failed to upload to S3, using original URL')
            }
          }

          results.push({
            type: 'image',
            url: finalUrl,
            metadata: {
              originalUrl: imageUrl,
            },
          })
        }

        return {
          status: 'SUCCESS',
          results,
          task_id: taskId,
          progress: 1.0,
        }
      }

      if (status === 'CREATE_TASK_FAILED' || status === 'GENERATE_FAILED') {
        return {
          status: 'ERROR',
          message: errorMessage || 'Image generation failed',
          task_id: taskId,
          error: {
            code: String(data.errorCode || 'UNKNOWN'),
            message: errorMessage,
            isRetryable: false,
          },
        }
      }

      // Still processing (GENERATING)
      const progressValue = progress ? parseFloat(progress) : 0
      return {
        status: 'PROCESSING',
        task_id: taskId,
        message: 'Image generation in progress',
        progress: progressValue,
      }
    } catch (error) {
      this.logger.error({ error, taskId }, 'Error checking task status')
      return {
        status: 'ERROR',
        message: error instanceof Error ? error.message : 'Failed to check task status',
        task_id: taskId,
      }
    }
  }

  /**
   * Poll task status until completion (kept for backward compatibility)
   */
  private async pollTaskStatus(taskId: string, maxRetries = 60, intervalMs = 5000): Promise<AdapterResponse> {
    let retries = 0

    while (retries < maxRetries) {
      const result = await this.checkTaskStatus(taskId)

      if (result.status === 'SUCCESS' || result.status === 'ERROR') {
        return result
      }

      // Still processing, wait and retry
      this.logger.info({ taskId, progress: result.progress, retries }, 'Task still processing, waiting...')
      await new Promise((resolve) => setTimeout(resolve, intervalMs))
      retries++
    }

    return {
      status: 'ERROR',
      message: `Task polling timeout after ${maxRetries} retries`,
      task_id: taskId,
    }
  }

  /**
   * Generate images using Kie API
   */
  async dispatch(request: UnifiedGenerationRequest): Promise<AdapterResponse> {
    const parameters = request.parameters ?? {}

    // Build Kie API request payload
    const payload: Record<string, unknown> = {
      prompt: request.prompt,
      size: this.mapSizeToKieFormat(parameters.size as string),
      nVariants: request.number_of_outputs,
    }

    // Add optional parameters
    if (request.input_images && request.input_images.length > 0) {
      payload.filesUrl = request.input_images
    }

    if (parameters.maskUrl) {
      payload.maskUrl = parameters.maskUrl
    }

    if (parameters.isEnhance !== undefined) {
      payload.isEnhance = parameters.isEnhance
    }

    if (parameters.uploadCn !== undefined) {
      payload.uploadCn = parameters.uploadCn
    }

    if (parameters.enableFallback !== undefined) {
      payload.enableFallback = parameters.enableFallback
    }

    if (parameters.fallbackModel) {
      payload.fallbackModel = parameters.fallbackModel
    }

    if (parameters.callBackUrl) {
      payload.callBackUrl = parameters.callBackUrl
    }

    this.logger.info({ payload }, 'Calling Kie generate API')

    try {
      // Submit generation task
      const response = await this.httpClient.post<KieTaskResponse>(
        '/api/v1/gpt4o-image/generate',
        payload
      )

      const { code, msg, data } = response.data

      if (code !== 200) {
        return {
          status: 'ERROR',
          message: msg || 'Failed to submit generation task',
        }
      }

      const taskId = data.taskId
      this.logger.info({ taskId }, 'Task submitted successfully')

      // Return PROCESSING status immediately (don't poll synchronously)
      return {
        status: 'PROCESSING',
        task_id: taskId,
        message: 'Image generation task submitted',
        progress: 0,
      }
    } catch (error) {
      this.logger.error({ error }, 'Kie generate error')

      if (axios.isAxiosError(error) && error.response) {
        const { code, msg } = error.response.data || {}
        return {
          status: 'ERROR',
          message: msg || error.message,
          error: {
            code: String(code || error.response.status),
            message: msg || error.message,
            isRetryable: error.response.status >= 500,
          },
        }
      }

      return {
        status: 'ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }
}
