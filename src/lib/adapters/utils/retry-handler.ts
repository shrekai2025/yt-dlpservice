/**
 * Retry Handler Utility
 *
 * Handles retrying failed requests with exponential backoff
 */

interface RetryOptions {
  maxRetries?: number
  initialDelayMs?: number
  maxDelayMs?: number
  backoffMultiplier?: number
  retryableStatusCodes?: number[]
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Calculate delay with exponential backoff
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  multiplier: number
): number {
  const delay = initialDelay * Math.pow(multiplier, attempt)
  return Math.min(delay, maxDelay)
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: unknown, retryableStatusCodes: number[]): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  const err = error as { response?: { status?: number }; code?: string }

  // Retry on network errors
  if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
    return true
  }

  // Retry on specific status codes
  if (err.response?.status && retryableStatusCodes.includes(err.response.status)) {
    return true
  }

  return false
}

/**
 * Execute a function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: unknown

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Don't retry if max attempts reached
      if (attempt === opts.maxRetries) {
        break
      }

      // Don't retry if error is not retryable
      if (!isRetryableError(error, opts.retryableStatusCodes)) {
        throw error
      }

      // Calculate delay and wait
      const delay = calculateDelay(
        attempt,
        opts.initialDelayMs,
        opts.maxDelayMs,
        opts.backoffMultiplier
      )

      console.log(
        `Retry attempt ${attempt + 1}/${opts.maxRetries} after ${delay}ms`,
        error
      )

      await sleep(delay)
    }
  }

  throw lastError
}
