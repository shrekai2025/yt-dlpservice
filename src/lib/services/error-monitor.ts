/**
 * Error Monitor Service
 *
 * Centralized error logging and monitoring
 */

import { db } from '~/server/db'
import { logger } from '~/lib/logger'
import type { ErrorLevel } from '@prisma/client'

export interface ErrorInfo {
  level: ErrorLevel
  source: string
  message: string
  stack?: string
  context?: Record<string, any>
  requestId?: string
  taskId?: string
}

export interface ErrorStats {
  totalErrors: number
  errorsByLevel: Record<ErrorLevel, number>
  errorsBySource: Record<string, number>
  recentErrors: Array<{
    id: string
    level: ErrorLevel
    source: string
    message: string
    createdAt: Date
  }>
}

export class ErrorMonitor {
  /**
   * Log an error to database
   */
  async logError(errorInfo: ErrorInfo): Promise<void> {
    try {
      await db.errorLog.create({
        data: {
          level: errorInfo.level,
          source: errorInfo.source,
          message: errorInfo.message,
          stack: errorInfo.stack,
          context: errorInfo.context ? JSON.stringify(errorInfo.context) : null,
          requestId: errorInfo.requestId,
          taskId: errorInfo.taskId,
        },
      })

      logger.info(
        {
          level: errorInfo.level,
          source: errorInfo.source,
          message: errorInfo.message,
        },
        'Error logged to database'
      )

      // Check if we should create an alert
      if (errorInfo.level === 'CRITICAL') {
        await this.checkAlertConditions(errorInfo.source)
      }
    } catch (error) {
      // Don't throw - logging errors shouldn't break the application
      logger.error({ error, errorInfo }, 'Failed to log error to database')
    }
  }

  /**
   * Get error statistics for a time range
   */
  async getErrorStats(
    startTime: Date,
    endTime: Date = new Date()
  ): Promise<ErrorStats> {
    try {
      const errors = await db.errorLog.findMany({
        where: {
          createdAt: {
            gte: startTime,
            lte: endTime,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      const errorsByLevel: Record<ErrorLevel, number> = {
        WARN: 0,
        ERROR: 0,
        CRITICAL: 0,
      }

      const errorsBySource: Record<string, number> = {}

      for (const error of errors) {
        errorsByLevel[error.level]++

        if (!errorsBySource[error.source]) {
          errorsBySource[error.source] = 0
        }
        errorsBySource[error.source] = errorsBySource[error.source]! + 1
      }

      const recentErrors = errors.slice(0, 10).map((error) => ({
        id: error.id,
        level: error.level,
        source: error.source,
        message: error.message,
        createdAt: error.createdAt,
      }))

      return {
        totalErrors: errors.length,
        errorsByLevel,
        errorsBySource,
        recentErrors,
      }
    } catch (error) {
      logger.error({ error }, 'Failed to get error stats')
      throw error
    }
  }

  /**
   * Check if alert conditions are met
   */
  async checkAlertConditions(source?: string): Promise<void> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

      // Get error count for the last hour
      const errorCount = await db.errorLog.count({
        where: {
          createdAt: { gte: oneHourAgo },
          source: source || undefined,
        },
      })

      // Get total requests/tasks for context
      const totalTasks = await db.task.count({
        where: {
          createdAt: { gte: oneHourAgo },
        },
      })

      // Calculate error rate
      const errorRate = totalTasks > 0 ? (errorCount / totalTasks) * 100 : 0

      // Alert if error rate > 50%
      if (errorRate > 50 && totalTasks > 5) {
        await this.createAlert({
          type: 'ERROR_RATE_HIGH',
          severity: 'HIGH',
          message: `High error rate detected: ${errorRate.toFixed(1)}% (${errorCount}/${totalTasks})`,
          details: {
            source,
            errorCount,
            totalTasks,
            errorRate,
            timeRange: '1 hour',
          },
        })
      }

      // Check for critical errors
      const criticalCount = await db.errorLog.count({
        where: {
          level: 'CRITICAL',
          createdAt: { gte: oneHourAgo },
        },
      })

      if (criticalCount > 0) {
        await this.createAlert({
          type: 'CRITICAL_ERRORS',
          severity: 'CRITICAL',
          message: `${criticalCount} critical error(s) in the last hour`,
          details: {
            source,
            criticalCount,
            timeRange: '1 hour',
          },
        })
      }
    } catch (error) {
      logger.error({ error }, 'Failed to check alert conditions')
    }
  }

  /**
   * Create a system alert
   */
  private async createAlert(alert: {
    type: string
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    message: string
    details?: Record<string, any>
  }): Promise<void> {
    try {
      // Check if similar alert already exists recently
      const recentAlert = await db.systemAlert.findFirst({
        where: {
          type: alert.type,
          acknowledged: false,
          createdAt: {
            gte: new Date(Date.now() - 15 * 60 * 1000), // Last 15 minutes
          },
        },
      })

      if (recentAlert) {
        logger.debug({ alert }, 'Similar alert already exists, skipping')
        return
      }

      await db.systemAlert.create({
        data: {
          type: alert.type,
          severity: alert.severity,
          message: alert.message,
          details: alert.details ? JSON.stringify(alert.details) : null,
        },
      })

      logger.warn(
        {
          type: alert.type,
          severity: alert.severity,
          message: alert.message,
        },
        'System alert created'
      )

      // TODO: Send alert to configured channels (email, webhook, slack)
    } catch (error) {
      logger.error({ error, alert }, 'Failed to create alert')
    }
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    try {
      await db.systemAlert.update({
        where: { id: alertId },
        data: {
          acknowledged: true,
          acknowledgedAt: new Date(),
          acknowledgedBy: userId,
        },
      })

      logger.info({ alertId, userId }, 'Alert acknowledged')
    } catch (error) {
      logger.error({ error, alertId }, 'Failed to acknowledge alert')
      throw error
    }
  }

  /**
   * Get active (unacknowledged) alerts
   */
  async getActiveAlerts(): Promise<any[]> {
    try {
      return await db.systemAlert.findMany({
        where: {
          acknowledged: false,
        },
        orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
      })
    } catch (error) {
      logger.error({ error }, 'Failed to get active alerts')
      throw error
    }
  }
}

// Singleton instance
export const errorMonitor = new ErrorMonitor()
