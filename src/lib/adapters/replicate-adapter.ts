/**
 * Replicate Adapter
 *
 * Adapter for Replicate API provider, supporting veo3 video generation.
 * Uses the prediction-based async task system.
 *
 * Features:
 * - Text-to-video and image-to-video generation
 * - Asynchronous prediction polling
 * - Official model and custom model support
 * - 16:9 aspect ratio (fixed for veo3)
 * - Audio generation support
 */

import axios from 'axios'
import type { AxiosInstance } from 'axios'
import { BaseAdapter } from './base-adapter'
import type {
  UnifiedGenerationRequest,
  AdapterResponse,
  GenerationResult,
  TaskStatusResponse,
} from './types'
import { ReplicateRequestSchema } from './validation'
import type { z } from 'zod'

export class ReplicateAdapter extends BaseAdapter {
  protected getValidationSchema(): z.ZodSchema | null {
    return ReplicateRequestSchema
  }

  private readonly BASE_URL = 'https://api.replicate.com/v1'
  private readonly maxPollingTime = 600 // 10 minutes
  private readonly pollingInterval = 60000 // 60 seconds in milliseconds

  /**
   * Creates HTTP client with Replicate authentication
   */
  protected getHttpClient(): AxiosInstance {
    const client = axios.create({
      headers: {
        Authorization: `Bearer ${this.sourceInfo.encryptedAuthKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'GenApiHub/1.0 (https://genapihub.com)',
      },
      timeout: 60000, // 60 seconds
    })

    // Add interceptors
    client.interceptors.request.use(
      (config) => {
        this.logger.debug({ url: config.url, method: config.method }, 'Request')
        return config
      },
      (error) => {
        this.logger.error({ error }, 'Request Error')
        return Promise.reject(error)
      }
    )

    client.interceptors.response.use(
      (response) => {
        this.logger.debug({ status: response.status, data: response.data }, 'Response')
        return response
      },
      (error) => {
        this.logger.error(
          {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
          },
          'Response Error'
        )
        return Promise.reject(error)
      }
    )

    return client
  }

  // downloadAndUploadToS3 is now provided by BaseAdapter

  /**
   * Converts URL to base64 data URI
   */
  private async urlToBase64(imageUrl: string): Promise<string> {
    try {
      this.logger.info({ imageUrl }, 'Converting image URL to base64')
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
      })

      const buffer = Buffer.from(response.data)
      const base64 = buffer.toString('base64')
      const mimeType = response.headers['content-type'] || 'image/png'

      return `data:${mimeType};base64,${base64}`
    } catch (error) {
      this.logger.error({ error }, 'Failed to convert URL to base64')
      throw error
    }
  }

  /**
   * Checks prediction status
   * Implements BaseAdapter's checkTaskStatus for standardized polling
   */
  protected async checkTaskStatus(taskId: string): Promise<TaskStatusResponse> {
    try {
      const url = `${this.BASE_URL}/predictions/${taskId}`
      const response = await this.httpClient.get(url, { timeout: 30000 })

      const data = response.data
      const status = (data.status || '').toLowerCase()

      this.logger.info({ status }, 'Prediction status')

      if (status === 'succeeded') {
        // Success - parse output
        const output = data.output

        if (output) {
          // veo3 output is usually a list of video URLs
          let videoUrls: string[] = []
          if (Array.isArray(output)) {
            videoUrls = output.filter((url) => typeof url === 'string')
          } else if (typeof output === 'string') {
            videoUrls = [output]
          }

          if (videoUrls.length > 0) {
            return {
              status: 'SUCCESS',
              output: videoUrls,
            }
          } else {
            return {
              status: 'FAILED',
              error: 'API returned success but no video URLs',
            }
          }
        } else {
          return {
            status: 'FAILED',
            error: 'API returned success but no output content',
          }
        }
      } else if (['starting', 'processing'].includes(status)) {
        return { status: 'PROCESSING' }
      } else if (['failed', 'canceled'].includes(status)) {
        const errorMsg = data.error || 'Prediction failed'
        return {
          status: 'FAILED',
          error: errorMsg,
        }
      } else {
        // Unknown status, treat as processing
        return { status: 'PROCESSING' }
      }
    } catch (error: any) {
      this.logger.error({ error }, 'Failed to check prediction status')
      // Return PROCESSING on error to allow retry
      return {
        status: 'PROCESSING',
      }
    }
  }

  /**
   * Generates video using Replicate veo3 model
   */
  private async generateVideo(
    request: UnifiedGenerationRequest
  ): Promise<AdapterResponse> {
    try {
      // Build veo3 prediction input
      const predictionInput: any = {
        prompt: request.prompt,
        aspectRatio: '16:9', // veo3 only supports 16:9
        generateAudio: true, // Default generate audio
      }

      // Handle input images - veo3 needs base64 format
      if (request.input_images && request.input_images.length > 0) {
        try {
          const imageUrl = request.input_images[0]!
          if (imageUrl.startsWith('data:')) {
            // Already base64 format
            predictionInput.image = imageUrl
          } else {
            // URL format, need to convert to base64
            predictionInput.image = await this.urlToBase64(imageUrl)
          }
          this.logger.info('Added input image to veo3 request')
        } catch (error) {
          this.logger.error({ error }, 'Error processing input image')
          return {
            status: 'ERROR',
            message: `Image processing failed: ${error}`,
          }
        }
      }

      // Handle duration parameter
      const duration = this.getParameter<number>(request, 'duration', 8)
      predictionInput.length = duration

      // Handle negative prompt
      const negativePrompt = request.parameters?.negative_prompt
      if (negativePrompt) {
        predictionInput.negativePrompt = negativePrompt
      }

      // Handle seed
      const seed = request.parameters?.seed
      if (seed !== undefined) {
        predictionInput.seed = seed
      }

      // Handle audio generation setting
      const generateAudio =
        request.parameters?.generate_audio ?? request.parameters?.generateAudio
      if (generateAudio !== undefined) {
        predictionInput.generateAudio = Boolean(generateAudio)
      }

      // veo3 is Official Model, uses special endpoint format
      const apiEndpoint = this.sourceInfo.apiEndpoint || ''
      let url: string
      let payload: any

      if (apiEndpoint.includes('google/veo-3') || apiEndpoint.includes('google/veo3')) {
        // Official model, use official model endpoint format
        url = 'https://api.replicate.com/v1/models/google/veo-3/predictions'
        // For official models, no version field needed
        payload = {
          input: predictionInput,
        }
      } else {
        // Non-official model, use traditional predictions endpoint
        url = apiEndpoint || `${this.BASE_URL}/predictions`
        const modelVersion = this.sourceInfo.modelVersion || 'google/veo-3'
        payload = {
          version: modelVersion,
          input: predictionInput,
        }
      }

      this.logger.info({ url, payload }, 'Calling Replicate API to create prediction')

      // Send request
      const response = await this.httpClient.post(url, payload, {
        timeout: 60000,
      })

      const resultData = response.data
      this.logger.info('Replicate API prediction created successfully')
      this.logger.debug({ response: resultData }, 'Response')

      // Extract prediction ID
      const predictionId = resultData.id
      if (!predictionId) {
        return {
          status: 'ERROR',
          message: 'Prediction ID not found in API response',
        }
      }

      this.logger.info({ predictionId }, 'veo3 video generation task submitted')

      // Poll for prediction completion using BaseAdapter method
      const pollResult = await this.pollTaskUntilComplete(predictionId, {
        maxDuration: this.maxPollingTime,
        pollInterval: this.pollingInterval,
      })

      // Handle poll results
      if (pollResult.status === 'SUCCESS' && pollResult.output) {
        // Download and upload to S3
        const finalResults: GenerationResult[] = []
        for (const videoUrl of pollResult.output) {
          const finalUrl = await this.downloadAndUploadToS3(videoUrl, 'video/mp4')
          finalResults.push({ type: 'video', url: finalUrl })
        }

        return {
          status: 'SUCCESS',
          results: finalResults,
        }
      } else if (pollResult.status === 'FAILED') {
        return {
          status: 'ERROR',
          message: `Video generation failed: ${pollResult.error || 'Unknown error'}`,
        }
      } else {
        return {
          status: 'ERROR',
          message: 'Video generation task failed or timed out',
        }
      }
    } catch (error: any) {
      this.logger.error({ error }, 'Unexpected error')
      return {
        status: 'ERROR',
        message: `An unexpected error occurred: ${error.message || String(error)}`,
      }
    }
  }

  /**
   * Main dispatch method
   */
  async dispatch(request: UnifiedGenerationRequest): Promise<AdapterResponse> {
    try {
      // Replicate veo3 only supports video generation (no task_type check needed in TS version)
      return await this.generateVideo(request)
    } catch (error: any) {
      this.logger.error({ error }, 'Dispatch error')
      return {
        status: 'ERROR',
        message: `An error occurred: ${error.message || String(error)}`,
      }
    }
  }
}
