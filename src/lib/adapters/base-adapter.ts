/**
 * Base Adapter Abstract Class
 *
 * All adapters must inherit from this class and implement the dispatch method.
 * Provides common functionality: S3 upload, polling, retry, logging, error handling.
 */

import axios from 'axios'
import type { AxiosInstance } from 'axios'
import { z } from 'zod'
import { createLogger } from '~/lib/logger'
import { retryWithBackoff, type RetryConfig, DEFAULT_RETRY_CONFIG } from '~/lib/utils/retry'
import {
  mapHttpErrorToGenerationError,
  InvalidRequestError,
  InvalidParametersError,
  S3UploadError,
} from '~/lib/errors/generation-errors'
import { s3Uploader } from '~/lib/adapters/utils/s3-uploader'
import { errorMonitor } from '~/lib/services/error-monitor'
import type {
  ProviderConfig,
  UnifiedGenerationRequest,
  AdapterResponse,
  HttpClientConfig,
  TaskStatusResponse,
} from './types'

export abstract class BaseAdapter {
  protected sourceInfo: ProviderConfig
  protected httpClient: AxiosInstance
  protected logger: any
  protected retryConfig: RetryConfig

  constructor(sourceInfo: ProviderConfig) {
    this.sourceInfo = sourceInfo
    this.logger = createLogger({
      source: sourceInfo.adapterName,
      adapter: sourceInfo.adapterName,
    })
    this.retryConfig = this.getRetryConfig()
    this.httpClient = this.getHttpClient()
  }

  /**
   * Creates and configures the HTTP client
   * Can be overridden by subclasses for custom authentication
   */
  protected getHttpClient(): AxiosInstance {
    const config: HttpClientConfig = {
      timeout: 60000, // 60 seconds default timeout
      headers: {
        'Content-Type': 'application/json',
      },
    }

    const client = axios.create(config)

    // Add request interceptor for logging
    client.interceptors.request.use(
      (config) => {
        this.logger.debug(
          {
            url: config.url,
            method: config.method,
            headers: config.headers,
          },
          'HTTP request'
        )
        return config
      },
      (error) => {
        this.logger.error({ error }, 'HTTP request error')
        return Promise.reject(error)
      }
    )

    // Add response interceptor for logging
    client.interceptors.response.use(
      (response) => {
        this.logger.debug(
          {
            status: response.status,
            headers: response.headers,
          },
          'HTTP response'
        )
        return response
      },
      (error) => {
        this.logger.warn(
          {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
          },
          'HTTP response error'
        )
        return Promise.reject(error)
      }
    )

    return client
  }

  /**
   * Get retry configuration for this adapter
   * Can be overridden by subclasses
   */
  protected getRetryConfig(): RetryConfig {
    return {
      ...DEFAULT_RETRY_CONFIG,
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 30000,
    }
  }

  /**
   * Execute HTTP request with retry
   */
  protected async executeWithRetry<T>(
    fn: () => Promise<T>,
    operationName?: string
  ): Promise<T> {
    return retryWithBackoff(fn, this.retryConfig, {
      operationName: operationName || 'HTTP request',
      logger: this.logger,
    })
  }

