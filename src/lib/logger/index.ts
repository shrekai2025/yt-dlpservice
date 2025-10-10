/**
 * Unified Logging System
 *
 * Provides structured logging with pino for the entire application.
 * Replaces console.log with proper logging levels and context.
 */

import pino from 'pino'

/**
 * Get log level from environment or default to 'info'
 */
function getLogLevel(): pino.Level {
  const level = process.env.LOG_LEVEL?.toLowerCase() || 'info'
  const validLevels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal']

  if (validLevels.includes(level)) {
    return level as pino.Level
  }

  return 'info'
}

/**
 * Get log format from environment
 *
 * NOTE: pino-pretty is disabled in Next.js environments due to compatibility issues
 * with worker threads during build. Use plain JSON format instead.
 */
function shouldUsePrettyPrint(): boolean {
  // Always disabled - pino-pretty causes "/ROOT/node_modules/thread-stream" errors in Next.js
  return false
}

/**
 * Create pino transport configuration
 */
function getTransport(): pino.TransportSingleOptions | undefined {
  // Always return undefined - using plain JSON format
  return undefined
}

/**
 * Create the root logger instance
 */
export const logger = pino({
  level: getLogLevel(),
  transport: getTransport(),
  base: {
    env: process.env.NODE_ENV || 'development',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level(label) {
      return { level: label }
    },
  },
})

/**
 * Create a child logger with additional context
 *
 * @example
 * const adapterLogger = createLogger({ source: 'FluxAdapter' })
 * adapterLogger.info({ url }, 'Calling API')
 */
export function createLogger(context: Record<string, any>) {
  return logger.child(context)
}

/**
 * Log levels for reference
 */
export enum LogLevel {
  TRACE = 10,
  DEBUG = 20,
  INFO = 30,
  WARN = 40,
  ERROR = 50,
  FATAL = 60,
}

export default logger
