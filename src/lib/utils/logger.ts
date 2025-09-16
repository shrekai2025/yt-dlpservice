import * as fs from 'fs/promises'
import * as path from 'path'

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

export class Logger {
  private static logFilePath = './logs/app.log'

  private static formatMessage(level: LogLevel, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString()
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`
    const argsStr = args.length > 0 ? ' ' + args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ') : ''
    return `${prefix} ${message}${argsStr}`
  }

  private static async writeToFile(logMessage: string): Promise<void> {
    try {
      // 确保日志目录存在
      await fs.mkdir(path.dirname(this.logFilePath), { recursive: true })
      
      // 追加写入日志文件
      await fs.appendFile(this.logFilePath, logMessage + '\n')
    } catch (error) {
      // 文件写入失败时不影响程序运行，只在控制台输出错误
      console.error('[Logger] 写入日志文件失败:', error)
    }
  }

  static info(message: string, ...args: any[]): void {
    const logMessage = this.formatMessage('info', message, ...args)
    console.log(logMessage)
    this.writeToFile(logMessage).catch(() => {}) // 异步写入，不阻塞
  }

  static warn(message: string, ...args: any[]): void {
    const logMessage = this.formatMessage('warn', message, ...args)
    console.warn(logMessage)
    this.writeToFile(logMessage).catch(() => {})
  }

  static error(message: string, ...args: any[]): void {
    const logMessage = this.formatMessage('error', message, ...args)
    console.error(logMessage)
    this.writeToFile(logMessage).catch(() => {})
  }

  static debug(message: string, ...args: any[]): void {
    // 在生产环境也显示debug日志，方便调试豆包API问题
    const logMessage = this.formatMessage('debug', message, ...args)
    console.debug(logMessage)
    this.writeToFile(logMessage).catch(() => {})
  }
} 