  /**
   * Downloads media from URL and optionally uploads to S3
   * @param url - Media URL to download
   * @param contentType - MIME type (image/png, video/mp4, etc.)
   * @param prefix - S3 path prefix override (optional)
   */
  protected async downloadAndUploadToS3(
    url: string,
    contentType: string,
    prefix?: string
  ): Promise<string> {
    try {
      // Check if S3 upload is enabled
      if (!this.sourceInfo.uploadToS3) {
        this.logger.info(
          { url },
          'S3 upload disabled, returning direct URL'
        )
        return url
      }

      this.logger.info(
        { url, contentType },
        'Downloading media from URL'
      )

      // Download media with retry
      const response = await this.executeWithRetry(
        () => axios.get(url, {
          responseType: 'arraybuffer',
          timeout: 60000,
        }),
        'Download media'
      )

      const buffer = Buffer.from(response.data)
      const s3Prefix = prefix || this.sourceInfo.s3PathPrefix || 'default'

      this.logger.info(
        { size: buffer.length, prefix: s3Prefix },
        'Uploading to S3'
      )

      // Upload to S3
      const s3Url = await s3Uploader.uploadBuffer(
        buffer,
        s3Prefix,
        contentType
      )

      if (!s3Url) {
        throw new S3UploadError('S3 upload failed, uploader returned null')
      }

      this.logger.info({ s3Url }, 'S3 upload successful')
      return s3Url
    } catch (error) {
      this.logger.error(
        { error, url },
        'Failed to download/upload media'
      )

      if (error instanceof S3UploadError) {
        throw error
      }

      throw new S3UploadError(
        'Failed to download or upload media',
        { url, originalError: error }
      )
    }
  }

  /**
   * Uploads base64-encoded image to S3
   * @param base64Data - Base64 image data (with or without data URI prefix)
   * @param prefix - S3 path prefix override (optional)
   */
  protected async uploadBase64ToS3(
    base64Data: string,
    prefix?: string
  ): Promise<string> {
    try {
      if (!this.sourceInfo.uploadToS3) {
        this.logger.warn('S3 upload disabled but uploadBase64ToS3 was called')
        throw new S3UploadError('Cannot upload base64 image: S3 upload is disabled')
      }

      // Remove data URI prefix if present
      const base64String = base64Data.replace(/^data:image\/\w+;base64,/, '')
      const buffer = Buffer.from(base64String, 'base64')
      const s3Prefix = prefix || this.sourceInfo.s3PathPrefix || 'default'

      this.logger.info(
        { size: buffer.length, prefix: s3Prefix },
        'Uploading base64 image to S3'
      )

      const s3Url = await s3Uploader.uploadBuffer(
        buffer,
        s3Prefix,
        'image/png'
      )

      if (!s3Url) {
        throw new S3UploadError('S3 upload failed, uploader returned null')
      }

      this.logger.info({ s3Url }, 'Base64 image upload successful')
      return s3Url
    } catch (error) {
      this.logger.error({ error }, 'Failed to upload base64 image')

      if (error instanceof S3UploadError) {
        throw error
      }

      throw new S3UploadError(
        'Failed to upload base64 image',
        { originalError: error }
      )
    }
  }

  /**
   * Check task status - must be implemented by adapters that support async tasks
   * @param taskId - Provider task ID
   * @returns Task status response
   */
  protected async checkTaskStatus(
    taskId: string
  ): Promise<TaskStatusResponse> {
    throw new Error(
      `${this.sourceInfo.adapterName} does not support async task polling`
    )
  }

