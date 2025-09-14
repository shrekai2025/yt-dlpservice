import { db } from '~/server/db'
import { Logger } from './logger'

/**
 * 错误日志条目接口
 */
export interface ErrorLogEntry {
  timestamp: string
  message: string
}

/**
 * 错误日志管理器
 */
export class ErrorLogger {
  /**
   * 为任务添加错误日志
   */
  static async addErrorLog(taskId: string, errorMessage: string): Promise<void> {
    try {
      // 获取当前任务
      const task = await db.task.findUnique({
        where: { id: taskId },
        select: { errorMessage: true }
      })

      if (!task) {
        Logger.warn(`添加错误日志失败：任务 ${taskId} 不存在`)
        return
      }

      // 解析现有错误日志
      let errorLogs: ErrorLogEntry[] = []
      if (task.errorMessage) {
        try {
          const parsed = JSON.parse(task.errorMessage)
          // 兼容旧格式（字符串）和新格式（数组）
          if (Array.isArray(parsed)) {
            errorLogs = parsed
          } else if (typeof parsed === 'string') {
            // 旧格式：单个错误信息字符串
            errorLogs = [{
              timestamp: new Date().toISOString(),
              message: parsed
            }]
          }
        } catch (e) {
          // 如果解析失败，说明是旧的字符串格式
          errorLogs = [{
            timestamp: new Date().toISOString(),
            message: task.errorMessage
          }]
        }
      }

      // 添加新的错误日志
      const newErrorEntry: ErrorLogEntry = {
        timestamp: new Date().toISOString(),
        message: this.formatErrorMessage(errorMessage)
      }
      
      errorLogs.push(newErrorEntry)

      // 限制错误日志数量（最多保留20条）
      if (errorLogs.length > 20) {
        errorLogs = errorLogs.slice(-20)
      }

      // 更新数据库
      await db.task.update({
        where: { id: taskId },
        data: {
          errorMessage: JSON.stringify(errorLogs)
        }
      })

      Logger.info(`📝 任务 ${taskId} 添加错误日志: ${newErrorEntry.message}`)

    } catch (error) {
      Logger.error(`添加错误日志失败: ${error}`)
    }
  }

  /**
   * 获取任务的错误日志
   */
  static parseErrorLogs(errorMessage: string | null): ErrorLogEntry[] {
    if (!errorMessage) {
      return []
    }

    try {
      const parsed = JSON.parse(errorMessage)
      
      // 新格式：数组
      if (Array.isArray(parsed)) {
        return parsed.map(entry => ({
          timestamp: entry.timestamp || new Date().toISOString(),
          message: entry.message || '未知错误'
        }))
      }
      
      // 旧格式：字符串
      if (typeof parsed === 'string') {
        return [{
          timestamp: new Date().toISOString(),
          message: parsed
        }]
      }

      return []
    } catch (e) {
      // 解析失败，说明是旧的字符串格式
      return [{
        timestamp: new Date().toISOString(),
        message: errorMessage
      }]
    }
  }

  /**
   * 获取任务的最新错误信息（用于显示）
   */
  static getLatestError(errorMessage: string | null): string | null {
    const logs = this.parseErrorLogs(errorMessage)
    if (logs.length === 0) {
      return null
    }

    const latest = logs[logs.length - 1]
    if (!latest) return null
    const time = new Date(latest.timestamp).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
    
    return `${time} ${latest.message}`
  }

  /**
   * 格式化错误信息（保持简短但包含关键信息）
   */
  private static formatErrorMessage(error: string): string {
    // 移除过长的堆栈信息
    let message = error.replace(/\n\s*at\s+.*/g, '')
    
    // 限制长度，保留关键信息
    if (message.length > 100) {
      message = message.substring(0, 97) + '...'
    }
    
    return message.trim()
  }

  /**
   * 获取错误日志统计信息
   */
  static getErrorSummary(errorMessage: string | null): {
    totalErrors: number
    latestError: string | null
    hasErrors: boolean
  } {
    const logs = this.parseErrorLogs(errorMessage)
    
    return {
      totalErrors: logs.length,
      latestError: logs.length > 0 ? this.getLatestError(errorMessage) : null,
      hasErrors: logs.length > 0
    }
  }
}
