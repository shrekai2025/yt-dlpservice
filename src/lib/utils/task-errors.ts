/**
 * 任务限制相关的错误类定义
 */

export class TaskLimitError extends Error {
  public readonly code: string
  public readonly isRetryable: boolean

  constructor(code: string, message: string, isRetryable: boolean = false) {
    super(message)
    this.name = 'TaskLimitError'
    this.code = code
    this.isRetryable = isRetryable
  }
}

/**
 * 文件大小超限错误
 */
export class FileSizeExceededError extends TaskLimitError {
  constructor(actualSizeMB?: number, limitMB?: number) {
    const message = actualSizeMB && limitMB 
      ? `文件大小 ${actualSizeMB}MB 超过限制 ${limitMB}MB` 
      : '文件大小超过限制'
    
    super('FILE_TOO_LARGE', '文件超大', false)
  }
}

/**
 * 内容时长超限错误
 */
export class DurationExceededError extends TaskLimitError {
  constructor(actualHours?: number, limitHours?: number) {
    const message = actualHours && limitHours 
      ? `内容时长 ${actualHours}小时 超过限制 ${limitHours}小时` 
      : '内容时长超过限制'
    
    super('CONTENT_TOO_LONG', '内容超长', false)
  }
}

/**
 * 错误码常量
 */
export const ERROR_CODES = {
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  CONTENT_TOO_LONG: 'CONTENT_TOO_LONG'
} as const

/**
 * 检查是否为任务限制错误
 */
export function isTaskLimitError(error: any): error is TaskLimitError {
  return error instanceof TaskLimitError
}

/**
 * 获取错误的用户友好消息
 */
export function getErrorMessage(error: TaskLimitError): string {
  switch (error.code) {
    case ERROR_CODES.FILE_TOO_LARGE:
      return '文件超大'
    case ERROR_CODES.CONTENT_TOO_LONG:
      return '内容超长'
    default:
      return '任务限制错误'
  }
}
