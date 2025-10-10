/**
 * Pollo Adapter
 *
 * Adapter for Pollo AI API provider, supporting veo3 video generation.
 * Uses prediction-based async task system similar to Replicate.
 *
 * Features:
 * - Text-to-video and image-to-video generation
 * - Asynchronous task polling
 * - 16:9 aspect ratio (fixed)
 * - Audio generation support
 * - Duration: 8 seconds default
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
import { PolloRequestSchema } from './validation'
import type { z } from 'zod'

export class PolloAdapter extends BaseAdapter {
  protected getValidationSchema(): z.ZodSchema | null {
    return PolloRequestSchema
  }

  protected readonly BASE_URL = 'https://pollo.ai/api/platform/generation'
  protected readonly maxPollingTime = 600 // 10 minutes
  protected readonly pollingInterval = 60000 // 60 seconds in milliseconds

  /**
   * Creates HTTP client with Pollo authentication
   */
  protected getHttpClient(): AxiosInstance {
    const apiKey = this.sourceInfo.encryptedAuthKey
    if (!apiKey) {
      this.logger.error('API key is empty! Please check configuration')
      throw new Error('Pollo API key not configured')
    }

    this.logger.info(
      { apiKeyLength: apiKey.length, apiKeyPrefix: apiKey.substring(0, 12) + '...' },
      'Configuring HTTP client'
    )

    const client = axios.create({
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'User-Agent': 'GenApiHub/1.0 (https://genapihub.com)',
      },
      timeout: 60000, // 60 seconds
    })

    // Add interceptors
    client.interceptors.request.use(
      (config) => {
        this.logger.debug(
          { url: config.url, method: config.method, headers: config.headers },
          'Request'
        )
        return config
      },
      (error) => {
        this.logger.error({ error }, 'Request Error')
        return Promise.reject(error)
      }
    )

    client.interceptors.response.use(
      (response) => {
        this.logger.debug(
          { status: response.status, headers: response.headers, data: response.data },
          'Response'
        )
        return response
      },
      (error) => {
        this.logger.error(
          {
            status: error.response?.status,
            headers: error.response?.headers,
            data: error.response?.data,
            message: error.message,
          },
          'Response Error'
        )
        return Promise.reject(error)
      }
    )

    this.logger.info('HTTP client configured')
    return client
  }

  // downloadAndUploadToS3 is now provided by BaseAdapter

  /**
   * Checks generation task status
   * Implements BaseAdapter's checkTaskStatus for standardized polling
   */
  protected async checkTaskStatus(taskId: string): Promise<TaskStatusResponse> {
    const statusUrl = `${this.BASE_URL}/${taskId}/status`

    try {
      this.logger.info({ statusUrl }, 'Querying task status')
      const response = await this.httpClient.get(statusUrl, { timeout: 30000 })

      const resultData = response.data
      this.logger.debug({ resultData }, 'Status query response')

      // Parse Pollo response format
      if (resultData.code !== 'SUCCESS' || !resultData.data) {
        const errorMsg = resultData.message || 'Status query API returned invalid format'
        this.logger.error({ errorMsg }, 'Pollo status query failed')
        return { status: 'FAILED', error: errorMsg }
      }

      const data = resultData.data
      const generations = data.generations

      if (!generations || generations.length === 0) {
        // Task still in queue or initializing
        this.logger.info({ taskId }, 'Task still queuing or initializing')
        return { status: 'PROCESSING' }
      }

      // We only care about the first generation's status
      const taskStatusInfo = generations[0]
      const taskStatus = (taskStatusInfo.status || '').toLowerCase()

      if (taskStatus === 'succeed') {
        const videoUrl = taskStatusInfo.url
        if (!videoUrl) {
          this.logger.error({ taskId }, 'Task status is succeed, but no output URL found')
          return { status: 'FAILED', error: 'Task succeeded but no output URL found' }
        }

        this.logger.info({ taskId, videoUrl }, 'Task succeeded')
        return {
          status: 'SUCCESS',
          output: [videoUrl],
        }
      } else if (taskStatus === 'failed') {
        const failMsg = taskStatusInfo.failMsg || 'Unknown error'
        this.logger.error({ taskId, failMsg }, 'Task failed')
        return { status: 'FAILED', error: failMsg }
      } else if (['waiting', 'processing'].includes(taskStatus)) {
        this.logger.info({ taskId, taskStatus }, 'Task still in progress')
        return { status: 'PROCESSING' }
      } else {
        // Unknown status, continue polling
        this.logger.warn({ taskStatus }, 'Unknown task status, continue polling')
        return { status: 'PROCESSING' }
      }
    } catch (error: any) {
      if (error.response) {
        this.logger.error({ error }, 'Network error polling task status')
      } else {
        this.logger.error({ error }, 'Unknown error parsing task status')
      }
      // Return PROCESSING on network error to allow retry
      return { status: 'PROCESSING' }
    }
  }


  /**
   * Generates video using Pollo veo3 model
   * Protected to allow subclasses to override
   */
  protected async generateVideo(
    request: UnifiedGenerationRequest
  ): Promise<AdapterResponse> {
    try {
      // Build Pollo generation input
      const generationInput: any = {
        prompt: request.prompt,
        aspectRatio: '16:9', // Pollo veo3 only supports 16:9
        generateAudio: true, // Default generate audio
      }

      // Handle input images - Pollo needs image URL format
      if (request.input_images && request.input_images.length > 0) {
        try {
          const imageUrl = request.input_images[0]!
          if (imageUrl.startsWith('data:')) {
            this.logger.warn('Pollo API docs show only image URL is supported, not base64 format')
            // May need to upload to temporary storage and get URL
            // For now, pass directly and see if API supports it
            generationInput.image = imageUrl
          } else {
            // URL format, use directly
            generationInput.image = imageUrl
          }
          this.logger.info('Added input image to pollo-veo3 request')
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
      generationInput.length = duration

      // Handle negative prompt
      const negativePrompt = request.parameters?.negative_prompt
      if (negativePrompt) {
        generationInput.negativePrompt = negativePrompt
      }

      // Handle seed
      const seed = request.parameters?.seed
      if (seed !== undefined) {
        generationInput.seed = seed
      }

      // Handle audio generation setting
      const generateAudio =
        request.parameters?.generate_audio ??
        request.parameters?.generateAudio
      if (generateAudio !== undefined) {
        generationInput.generateAudio = Boolean(generateAudio)
      }

      // Build request
      const apiEndpoint = this.sourceInfo.apiEndpoint || '/google/veo3'
      const url = `${this.BASE_URL}${apiEndpoint}`
      const payload = {
        input: generationInput,
      }

      this.logger.info(
        {
          url,
          payload,
          apiKeyPrefix: this.sourceInfo.encryptedAuthKey?.substring(0, 10) + '...',
        },
        'Calling Pollo API to create generation task'
      )

      // Send request
      let response
      try {
        response = await this.httpClient.post(url, payload, { timeout: 60000 })
        this.logger.info({ status: response.status, headers: response.headers }, 'Response received')
      } catch (error: any) {
        this.logger.error(
          {
            error,
            url,
            method: 'POST',
            headers: this.httpClient.defaults.headers,
            body: payload,
          },
          'HTTP error details'
        )

        // Try to parse error response
        if (error.response?.data) {
          const errorData = error.response.data
          this.logger.error({ errorData }, 'Error response')

          // Handle specific errors
          const errorMessage = errorData.message || ''
          if (
            errorMessage.toLowerCase().includes('credit') ||
            errorMessage.toLowerCase().includes('credits')
          ) {
            return {
              status: 'ERROR',
              message: `Pollo account credits insufficient: ${errorMessage}`,
            }
          } else if (errorData.code === 'BAD_REQUEST') {
            return {
              status: 'ERROR',
              message: `Pollo API request error: ${errorMessage}`,
            }
          }
        }

        throw error
      }

      const resultData = response.data
      this.logger.info('Pollo API generation task created successfully')
      this.logger.debug({ response: resultData }, 'Response')

      // Parse Pollo API response format
      if (resultData.code !== 'SUCCESS') {
        const errorMsg = resultData.message || 'Unknown error'
        return {
          status: 'ERROR',
          message: `Pollo API returned error: ${errorMsg}`,
        }
      }

      // Extract taskId from data field
      const data = resultData.data
      const taskId = data?.taskId
      if (!taskId) {
        return {
          status: 'ERROR',
          message: 'TaskId not found in API response',
        }
      }

      this.logger.info({ taskId }, 'pollo-veo3 video generation task submitted')

      // Poll for task completion using BaseAdapter method
      const pollResult = await this.pollTaskUntilComplete(taskId, {
        maxDuration: this.maxPollingTime,
        pollInterval: this.pollingInterval,
      })

      // Handle poll results
      if (pollResult.status === 'SUCCESS' && pollResult.output) {
        // Download and upload to S3
        const results: GenerationResult[] = []
        for (const videoUrl of pollResult.output) {
          const finalUrl = await this.downloadAndUploadToS3(videoUrl, 'video/mp4')
          results.push({ type: 'video', url: finalUrl })
        }

        return {
          status: 'SUCCESS',
          results,
        }
      } else if (pollResult.status === 'FAILED') {
        return {
          status: 'ERROR',
          message: `Video generation failed: ${pollResult.error}`,
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
      // Pollo veo3 only supports video generation (no task_type check needed in TS version)
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
