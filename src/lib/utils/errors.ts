/**
 * 平台相关错误基类
 */
export class PlatformError extends Error {
  constructor(message: string, public code: string) {
    super(message)
    this.name = 'PlatformError'
  }
}

/**
 * 平台不支持错误
 */
export class PlatformNotSupportedError extends PlatformError {
  constructor(url: string) {
    super(`不支持的平台或URL: ${url}`, 'PLATFORM_NOT_SUPPORTED')
    this.name = 'PlatformNotSupportedError'
  }
}

/**
 * 下载失败错误
 */
export class DownloadError extends PlatformError {
  constructor(message: string, public originalError?: Error) {
    super(message, 'DOWNLOAD_FAILED')
    this.name = 'DownloadError'
  }
}

/**
 * 内容信息获取失败错误
 */
export class ContentInfoError extends PlatformError {
  constructor(message: string, public originalError?: Error) {
    super(message, 'CONTENT_INFO_FAILED')
    this.name = 'ContentInfoError'
  }
}

/**
 * 认证错误
 */
export class AuthenticationError extends PlatformError {
  constructor(platform: string) {
    super(`平台 ${platform} 需要认证`, 'AUTHENTICATION_REQUIRED')
    this.name = 'AuthenticationError'
  }
}

/**
 * 配置错误
 */
export class ConfigurationError extends PlatformError {
  constructor(message: string) {
    super(message, 'CONFIGURATION_ERROR')
    this.name = 'ConfigurationError'
  }
} 