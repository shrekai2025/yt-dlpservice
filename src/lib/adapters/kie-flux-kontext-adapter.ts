/**
 * KieFluxKontextAdapter - Flux Kontext image generation via Kie.ai
 *
 * Handles task submission and polling for the Flux Kontext models exposed by Kie.ai.
 */

import axios, { type AxiosInstance } from 'axios'
import { BaseAdapter } from './base-adapter'
import type {
  UnifiedGenerationRequest,
  GenerationResult,
  AdapterResponse,
} from './types'
import type { z } from 'zod'

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
    response?: {
      originImageUrl?: string
      resultImageUrl?: string
    }
  }
}

export class KieFluxKontextAdapter extends BaseAdapter {
  protected getValidationSchema(): z.ZodSchema | null {
    return null
  }

  private guessContentType(url: string): string {
    const lowered = url.toLowerCase()
    if (lowered.endsWith('.png')) return 'image/png'
    if (lowered.endsWith('.webp')) return 'image/webp'
    if (lowered.endsWith('.avif')) return 'image/avif'
    return 'image/jpeg'
  }

  protected getHttpClient(): AxiosInstance {
    const client = axios.create({
      baseURL: this.sourceInfo.apiEndpoint || 'https://api.kie.ai',
      headers: {
        Authorization: `Bearer ${this.sourceInfo.encryptedAuthKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 600000,
    })
    return client
  }

  /**
   * Poll task status once (used by external polling flows)
   */
  async checkTaskStatus(taskId: string): Promise<AdapterResponse> {
    try {
      const response = await this.httpClient.get<KieFluxKontextStatusResponse>(
        '/api/v1/flux/kontext/record-info',
        {
          params: { taskId },
        }
      )

      const { code, msg, data } = response.data

      if (code !== 200 || !data) {
        return {
          status: 'ERROR',
          message: msg || 'Failed to fetch task status',
          task_id: taskId,
        }
      }

      const { successFlag, response: taskResponse, errorMessage, errorCode } = data

      if (successFlag === 1 && taskResponse?.resultImageUrl) {
        const results: GenerationResult[] = []
        const uploadToS3 = this.sourceInfo.uploadToS3 ?? false
        const s3Prefix = this.sourceInfo.s3PathPrefix || 'kie-flux-kontext'
        const imageUrl = taskResponse.resultImageUrl
        const contentType = this.guessContentType(imageUrl)

        try {
          const finalUrl = uploadToS3
            ? await this.downloadAndUploadToS3(imageUrl, contentType, s3Prefix)
            : imageUrl

          results.push({
            type: 'image',
            url: finalUrl,
            metadata: {
              originalUrl: imageUrl,
              originImageUrl: taskResponse.originImageUrl,
            },
          })
        } catch (uploadError) {
          this.logger.warn(
            { uploadError, url: imageUrl },
            'Failed to upload Flux Kontext image to S3, fallback to original URL'
          )
          results.push({
            type: 'image',
            url: imageUrl,
            metadata: {
              originalUrl: imageUrl,
              originImageUrl: taskResponse.originImageUrl,
              uploadError:
                uploadError instanceof Error ? uploadError.message : 'Unknown error',
            },
          })
        }

        return {
          status: 'SUCCESS',
          results,
          task_id: taskId,
          progress: 1,
        }
      }

      if (successFlag === 2 || successFlag === 3) {
        return {
          status: 'ERROR',
          message: errorMessage || 'Image generation failed',
          task_id: taskId,
          error: {
            code: String(errorCode ?? 'UNKNOWN'),
            message: errorMessage || msg || 'Image generation failed',
            isRetryable: false,
          },
        }
      }

      return {
        status: 'PROCESSING',
        task_id: taskId,
        message: msg || 'Image generation in progress',
        progress: 0,
      }
    } catch (error) {
      this.logger.error({ error, taskId }, 'Error checking Flux Kontext task status')
      return {
        status: 'ERROR',
        message: error instanceof Error ? error.message : 'Failed to check task status',
        task_id: taskId,
      }
    }
  }

  async dispatch(request: UnifiedGenerationRequest): Promise<AdapterResponse> {
    const parameters = request.parameters ?? {}

    const defaultModel = this.sourceInfo.modelVersion || 'flux-kontext-pro'
    const payload: Record<string, unknown> = {
      prompt: request.prompt,
      enableTranslation:
        typeof parameters.enableTranslation === 'boolean'
          ? parameters.enableTranslation
          : true,
      aspectRatio:
        typeof parameters.aspectRatio === 'string'
          ? parameters.aspectRatio
          : '16:9',
      outputFormat:
        typeof parameters.outputFormat === 'string'
          ? parameters.outputFormat
          : 'jpeg',
      promptUpsampling:
        typeof parameters.promptUpsampling === 'boolean'
          ? parameters.promptUpsampling
          : false,
      model:
        typeof parameters.model === 'string' && parameters.model
          ? parameters.model
          : defaultModel,
      safetyTolerance:
        typeof parameters.safetyTolerance === 'number'
          ? parameters.safetyTolerance
          : 2,
    }

    if (parameters.uploadCn !== undefined) {
      payload.uploadCn = parameters.uploadCn
    }

    if (parameters.callBackUrl) {
      payload.callBackUrl = parameters.callBackUrl
    }

    if (parameters.watermark) {
      payload.watermark = parameters.watermark
    }

    if (typeof parameters.inputImage === 'string') {
      payload.inputImage = parameters.inputImage
    } else if (request.input_images && request.input_images.length > 0) {
      payload.inputImage = request.input_images[0]
    }

    this.logger.info({ payload }, 'Calling Kie Flux Kontext generate API')

    try {
      const response = await this.httpClient.post<KieFluxKontextTaskResponse>(
        '/api/v1/flux/kontext/generate',
        payload
      )

      const { code, msg, data } = response.data

      if (code !== 200 || !data?.taskId) {
        return {
          status: 'ERROR',
          message: msg || 'Failed to submit generation task',
        }
      }

      const taskId = data.taskId
      this.logger.info({ taskId }, 'Flux Kontext task submitted successfully')

      return {
        status: 'PROCESSING',
        task_id: taskId,
        message: 'Image generation task submitted',
        progress: 0,
      }
    } catch (error) {
      this.logger.error({ error }, 'Flux Kontext generate error')

      if (axios.isAxiosError(error) && error.response) {
        const { code, msg } = (error.response.data || {}) as {
          code?: number
          msg?: string
        }

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
