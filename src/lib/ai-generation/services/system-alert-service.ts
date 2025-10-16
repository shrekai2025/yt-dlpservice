/**
 * System Alert Service
 *
 * 管理系统告警，用于关键错误和异常情况的通知
 */

import { db } from '~/server/db'
import type { AlertSeverity } from '@prisma/client'

export interface CreateAlertInput {
  type: string
  severity: AlertSeverity
  message: string
  details?: Record<string, unknown>
  channel?: string
}

export interface ListAlertsFilter {
  severity?: AlertSeverity
  type?: string
  acknowledged?: boolean
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

export class SystemAlertService {
  /**
   * 创建系统告警
   */
  async createAlert(input: CreateAlertInput) {
    try {
      const alert = await db.systemAlert.create({
        data: {
          type: input.type,
          severity: input.severity,
          message: input.message,
          details: input.details ? JSON.stringify(input.details) : null,
          channel: input.channel,
        },
      })

      console.log(`[SystemAlert] ${input.severity}: ${input.type} - ${input.message}`)

      // 根据严重程度决定是否立即发送通知
      if (input.severity === 'CRITICAL' || input.severity === 'HIGH') {
        // TODO: 集成通知渠道（Email, Webhook, Slack等）
        void this.sendAlert(alert.id)
      }

      return alert
    } catch (error) {
      console.error('[SystemAlertService] Failed to create alert:', error)
      return null
    }
  }

  /**
   * 获取告警列表
   */
  async listAlerts(filter: ListAlertsFilter = {}) {
    const where: {
      severity?: AlertSeverity
      type?: string
      acknowledged?: boolean
      createdAt?: {
        gte?: Date
        lte?: Date
      }
    } = {}

    if (filter.severity) {
      where.severity = filter.severity
    }

    if (filter.type) {
      where.type = filter.type
    }

    if (filter.acknowledged !== undefined) {
      where.acknowledged = filter.acknowledged
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

    const [alerts, total] = await Promise.all([
      db.systemAlert.findMany({
        where,
        orderBy: [
          { acknowledged: 'asc' }, // 未确认的优先
          { createdAt: 'desc' },
        ],
        take: limit,
        skip: offset,
      }),
      db.systemAlert.count({ where }),
    ])

    return {
      alerts,
      total,
      limit,
      offset,
      hasMore: offset + alerts.length < total,
    }
  }

  /**
   * 获取告警详情
   */
  async getAlert(id: string) {
    const alert = await db.systemAlert.findUnique({
      where: { id },
    })

    if (alert && alert.details) {
      return {
        ...alert,
        details: JSON.parse(alert.details),
      }
    }

    return alert
  }

  /**
   * 确认告警
   */
  async acknowledgeAlert(id: string, acknowledgedBy: string) {
    const alert = await db.systemAlert.update({
      where: { id },
      data: {
        acknowledged: true,
        acknowledgedAt: new Date(),
        acknowledgedBy,
      },
    })

    return alert
  }

  /**
   * 批量确认告警
   */
  async acknowledgeAlerts(ids: string[], acknowledgedBy: string) {
    const result = await db.systemAlert.updateMany({
      where: {
        id: {
          in: ids,
        },
      },
      data: {
        acknowledged: true,
        acknowledgedAt: new Date(),
        acknowledgedBy,
      },
    })

    return result
  }

  /**
   * 发送告警通知（占位符，待实现具体通知渠道）
   */
  private async sendAlert(alertId: string) {
    try {
      const alert = await this.getAlert(alertId)
      if (!alert) return

      // TODO: 实现具体的通知逻辑
      // 1. Email通知
      // 2. Webhook通知
      // 3. Slack/Discord通知
      // 4. 短信通知（高优先级）

      // 更新发送时间和渠道
      await db.systemAlert.update({
        where: { id: alertId },
        data: {
          sentAt: new Date(),
          channel: 'console', // 暂时只记录到控制台
        },
      })

      console.log(`[SystemAlert] Alert sent: ${alert.type} - ${alert.message}`)
    } catch (error) {
      console.error('[SystemAlertService] Failed to send alert:', error)
    }
  }

  /**
   * 获取告警统计
   */
  async getAlertStats(startDate?: Date, endDate?: Date) {
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

    const [total, bySeverity, byType, unacknowledgedCount] = await Promise.all([
      db.systemAlert.count({ where }),
      db.systemAlert.groupBy({
        by: ['severity'],
        where,
        _count: true,
      }),
      db.systemAlert.groupBy({
        by: ['type'],
        where,
        _count: true,
        orderBy: {
          _count: {
            type: 'desc',
          },
        },
        take: 10,
      }),
      db.systemAlert.count({
        where: {
          ...where,
          acknowledged: false,
        },
      }),
    ])

    return {
      total,
      unacknowledgedCount,
      bySeverity: bySeverity.reduce((acc, item) => {
        acc[item.severity] = item._count
        return acc
      }, {} as Record<string, number>),
      topTypes: byType.map((item) => ({
        type: item.type,
        count: item._count,
      })),
    }
  }

  /**
   * 清理旧的告警（保留最近N天）
   */
  async cleanupOldAlerts(daysToKeep: number = 90) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    const result = await db.systemAlert.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
        acknowledged: true,
      },
    })

    console.log(`[SystemAlertService] Cleaned up ${result.count} old alerts`)

    return result
  }

  /**
   * 便捷方法：创建错误率过高告警
   */
  async alertHighErrorRate(errorRate: number, threshold: number, details?: Record<string, unknown>) {
    return this.createAlert({
      type: 'ERROR_RATE_HIGH',
      severity: errorRate > threshold * 2 ? 'CRITICAL' : 'HIGH',
      message: `错误率过高: ${errorRate.toFixed(2)}% (阈值: ${threshold}%)`,
      details: {
        errorRate,
        threshold,
        ...details,
      },
    })
  }

  /**
   * 便捷方法：创建任务超时告警
   */
  async alertTaskTimeout(taskId: string, duration: number, details?: Record<string, unknown>) {
    return this.createAlert({
      type: 'TASK_TIMEOUT',
      severity: 'MEDIUM',
      message: `任务超时: ${taskId} (耗时: ${duration}ms)`,
      details: {
        taskId,
        duration,
        ...details,
      },
    })
  }

  /**
   * 便捷方法：创建API不可用告警
   */
  async alertApiDown(apiName: string, error: string, details?: Record<string, unknown>) {
    return this.createAlert({
      type: 'API_DOWN',
      severity: 'HIGH',
      message: `API不可用: ${apiName} - ${error}`,
      details: {
        apiName,
        error,
        ...details,
      },
    })
  }

  /**
   * 便捷方法：创建配额耗尽告警
   */
  async alertQuotaExhausted(provider: string, details?: Record<string, unknown>) {
    return this.createAlert({
      type: 'QUOTA_EXHAUSTED',
      severity: 'CRITICAL',
      message: `供应商配额耗尽: ${provider}`,
      details: {
        provider,
        ...details,
      },
    })
  }
}

export const systemAlertService = new SystemAlertService()

