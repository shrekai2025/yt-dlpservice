/**
 * FluxAdapter - Flux Image Generation API Adapter
 *
 * Handles Flux image generation with aspect ratio support
 */

import axios, { type AxiosInstance } from 'axios'
import { BaseAdapter } from './base-adapter'
import type {
  UnifiedGenerationRequest,
  GenerationResult,
  AdapterResponse,
} from './types'
import { FluxRequestSchema } from './validation'
import type { z } from 'zod'

export class FluxAdapter extends BaseAdapter {
  protected getValidationSchema(): z.ZodSchema | null {
    return FluxRequestSchema
  }

  protected getHttpClient(): AxiosInstance {
    const client = axios.create({
      headers: {
        Authorization: `Bearer ${this.sourceInfo.encryptedAuthKey}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      timeout: 600000, // 10 minutes
    })
    return client
  }

  // downloadAndUploadToS3 is now provided by BaseAdapter

  /**
   * Convert size input to Flux aspect ratio
   * Supported ratios: "21:9", "16:9", "4:3", "1:1", "3:4", "9:16", "9:21"
   */
  private adaptSizeToAspectRatio(sizeInput: string): string {
    const sizeToRatioMap: Record<string, string> = {
      // Square
      '1024x1024': '1:1',
      '512x512': '1:1',
      '768x768': '1:1',
      // Standard 4:3
      '1024x768': '4:3',
      '1536x1152': '4:3',
      // Portrait 3:4
      '768x1024': '3:4',
      '1152x1536': '3:4',
      // Widescreen 16:9
      '1920x1080': '16:9',
      '1792x1008': '16:9',
      '1344x756': '16:9',
      // Phone portrait 9:16
      '1080x1920': '9:16',
      '1008x1792': '9:16',
      '756x1344': '9:16',
      // Ultra-wide 21:9
      '2560x1080': '21:9',
      '1792x756': '21:9',
      // Ultra-tall 9:21
      '1080x2560': '9:21',
      '756x1792': '9:21',
      // Direct ratios
      '21:9': '21:9',
      '16:9': '16:9',
      '4:3': '4:3',
      '1:1': '1:1',
      '3:4': '3:4',
      '9:16': '9:16',
      '9:21': '9:21',
    }

    // Direct mapping
    if (sizeInput in sizeToRatioMap) {
      return sizeToRatioMap[sizeInput]!
    }

    // Try to parse size format
    if (sizeInput.includes('x') || sizeInput.includes(':')) {
      try {
        const separator = sizeInput.includes('x') ? 'x' : ':'
        const [w, h] = sizeInput.split(separator).map(Number)

        if (w && h) {
          const ratio = w / h

          // Find closest ratio
          if (Math.abs(ratio - 1.0) < 0.05) return '1:1'
          if (Math.abs(ratio - 21 / 9) < 0.1) return '21:9'
          if (Math.abs(ratio - 16 / 9) < 0.1) return '16:9'
          if (Math.abs(ratio - 4 / 3) < 0.1) return '4:3'
          if (Math.abs(ratio - 3 / 4) < 0.1) return '3:4'
          if (Math.abs(ratio - 9 / 16) < 0.1) return '9:16'
          if (Math.abs(ratio - 9 / 21) < 0.1) return '9:21'

          // Range-based selection
          if (ratio >= 2.0) return '21:9'
          if (ratio >= 1.5) return '16:9'
          if (ratio > 1.0) return '4:3'
          if (ratio >= 0.7) return '3:4'
          if (ratio >= 0.4) return '9:16'
          return '9:21'
        }
      } catch {
        // Ignore parse errors
      }
    }

    this.logger.warn({ sizeInput }, 'Unable to recognize size format, using default 1:1')
    return '1:1'
  }

  async dispatch(request: UnifiedGenerationRequest): Promise<AdapterResponse> {
    const apiEndpoint = this.sourceInfo.apiEndpoint

    try {
      // Validate and normalize request
      const validatedRequest = this.validateRequest(request)

      // 1. Prepend image URLs to prompt if present
      let prompt = validatedRequest.prompt
      if (validatedRequest.input_images && validatedRequest.input_images.length > 0) {
        const imageUrls = validatedRequest.input_images.join(' ')
        prompt = `${imageUrls} ${prompt}`
      }

      // 2. Build payload
      const userSizeInput = (validatedRequest.parameters?.size_or_ratio as string | undefined) || '1024x1024'
      const aspectRatio = this.adaptSizeToAspectRatio(userSizeInput)

      this.logger.debug({ userSizeInput, aspectRatio }, 'Converting size input to aspect ratio')

      const payload = {
        model: this.sourceInfo.modelIdentifier,
        prompt,
        aspect_ratio: aspectRatio,
        output_format: 'png',
        safety_tolerance: 6,
        seed: null,
        prompt_upsampling: false,
      }

      this.logger.info({ apiEndpoint }, 'Calling Flux API')

      // 3. Call Flux API
      const response = await this.httpClient.post(apiEndpoint, payload)
      const apiResponse = response.data

      this.logger.info('Received response from Flux API')

      // 4. Process response
      const results: GenerationResult[] = []

      if (apiResponse?.data && Array.isArray(apiResponse.data)) {
        const fluxUrl = apiResponse.data[0]?.url

        if (fluxUrl) {
          const finalUrl = await this.downloadAndUploadToS3(fluxUrl, 'image/png')
          results.push({
            type: 'image',
            url: finalUrl,
          })
        }
      }

      // Check if we got any results
      if (results.length === 0) {
        return {
          status: 'ERROR',
          message: 'No image URL found in API response',
        }
      }

      return {
        status: 'SUCCESS',
        results,
      }
    } catch (error) {
      return this.handleError(error, 'Flux image generation')
    }
  }
}
