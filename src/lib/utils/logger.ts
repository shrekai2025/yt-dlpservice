type LogLevel = 'info' | 'warn' | 'error' | 'debug'

export class Logger {
  private static formatMessage(level: LogLevel, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString()
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`
    return `${prefix} ${message}`
  }

  static info(message: string, ...args: any[]): void {
    console.log(this.formatMessage('info', message), ...args)
  }

  static warn(message: string, ...args: any[]): void {
    console.warn(this.formatMessage('warn', message), ...args)
  }

  static error(message: string, ...args: any[]): void {
    console.error(this.formatMessage('error', message), ...args)
  }

  static debug(message: string, ...args: any[]): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('debug', message), ...args)
    }
  }
} 