  /**
   * Poll task until completion or timeout
   * @param taskId - Provider task ID
   * @param options - Polling options
   */
  protected async pollTaskUntilComplete(
    taskId: string,
    options?: {
      maxDuration?: number     // Max polling time in seconds (default: 600)
      pollInterval?: number    // Poll interval in ms (default: 60000)
      useExponentialBackoff?: boolean  // Use exponential backoff (default: false)
    }
  ): Promise<TaskStatusResponse> {
    const {
      maxDuration = 600,
      pollInterval = 60000,
      useExponentialBackoff = false,
    } = options || {}

    const startTime = Date.now()
    const maxEndTime = startTime + maxDuration * 1000
    let attempt = 0

    this.logger.info(
      {
        taskId,
        maxDuration,
        pollInterval,
      },
      'Starting task polling'
    )

    while (Date.now() < maxEndTime) {
      try {
        attempt++
        const statusResult = await this.checkTaskStatus(taskId)

        this.logger.debug(
          {
            taskId,
            status: statusResult.status,
            attempt,
            progress: statusResult.progress,
          },
          'Task status checked'
        )

        // Task completed successfully
        if (statusResult.status === 'SUCCESS') {
          const duration = Date.now() - startTime
          this.logger.info(
            {
              taskId,
              duration,
              attempts: attempt,
            },
            'Task completed successfully'
          )
          return statusResult
        }

        // Task failed
        if (statusResult.status === 'FAILED') {
          this.logger.error(
            {
              taskId,
              error: statusResult.error,
            },
            'Task failed'
          )
          return statusResult
        }

        // Task still processing - wait before next poll
        const delay = useExponentialBackoff
          ? Math.min(pollInterval * Math.pow(1.5, attempt - 1), 300000) // Max 5 min
          : pollInterval

        this.logger.debug(
          {
            taskId,
            status: statusResult.status,
            nextPollDelay: delay,
          },
          'Task still processing, waiting...'
        )

        await new Promise((resolve) => setTimeout(resolve, delay))
      } catch (error) {
        this.logger.error(
          {
            error,
            taskId,
            attempt,
          },
          'Error polling task status'
        )

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, pollInterval))
      }
    }

    // Timeout
    const duration = Date.now() - startTime
    this.logger.error(
      {
        taskId,
        duration,
        attempts: attempt,
      },
      'Task polling timeout'
    )

    return {
      status: 'FAILED',
      error: 'Task polling timeout',
    }
  }

  /**
   * Handle error and convert to standard response
   */
  protected handleError(error: any, context?: string): AdapterResponse {
    const genError = mapHttpErrorToGenerationError(error)

    this.logger.error(
      {
        error: genError.toJSON(),
        context,
      },
      'Adapter error occurred'
    )

    // Log to error monitor for critical errors
    if (genError.code === 'PROVIDER_ERROR' || genError.code === 'INTERNAL_ERROR') {
      errorMonitor.logError({
        level: 'ERROR',
        source: this.sourceInfo.adapterName,
        message: genError.message,
        stack: genError.stack,
        context: {
          context,
          code: genError.code,
          details: genError.details,
        },
      }).catch((err) => {
        // Don't let error monitoring fail the request
        this.logger.warn({ err }, 'Failed to log error to monitor')
      })
    }

    return {
      status: 'ERROR',
      message: genError.message,
      error: {
        code: genError.code,
        message: genError.message,
        details: genError.details,
        isRetryable: genError.isRetryable,
      },
    }
  }

  /**
   * Get validation schema for this adapter
   * Override in subclass to provide custom validation
   */
  protected getValidationSchema(): z.ZodSchema | null {
    return null
  }

  /**
   * Validate request using adapter-specific schema
   * Returns validated and normalized request (with defaults applied)
   */
  protected validateRequest(
    request: UnifiedGenerationRequest
  ): UnifiedGenerationRequest {
    const schema = this.getValidationSchema()

    if (!schema) {
      // No validation schema, use basic validation
      if (!request.prompt || request.prompt.trim() === '') {
        throw new InvalidRequestError('Prompt is required')
      }
      return request
    }

    try {
      // Validate and return parsed (with defaults) request
      const validated = schema.parse(request)
      this.logger.debug({ validated }, 'Request validated successfully')
      return validated as UnifiedGenerationRequest
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`)
        this.logger.error({ errors: error.errors }, 'Request validation failed')
        throw new InvalidParametersError(
          `Invalid request parameters: ${messages.join('; ')}`,
          { errors: error.errors }
        )
      }
      throw error
    }
  }

  /**
   * Abstract method that must be implemented by all adapters
   * Handles the actual API call to the provider
   */
  abstract dispatch(request: UnifiedGenerationRequest): Promise<AdapterResponse>

  /**
   * Utility method to get parameter with default value
   */
  protected getParameter<T>(
    request: UnifiedGenerationRequest,
    key: string,
    defaultValue: T
  ): T {
    const value = request.parameters?.[key]
    return value !== undefined ? (value as T) : defaultValue
  }

  /**
   * Get provider info
   */
  public getSourceInfo(): ProviderConfig {
    return this.sourceInfo
  }
}
