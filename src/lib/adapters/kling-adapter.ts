/**
 * Kling Adapter
 *
 * Adapter for Tuzi-Kling video generation API.
 * Converts image to video using Kling AI through Tuzi provider.
 *
 * Features:
 * - Text-to-video and image-to-video generation
 * - Asynchronous task polling
 * - Aspect ratio conversion
 * - Duration support (5s, 10s)
 */

import type { AxiosInstance } from 'axios'
import { BaseAdapter } from './base-adapter'
import type {
  UnifiedGenerationRequest,
  AdapterResponse,
  GenerationResult,
  TaskStatusResponse,
} from './types'
import { KlingRequestSchema } from './validation'
import type { z } from 'zod'

export class KlingAdapter extends BaseAdapter {
  protected getValidationSchema(): z.ZodSchema | null {
    return KlingRequestSchema
  }

  /**
   * Creates HTTP client with Kling-specific authentication
   */
  protected getHttpClient(): AxiosInstance {
    // Get base client with logging interceptors
    const client = super.getHttpClient()

    // Add Kling-specific headers
    client.defaults.headers['Authorization'] = `Bearer ${this.sourceInfo.encryptedAuthKey}`
    client.defaults.headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36'
    client.defaults.timeout = 600000 // 10 minutes for initial submission

    return client
  }

  /**
   * Converts input size to Kling-supported aspect ratio
   * Supported ratios: "1:1", "16:9", "9:16", "3:4", "4:3"
   */
  private adaptSizeToAspectRatio(sizeInput: string): string {
    const sizeToRatioMap: Record<string, string> = {
      // Square
      '1024x1024': '1:1',
      '512x512': '1:1',
      '768x768': '1:1',
      // Portrait
      '1024x1536': '3:4',
      '1024x1792': '9:16',
      // Landscape
      '1536x1024': '4:3',
      '1792x1024': '16:9',
      // Direct ratios
      '1:1': '1:1',
      '16:9': '16:9',
      '9:16': '9:16',
      '3:4': '3:4',
      '4:3': '4:3',
    }

    // Direct mapping
    if (sizeInput in sizeToRatioMap) {
      return sizeToRatioMap[sizeInput]!
    }

    // Parse size format
    if (sizeInput.includes('x')) {
      try {
        const [w, h] = sizeInput.split('x')
        const width = parseInt(w!)
        const height = parseInt(h!)
        const ratio = width / height

        // Find closest supported ratio
        if (Math.abs(ratio - 1.0) < 0.1) return '1:1'
        if (Math.abs(ratio - 16 / 9) < 0.1) return '16:9'
        if (Math.abs(ratio - 9 / 16) < 0.1) return '9:16'
        if (Math.abs(ratio - 4 / 3) < 0.1) return '4:3'
        if (Math.abs(ratio - 3 / 4) < 0.1) return '3:4'

        // Fallback based on ratio range
        if (ratio > 1.5) return '16:9'
        if (ratio < 0.8) return '9:16'
        return '1:1'
      } catch {
        // Fall through to default
      }
    }

    // Default
    this.logger.warn({ sizeInput }, 'Unrecognized size format, using default 1:1')
    return '1:1'
  }

  // downloadAndUploadToS3 is now provided by BaseAdapter

  /**
   * Checks Kling task status
   * Implements BaseAdapter's checkTaskStatus for standardized polling
   */
  protected async checkTaskStatus(taskId: string): Promise<TaskStatusResponse> {
    const queryUrl = `https://api.tu-zi.com/kling/v1/videos/task/${taskId}`

    try {
      const response = await this.httpClient.get(queryUrl, { timeout: 30000 })
      const result = response.data

      this.logger.debug({ result }, 'Query response')

      // Check response format - Tuzi API format
      if (result.code !== 0) {
        this.logger.error({ message: result.message }, 'API returned error')
        return {
          status: 'FAILED',
          error: result.message || 'API returned error',
        }
      }

      // Extract task status from data field
      const data = result.data || {}
      const taskStatus = data.task_status || 'unknown'
      const taskResult = data.task_result || {}

      this.logger.info({ taskStatus }, 'Task status')

      // Task completed
      if (['completed', 'success', 'finished', 'succeed'].includes(taskStatus)) {
        // Extract video URL from task_result
        let videoUrl: string | null = null

        if (typeof taskResult === 'object') {
          // Try different possible field names
          videoUrl =
            taskResult.video_url ||
            taskResult.url ||
            taskResult.result_url ||
            taskResult.download_url ||
            null

          // Check videos field (actual Tuzi-Kling format)
          if (!videoUrl && taskResult.videos && Array.isArray(taskResult.videos)) {
            const firstVideo = taskResult.videos[0]
            if (firstVideo && typeof firstVideo === 'object') {
              videoUrl =
                firstVideo.url ||
                firstVideo.video_url ||
                firstVideo.download_url ||
                null
            }
          }
        }

        if (videoUrl) {
          this.logger.info({ videoUrl }, 'Task completed')
          return {
            status: 'SUCCESS',
            output: [videoUrl],
          }
        } else {
          this.logger.error({ result }, 'Task completed but no video URL found')
          return {
            status: 'FAILED',
            error: 'Task completed but no video URL found',
          }
        }
      }

      // Task failed
      if (['failed', 'error'].includes(taskStatus)) {
        const errorMsg = data.task_status_msg || taskResult.error || 'Unknown error'
        this.logger.error({ taskId, taskStatus, errorMsg }, 'Task failed')
        return {
          status: 'FAILED',
          error: errorMsg,
        }
      }

      // Task in progress
      if (['submitted', 'processing', 'running', 'pending'].includes(taskStatus)) {
        this.logger.info({ taskStatus }, 'Task in progress')
        return {
          status: 'PROCESSING',
        }
      }

      // Unknown status - treat as processing
      this.logger.warn({ taskStatus }, 'Unknown task status')
      return {
        status: 'PROCESSING',
      }
    } catch (error) {
      this.logger.error({ error }, 'Failed to query task status')
      // Return PROCESSING on error to allow retry
      return {
        status: 'PROCESSING',
      }
    }
  }

