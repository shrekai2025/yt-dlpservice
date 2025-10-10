/**
 * Generation Error Classes
 *
 * Standardized error types for AI generation services.
 * Provides error classification, retry hints, and structured error responses.
 */

export enum ErrorCode {
  // Client errors (4xx)
  INVALID_REQUEST = 'INVALID_REQUEST',
  INVALID_PARAMETERS = 'INVALID_PARAMETERS',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  RATE_LIMITED = 'RATE_LIMITED',

  // Provider errors (5xx)
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  PROVIDER_UNAVAILABLE = 'PROVIDER_UNAVAILABLE',
  PROVIDER_TIMEOUT = 'PROVIDER_TIMEOUT',

  // System errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  S3_UPLOAD_FAILED = 'S3_UPLOAD_FAILED',
  TASK_TIMEOUT = 'TASK_TIMEOUT',

  // Task errors
  TASK_FAILED = 'TASK_FAILED',
  TASK_CANCELLED = 'TASK_CANCELLED',
}

/**
 * Base error class for generation errors
 */
export class GenerationError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: any,
    public isRetryable: boolean = false
  ) {
    super(message)
    this.name = 'GenerationError'
    Object.setPrototypeOf(this, GenerationError.prototype)
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      isRetryable: this.isRetryable,
    }
  }
}

/**
 * Invalid request error (4xx)
 */
export class InvalidRequestError extends GenerationError {
  constructor(message: string, details?: any) {
    super(ErrorCode.INVALID_REQUEST, message, details, false)
    this.name = 'InvalidRequestError'
    Object.setPrototypeOf(this, InvalidRequestError.prototype)
  }
}

/**
 * Invalid parameters error
 */
export class InvalidParametersError extends GenerationError {
  constructor(message: string, details?: any) {
    super(ErrorCode.INVALID_PARAMETERS, message, details, false)
    this.name = 'InvalidParametersError'
    Object.setPrototypeOf(this, InvalidParametersError.prototype)
  }
}

/**
 * Authentication failed error
 */
export class AuthenticationError extends GenerationError {
  constructor(message: string, details?: any) {
    super(ErrorCode.AUTHENTICATION_FAILED, message, details, false)
    this.name = 'AuthenticationError'
    Object.setPrototypeOf(this, AuthenticationError.prototype)
  }
}

/**
 * Provider error (5xx)
 */
export class ProviderError extends GenerationError {
  constructor(message: string, details?: any, isRetryable: boolean = true) {
    super(ErrorCode.PROVIDER_ERROR, message, details, isRetryable)
    this.name = 'ProviderError'
    Object.setPrototypeOf(this, ProviderError.prototype)
  }
}

/**
 * Provider unavailable error
 */
export class ProviderUnavailableError extends GenerationError {
  constructor(message: string, details?: any) {
    super(ErrorCode.PROVIDER_UNAVAILABLE, message, details, true)
    this.name = 'ProviderUnavailableError'
    Object.setPrototypeOf(this, ProviderUnavailableError.prototype)
  }
}

/**
 * Quota exceeded error
 */
export class QuotaExceededError extends GenerationError {
  constructor(message: string, details?: any) {
    super(ErrorCode.QUOTA_EXCEEDED, message, details, false)
    this.name = 'QuotaExceededError'
    Object.setPrototypeOf(this, QuotaExceededError.prototype)
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends GenerationError {
  constructor(message: string, details?: any) {
    super(ErrorCode.RATE_LIMITED, message, details, true)
    this.name = 'RateLimitError'
    Object.setPrototypeOf(this, RateLimitError.prototype)
  }
}

/**
 * S3 upload error
 */
export class S3UploadError extends GenerationError {
  constructor(message: string, details?: any) {
    super(ErrorCode.S3_UPLOAD_FAILED, message, details, true)
    this.name = 'S3UploadError'
    Object.setPrototypeOf(this, S3UploadError.prototype)
  }
}

/**
 * Task timeout error
 */
export class TaskTimeoutError extends GenerationError {
  constructor(message: string, details?: any) {
    super(ErrorCode.TASK_TIMEOUT, message, details, false)
    this.name = 'TaskTimeoutError'
    Object.setPrototypeOf(this, TaskTimeoutError.prototype)
  }
}

/**
 * Task failed error
 */
export class TaskFailedError extends GenerationError {
  constructor(message: string, details?: any) {
    super(ErrorCode.TASK_FAILED, message, details, false)
    this.name = 'TaskFailedError'
    Object.setPrototypeOf(this, TaskFailedError.prototype)
  }
}

/**
 * Convert HTTP error to GenerationError
 */
export function mapHttpErrorToGenerationError(error: any): GenerationError {
  // Already a GenerationError
  if (error instanceof GenerationError) {
    return error
  }

  const status = error.response?.status
  const data = error.response?.data
  const message = error.message || 'Unknown error'

  // Map HTTP status codes to error types
  if (status === 401 || status === 403) {
    return new AuthenticationError(
      data?.message || 'Authentication failed',
      { status, data }
    )
  }

  if (status === 429) {
    const retryAfter = error.response?.headers?.['retry-after']
    return new RateLimitError(
      data?.message || 'Rate limit exceeded',
      { status, data, retryAfter }
    )
  }

  if (status === 402 || data?.message?.toLowerCase().includes('credit')) {
    return new QuotaExceededError(
      data?.message || 'Quota or credits exceeded',
      { status, data }
    )
  }

  if (status === 400 || status === 422) {
    return new InvalidRequestError(
      data?.message || message || 'Invalid request',
      { status, data }
    )
  }

  if (status >= 500 && status < 600) {
    return new ProviderError(
      data?.message || 'Provider server error',
      { status, data },
      true
    )
  }

  if (status === 503 || status === 504) {
    return new ProviderUnavailableError(
      data?.message || 'Provider temporarily unavailable',
      { status, data }
    )
  }

  // Network errors
  if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
    return new ProviderError(
      'Request timeout',
      { code: error.code },
      true
    )
  }

  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    return new ProviderUnavailableError(
      `Network error: ${error.code}`,
      { code: error.code }
    )
  }

  if (error.code) {
    return new ProviderError(
      `Network error: ${error.code}`,
      { code: error.code },
      true
    )
  }

  // Unknown error
  return new GenerationError(
    ErrorCode.INTERNAL_ERROR,
    message,
    { originalError: error },
    false
  )
}
