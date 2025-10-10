/**
 * TuziOpenAIAdapter - Tuzi OpenAI-compatible Image Generation API Adapter
 *
 * Handles OpenAI-style image generation and editing
 */

import axios, { type AxiosInstance } from 'axios'
import { BaseAdapter } from './base-adapter'
import { s3Uploader } from './utils/s3-uploader'
import type {
  UnifiedGenerationRequest,
  GenerationResult,
  AdapterResponse,
} from './types'
import { TuziOpenAIRequestSchema } from './validation'
import type { z } from 'zod'

export class TuziOpenAIAdapter extends BaseAdapter {
  protected getValidationSchema(): z.ZodSchema | null {
    return TuziOpenAIRequestSchema
  }

  protected getHttpClient(): AxiosInstance {
    const client = axios.create({
      headers: {
        Authorization: `Bearer ${this.sourceInfo.encryptedAuthKey}`,
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
      },
      timeout: 600000, // 10 minutes
    })
    return client
  }

  /**
   * Process API response and upload to S3
   */
  private async processApiResponse(apiData: any): Promise<GenerationResult[]> {
    const results: GenerationResult[] = []
    const uploadS3 = this.sourceInfo.uploadToS3 ?? false
    const s3Prefix = this.sourceInfo.s3PathPrefix || 'tuzi-images'

    const dataArray = apiData.data || []

    for (const item of dataArray) {
      const url = item.url
      const b64Json = item.b64_json

      let finalUrl: string | null = null

      if (b64Json) {
        // Decode base64 and upload to S3
        const imageBuffer = Buffer.from(b64Json, 'base64')

        if (uploadS3) {
          finalUrl = await s3Uploader.uploadBuffer(imageBuffer, s3Prefix, 'image/png')
        } else {
          // TODO: Implement local save as fallback
          this.logger.warn('S3 not enabled, image will be lost')
          finalUrl = `data:image/png;base64,${b64Json}`
        }
      } else if (url) {
        finalUrl = url
      }

      if (finalUrl) {
        results.push({
          type: 'image',
          url: finalUrl,
        })
      }
    }

    return results
  }

  /**
   * Find best matching size for gpt-image-1-vip model
   * Supported sizes: 1024x1024, 1024x1536, 1536x1024
   */
  private findBestSize(userInput?: string): string {
    const supportedSizes = ['1024x1024', '1024x1536', '1536x1024']
    const defaultSize = '1024x1024'

    if (!userInput) {
      return defaultSize
    }

    // Direct match
    if (supportedSizes.includes(userInput)) {
      return userInput
    }

    // Parse ratio
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
      // Find closest ratio
      let bestMatch = defaultSize
      let smallestDiff = Infinity

      for (const size of supportedSizes) {
        const [w, h] = size.split('x').map(Number)
        if (w && h) {
          const ratio = w / h
          const diff = Math.abs(ratio - requestedRatio)

          if (diff < smallestDiff) {
            smallestDiff = diff
            bestMatch = size
          }
        }
      }

      return bestMatch
    }

    return defaultSize
  }

  /**
   * Generate images using OpenAI-style API
   */
  private async generate(request: UnifiedGenerationRequest): Promise<AdapterResponse> {
    const endpoint = this.sourceInfo.apiEndpoint
    const url = `${endpoint}/generations`

    const userSizeInput = request.parameters?.size_or_ratio as string | undefined
    const size = this.findBestSize(userSizeInput)

    const payload = {
      model: 'gpt-image-1-vip',
      prompt: request.prompt,
      n: request.number_of_outputs,
      quality: 'auto',
      response_format: 'b64_json',
      size,
    }

    this.logger.info({ url, userSizeInput, size }, 'Calling generate API')

    try {
      const response = await this.httpClient.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const apiResponse = response.data
      const results = await this.processApiResponse(apiResponse)

      // Check if we got any results
      if (results.length === 0) {
        return {
          status: 'ERROR',
          message: 'No image generated from API response',
        }
      }

      return {
        status: 'SUCCESS',
        results,
      }
    } catch (error) {
      this.logger.error({ error }, 'Generate error')
      return {
        status: 'ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  /**
   * Edit images using OpenAI-style API (multipart/form-data)
   * TODO: Implement when needed
   */
  private async edit(_request: UnifiedGenerationRequest): Promise<AdapterResponse> {
    this.logger.warn('Edit functionality not yet implemented')
    return {
      status: 'ERROR',
      message: 'Edit functionality not yet implemented',
    }
  }

  async dispatch(request: UnifiedGenerationRequest): Promise<AdapterResponse> {
    // Determine task type from parameters or default to generate
    const taskType = (request.parameters?.task_type as string) || 'generate'

    this.logger.info({ taskType }, 'Dispatching task')

    if (taskType === 'generate') {
      return this.generate(request)
    } else if (taskType === 'edit') {
      return this.edit(request)
    } else {
      return {
        status: 'ERROR',
        message: `Unsupported task type: ${taskType}. Use 'generate' or 'edit'`,
      }
    }
  }
}
