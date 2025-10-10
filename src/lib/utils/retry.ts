/**
 * Retry Utility with Exponential Backoff
 *
 * Provides retry logic for transient failures with exponential backoff and jitter.
 */

import { logger } from '~/lib/logger'
import type { GenerationError } from '~/lib/errors/generation-errors'

export interface RetryConfig {
  maxAttempts: number           // Maximum retry attempts
  initialDelay: number          // Initial delay in milliseconds
  maxDelay: number              // Maximum delay in milliseconds
  backoffMultiplier: number     // Backoff multiplier for exponential growth
  jitter: boolean               // Add random jitter to avoid thundering herd
  retryableErrors?: string[]    // List of retryable error codes
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true,
  retryableErrors: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'EAI_AGAIN',
    'ECONNREFUSED',
  ],
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any, config: RetryConfig): boolean {
  if (!error) return false

  // Check if error is marked as retryable (GenerationError)
  if ('isRetryable' in error && typeof error.isRetryable === 'boolean') {
    return error.isRetryable
  }

  // Network error codes
  if (error.code && config.retryableErrors?.includes(error.code)) {
    return true
  }

  // HTTP status codes
  if (error.response?.status) {
    const status = error.response.status
    // Retry on: 408 (Timeout), 429 (Rate Limit), 500, 502, 503, 504
    if ([408, 429, 500, 502, 503, 504].includes(status)) {
      return true
    }
  }

  return false
}

/**
 * Calculate retry delay with exponential backoff and optional jitter
 */
export function getRetryDelay(
  attempt: number,
  config: RetryConfig
): number {
  // Calculate exponential backoff
  let delay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1)

  // Cap at max delay
  delay = Math.min(delay, config.maxDelay)

  // Add jitter if enabled (±25%)
  if (config.jitter) {
    const jitterAmount = delay * 0.25
    delay = delay + (Math.random() * jitterAmount * 2 - jitterAmount)
  }

  return Math.floor(delay)
}

/**
 * Retry a function with exponential backoff
 *
 * @param fn - Async function to retry
 * @param config - Retry configuration (merged with defaults)
 * @param context - Additional context for logging
 * @returns Promise with function result
 * @throws Last error if all retries fail
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  context?: {
    operationName?: string
    logger?: any
  }
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
  const log = context?.logger || logger
  const operationName = context?.operationName || 'operation'

  let lastError: any

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      log.debug(
        {
          attempt,
          maxAttempts: finalConfig.maxAttempts,
          operationName,
        },
        'Attempting operation'
      )

      const result = await fn()

      if (attempt > 1) {
        log.info(
          { attempt, operationName },
          'Operation succeeded after retry'
        )
      }

      return result
    } catch (error) {
      lastError = error

      const isRetryable = isRetryableError(error, finalConfig)
      const isLastAttempt = attempt === finalConfig.maxAttempts

      log.warn(
        {
          error: error instanceof Error ? {
            message: error.message,
            code: (error as any).code,
            status: (error as any).response?.status,
          } : error,
          attempt,
          maxAttempts: finalConfig.maxAttempts,
          isRetryable,
          operationName,
        },
        'Operation failed'
      )

      // Don't retry if not retryable or last attempt
      if (!isRetryable || isLastAttempt) {
        log.error(
          {
            error: error instanceof Error ? error.message : String(error),
            attempts: attempt,
            operationName,
          },
          isLastAttempt ? 'Operation failed after all retries' : 'Operation failed with non-retryable error'
        )
        throw error
      }

      // Calculate delay and wait
      const delay = getRetryDelay(attempt, finalConfig)
      log.info(
        { delay, nextAttempt: attempt + 1, operationName },
        'Retrying after delay'
      )
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  // Should never reach here, but just in case
  throw lastError
}

/**
 * Retry with custom error filter
 *
 * @param fn - Async function to retry
 * @param shouldRetry - Custom function to determine if error is retryable
 * @param config - Retry configuration
 * @param context - Additional context
 */
export async function retryWithFilter<T>(
  fn: () => Promise<T>,
  shouldRetry: (error: any, attempt: number) => boolean,
  config: Partial<RetryConfig> = {},
  context?: {
    operationName?: string
    logger?: any
  }
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
  const log = context?.logger || logger
  const operationName = context?.operationName || 'operation'

  let lastError: any

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      const result = await fn()
      if (attempt > 1) {
        log.info({ attempt, operationName }, 'Operation succeeded after retry')
      }
      return result
    } catch (error) {
      lastError = error
      const isLastAttempt = attempt === finalConfig.maxAttempts
      const canRetry = shouldRetry(error, attempt)

      if (!canRetry || isLastAttempt) {
        throw error
      }

      const delay = getRetryDelay(attempt, finalConfig)
      log.info({ delay, nextAttempt: attempt + 1, operationName }, 'Retrying after delay')
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError
}
