/**
 * Pollo Kling Adapter
 *
 * Adapter for Pollo AI's Kling model (kling-ai/kling-1-5).
 * Specialized for image-to-video generation.
 * Extends PolloAdapter with Kling-specific parameters.
 *
 * Features:
 * - Image-to-video generation (URL format only, no base64)
 * - Duration support: 5s or 10s
 * - Strength parameter (0-100)
 * - Negative prompt support
 */

import type { UnifiedGenerationRequest, AdapterResponse } from './types'
import { PolloAdapter } from './pollo-adapter'
import { PolloKlingRequestSchema } from './validation'
import type { z } from 'zod'

export class PolloKlingAdapter extends PolloAdapter {
  protected override getValidationSchema(): z.ZodSchema | null {
    return PolloKlingRequestSchema
  }

  /**
   * Main dispatch method for Pollo Kling API
   * Overrides parent class to add Kling-specific validation
   */
  async dispatch(request: UnifiedGenerationRequest): Promise<AdapterResponse> {
    // Pollo Kling supports image-to-video generation
    return await this.generateVideo(request)
  }

  /**
   * Generates video using Pollo Kling model
   * Overrides parent's generateVideo with Kling-specific logic
   */
  protected async generateVideo(
    request: UnifiedGenerationRequest
  ): Promise<AdapterResponse> {
    try {
      // Build Pollo Kling generation input
      const generationInput: any = {
        prompt: request.prompt,
        length: 5, // Default 5 seconds
      }

      // Handle input images - Required for Kling (but commented out validation to allow text-to-video too)
      if (request.input_images && request.input_images.length > 0) {
        try {
          const imageUrl = request.input_images[0]!

          if (imageUrl.startsWith('data:')) {
            // Pollo Kling API only supports image URL, not base64 format
            this.logger.warn('Pollo Kling API only supports image URL, not base64 format')
            return {
              status: 'ERROR',
              message:
                'Pollo Kling API only supports image URL, not base64 format. Please provide a publicly accessible image URL (supports JPG, PNG, JPEG formats).',
            }
          } else {
            // URL format, use directly
            generationInput.image = imageUrl
          }

          this.logger.info({ imageUrl }, 'Added input image to pollo-kling request')
        } catch (error) {
          this.logger.error({ error }, 'Error processing input image')
          return {
            status: 'ERROR',
            message: `Image processing failed: ${error}`,
          }
        }
      }

      // Handle duration parameter - Kling supports 5 or 10 seconds
      const duration = this.getParameter<number>(request, 'duration', 5)
      if ([5, 10].includes(duration)) {
        generationInput.length = duration
      } else {
        this.logger.warn({ duration }, 'Duration not in supported range, using default 5s')
        generationInput.length = 5
      }

      // Handle negative prompt
      const negativePrompt = request.parameters?.negative_prompt
      if (negativePrompt) {
        generationInput.negativePrompt = negativePrompt
      }

      // Handle strength parameter (0-100, default 50)
      const strength = request.parameters?.strength
      if (strength !== undefined) {
        try {
          const strengthValue =
            typeof strength === 'number' ? strength : parseInt(String(strength))
          if (strengthValue >= 0 && strengthValue <= 100) {
            generationInput.strength = strengthValue
          } else {
            this.logger.warn(
              { strengthValue },
              'Strength value out of range (0-100), using default 50'
            )
            generationInput.strength = 50
          }
        } catch (_error) {
          this.logger.warn({ strength }, 'Invalid strength value, using default 50')
          generationInput.strength = 50
        }
      } else {
        generationInput.strength = 50 // Default
      }

      // Build request
      // Get api_endpoint from database configuration
      let apiEndpoint = this.sourceInfo.apiEndpoint || '/kling-ai/kling-v2'
      if (!apiEndpoint.startsWith('/')) {
        apiEndpoint = '/' + apiEndpoint
      }

      const url = `${this.BASE_URL}${apiEndpoint}`
      const payload = {
        input: generationInput,
      }

      this.logger.info({ url, payload }, 'Calling Pollo Kling API to create generation task')

      // Send request
      let response
      try {
        response = await this.httpClient.post(url, payload, { timeout: 60000 })
        this.logger.info({ status: response.status }, 'Response status')
      } catch (error: any) {
        this.logger.error({ error }, 'HTTP error details')

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
              message: `Pollo Kling API request error: ${errorMessage}`,
            }
          }
        }

        throw error
      }

      const resultData = response.data
      this.logger.info('Pollo Kling API generation task created successfully')
      this.logger.debug({ response: resultData }, 'Response')

      // Parse Pollo API response format
      if (resultData.code !== 'SUCCESS') {
        const errorMsg = resultData.message || 'Unknown error'
        return {
          status: 'ERROR',
          message: `Pollo Kling API returned error: ${errorMsg}`,
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

      this.logger.info({ taskId }, 'pollo-kling image-to-video generation task submitted')

      // Poll for task completion using BaseAdapter method
      const pollResult = await this.pollTaskUntilComplete(taskId, {
        maxDuration: 600,  // 10 minutes (same as PolloAdapter)
        pollInterval: 60000, // 60 seconds
      })

      // Handle poll results
      if (pollResult.status === 'SUCCESS' && pollResult.output) {
        // Download and upload to S3
        const results = []
        for (const videoUrl of pollResult.output) {
          const finalUrl = await this.downloadAndUploadToS3(videoUrl, 'video/mp4')
          results.push({ type: 'video' as const, url: finalUrl })
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
}