  /**
   * Submits video generation task to Kling API
   */
  private async generateVideoSync(
    request: UnifiedGenerationRequest
  ): Promise<any> {
    const endpoint = this.sourceInfo.apiEndpoint

    // Determine API URL based on whether input images are provided
    const apiUrl = !request.input_images
      ? `${endpoint}/text2video`
      : `${endpoint}/image2video`

    // Use only first image if multiple provided
    if (request.input_images && request.input_images.length > 1) {
      this.logger.info(
        { totalImages: request.input_images.length, ignored: request.input_images.length - 1 },
        'Using first image, ignoring other images'
      )
    }

    // Get aspect ratio
    const userSizeInput = this.getParameter(request, 'size_or_ratio', '1024x1024')
    const aspectRatio = this.adaptSizeToAspectRatio(userSizeInput)

    // Handle duration parameter - Kling supports 5 and 10 seconds
    const duration = this.getParameter<number>(request, 'duration', 5)
    const videoDuration = [5, 10].includes(duration) ? duration : 5

    // Prepare payload according to Tuzi-Kling API format
    const payload = {
      model_name: 'kling-v2-master', // Fixed: kling-v2-master
      mode: 'pro', // Fixed: pro mode
      prompt: request.prompt,
      aspect_ratio: aspectRatio,
      duration: videoDuration,
      image: request.input_images?.[0] || null,
      static_mask: null,
      dynamic_masks: null,
    }

    this.logger.info({ apiUrl, payload }, 'Calling Tuzi-Kling API')

    try {
      const response = await this.httpClient.post(apiUrl, payload, {
        timeout: 600000, // 10 minutes
      })

      this.logger.info('Tuzi-Kling API response successful')
      this.logger.debug({ response: response.data }, 'API response')

      return response.data
    } catch (error: any) {
      this.logger.error({ error, errorData: error.response?.data }, 'Tuzi-Kling API request failed')
      throw error
    }
  }

  /**
   * Main dispatch method for video generation requests
   */
  async dispatch(request: UnifiedGenerationRequest): Promise<AdapterResponse> {
    try {
      this.logger.info(
        {
          model: this.sourceInfo.modelIdentifier,
          inputImagesCount: request.input_images?.length || 0,
        },
        'Starting Kling video generation task'
      )

      // Submit video generation task
      const apiResult = await this.generateVideoSync(request)

      // Extract task_id from response
      let taskId: string | null = null
      if (apiResult && typeof apiResult === 'object') {
        taskId = apiResult.task_id || null
        if (!taskId && apiResult.data && typeof apiResult.data === 'object') {
          taskId = apiResult.data.task_id || null
        }
      }

      // If we have task_id, this is an async task
      if (taskId) {
        this.logger.info({ taskId }, 'Kling video generation task submitted')

        // Poll for task completion using BaseAdapter method
        const pollResult = await this.pollTaskUntilComplete(taskId, {
          maxDuration: 1200,  // 20 minutes
          pollInterval: 60000, // 60 seconds
        })

        // Handle poll results
        if (pollResult.status === 'SUCCESS' && pollResult.output && pollResult.output.length > 0) {
          const videoUrl = pollResult.output[0]!
          this.logger.info({ url: videoUrl }, 'Video generation completed')

          // Upload to S3 if configured
          const finalUrl = await this.downloadAndUploadToS3(videoUrl, 'video/mp4')

          return {
            status: 'SUCCESS',
            results: [{ type: 'video', url: finalUrl }],
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
      }

      // If no task_id, check for direct results (unlikely for Kling)
      const results: GenerationResult[] = []

      // Try to find video URL in response
      if (apiResult && typeof apiResult === 'object') {
        let videoUrl: string | null = null

        // Try different possible field names
        videoUrl =
          apiResult.url ||
          apiResult.video_url ||
          apiResult.result_url ||
          apiResult.download_url ||
          null

        // Check data field
        if (!videoUrl && apiResult.data && typeof apiResult.data === 'object') {
          const data = apiResult.data
          videoUrl =
            data.url || data.video_url || data.result_url || null

          // Check if data is array
          if (
            !videoUrl &&
            Array.isArray(data) &&
            data.length > 0 &&
            typeof data[0] === 'object'
          ) {
            const firstItem = data[0]
            videoUrl =
              firstItem.url || firstItem.video_url || firstItem.result_url || null
          }
        }

        if (videoUrl) {
          this.logger.info({ videoUrl }, 'Got video URL')
          const finalUrl = await this.downloadAndUploadToS3(videoUrl, 'video/mp4')
          results.push({ type: 'video', url: finalUrl })
        }
      }

      if (results.length > 0) {
        this.logger.info({ resultsCount: results.length }, 'Kling video generation successful')
        return {
          status: 'SUCCESS',
          results,
        }
      }

      // No task_id and no results
      return {
        status: 'ERROR',
        message: 'Unable to extract valid results from API response',
      }
    } catch (error: any) {
      this.logger.error({ error }, 'Unexpected error')
      return {
        status: 'ERROR',
        message: `An unexpected error occurred: ${error.message || String(error)}`,
      }
    }
  }
}
