/**
 * Error Log Service
 *
 * 记录和管理AI生成过程中的错误日志
 */

import { db } from '~/server/db'
import type { ErrorLevel } from '@prisma/client'

export interface CreateErrorLogInput {
  level: ErrorLevel
  source: string
  message: string
  stack?: string
  context?: Record<string, unknown>
  requestId?: string
  taskId?: string
}

export interface ListErrorLogsFilter {
  level?: ErrorLevel
  source?: string
  resolved?: boolean
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

export class ErrorLogService {
  /**
   * 记录错误日志
   */
  async logError(input: CreateErrorLogInput) {
    try {
      const errorLog = await db.errorLog.create({
        data: {
          level: input.level,
          source: input.source,
          message: input.message,
          stack: input.stack,
          context: input.context ? JSON.stringify(input.context) : null,
          requestId: input.requestId,
          taskId: input.taskId,
        },
      })

      console.log(`[ErrorLog] ${input.level}: ${input.source} - ${input.message}`)

      return errorLog
    } catch (error) {
      console.error('[ErrorLogService] Failed to log error:', error)
      // 不抛出错误，避免影响主流程
      return null
    }
  }

  /**
   * 批量记录错误
   */
  async logErrors(inputs: CreateErrorLogInput[]) {
    try {
      const errorLogs = await db.errorLog.createMany({
        data: inputs.map((input) => ({
          level: input.level,
          source: input.source,
          message: input.message,
          stack: input.stack,
          context: input.context ? JSON.stringify(input.context) : null,
          requestId: input.requestId,
          taskId: input.taskId,
        })),
      })

      console.log(`[ErrorLog] Logged ${errorLogs.count} errors`)

      return errorLogs
    } catch (error) {
      console.error('[ErrorLogService] Failed to log errors:', error)
      return null
    }
  }

  /**
   * 获取错误日志列表
   */
  async listErrorLogs(filter: ListErrorLogsFilter = {}) {
    const where: {
      level?: ErrorLevel
      source?: string
      resolved?: boolean
      createdAt?: {
        gte?: Date
        lte?: Date
      }
    } = {}

    if (filter.level) {
      where.level = filter.level
    }

    if (filter.source) {
      where.source = filter.source
    }

    if (filter.resolved !== undefined) {
      where.resolved = filter.resolved
    }

    if (filter.startDate || filter.endDate) {
      where.createdAt = {}
      if (filter.startDate) {
        where.createdAt.gte = filter.startDate
      }
      if (filter.endDate) {
        where.createdAt.lte = filter.endDate
      }
    }

    const limit = filter.limit || 50
    const offset = filter.offset || 0

    const [errorLogs, total] = await Promise.all([
      db.errorLog.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      db.errorLog.count({ where }),
    ])

    return {
      errorLogs,
      total,
      limit,
      offset,
      hasMore: offset + errorLogs.length < total,
    }
  }

  /**
   * 获取错误日志详情
   */
  async getErrorLog(id: string) {
    const errorLog = await db.errorLog.findUnique({
      where: { id },
    })

    if (errorLog && errorLog.context) {
      return {
        ...errorLog,
        context: JSON.parse(errorLog.context),
      }
    }

    return errorLog
  }

  /**
   * 标记错误为已解决
   */
  async resolveError(id: string, resolvedBy: string) {
    const errorLog = await db.errorLog.update({
      where: { id },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy,
      },
    })

    return errorLog
  }

  /**
   * 批量标记错误为已解决
   */
  async resolveErrors(ids: string[], resolvedBy: string) {
    const result = await db.errorLog.updateMany({
      where: {
        id: {
          in: ids,
        },
      },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy,
      },
    })

    return result
  }

  /**
   * 获取错误统计
   */
  async getErrorStats(startDate?: Date, endDate?: Date) {
    const where: {
      createdAt?: {
        gte?: Date
        lte?: Date
      }
    } = {}

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = startDate
      }
      if (endDate) {
        where.createdAt.lte = endDate
      }
    }

    const [total, byLevel, bySource, unresolvedCount] = await Promise.all([
      db.errorLog.count({ where }),
      db.errorLog.groupBy({
        by: ['level'],
        where,
        _count: true,
      }),
      db.errorLog.groupBy({
        by: ['source'],
        where,
        _count: true,
        orderBy: {
          _count: {
            source: 'desc',
          },
        },
        take: 10,
      }),
      db.errorLog.count({
        where: {
          ...where,
          resolved: false,
        },
      }),
    ])

    return {
      total,
      unresolvedCount,
      byLevel: byLevel.reduce((acc, item) => {
        acc[item.level] = item._count
        return acc
      }, {} as Record<string, number>),
      topSources: bySource.map((item) => ({
        source: item.source,
        count: item._count,
      })),
    }
  }

  /**
   * 清理旧的错误日志（保留最近N天）
   */
  async cleanupOldLogs(daysToKeep: number = 30) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    const result = await db.errorLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
        resolved: true, // 只删除已解决的错误
      },
    })

    console.log(`[ErrorLogService] Cleaned up ${result.count} old error logs`)

    return result
  }

  /**
   * 便捷方法：记录警告
   */
  async logWarning(source: string, message: string, context?: Record<string, unknown>) {
    return this.logError({
      level: 'WARN',
      source,
      message,
      context,
    })
  }

  /**
   * 便捷方法：记录错误
   */
  async logCriticalError(source: string, message: string, context?: Record<string, unknown>) {
    return this.logError({
      level: 'ERROR',
      source,
      message,
      context,
    })
  }

  /**
   * 便捷方法：记录严重错误
   */
  async logCritical(source: string, message: string, context?: Record<string, unknown>) {
    return this.logError({
      level: 'CRITICAL',
      source,
      message,
      context,
    })
  }
}

export const errorLogService = new ErrorLogService()

