/**
 * Metrics Collector Service
 *
 * Collects system metrics for monitoring
 */

import { db } from '~/server/db'
import { logger } from '~/lib/logger'

export interface SystemMetrics {
  // Request metrics
  totalRequests: number
  activeRequests: number

  // Task metrics
  totalTasks: number
  activeTasks: number
  completedTasks: number
  failedTasks: number
  taskSuccessRate: number

  // Generation metrics (if applicable)
  totalGenerationRequests?: number
  successfulGenerations?: number
  failedGenerations?: number
  generationSuccessRate?: number

  // System resources
  memoryUsage: NodeJS.MemoryUsage
  uptime: number

  // Time range
  timeRange: {
    start: string
    end: string
  }
}

export class MetricsCollector {
  private startTime: number

  constructor() {
    this.startTime = Date.now()
  }

  /**
   * Collect system metrics
   */
  async collectMetrics(timeRangeMinutes: number = 60): Promise<SystemMetrics> {
    const now = new Date()
    const startTime = new Date(now.getTime() - timeRangeMinutes * 60 * 1000)

    try {
      // Task metrics
      const [totalTasks, activeTasks, completedTasks, failedTasks] = await Promise.all([
        db.task.count(),
        db.task.count({
          where: {
            status: {
              in: ['PENDING', 'EXTRACTING', 'TRANSCRIBING'],
            },
          },
        }),
        db.task.count({
          where: {
            status: 'COMPLETED',
            updatedAt: { gte: startTime },
          },
        }),
        db.task.count({
          where: {
            status: 'FAILED',
            updatedAt: { gte: startTime },
          },
        }),
      ])

      const taskSuccessRate =
        completedTasks + failedTasks > 0
          ? (completedTasks / (completedTasks + failedTasks)) * 100
          : 0

      // Generation metrics (if GenerationRequest table exists)
      let generationMetrics = {}
      try {
        const [totalGen, successGen, failedGen] = await Promise.all([
          db.generationRequest.count({ where: { deletedAt: null } }),
          db.generationRequest.count({
            where: {
              status: 'SUCCESS',
              updatedAt: { gte: startTime },
              deletedAt: null,
            },
          }),
          db.generationRequest.count({
            where: {
              status: 'FAILED',
              updatedAt: { gte: startTime },
              deletedAt: null,
            },
          }),
        ])

        const generationSuccessRate =
          successGen + failedGen > 0 ? (successGen / (successGen + failedGen)) * 100 : 0

        generationMetrics = {
          totalGenerationRequests: totalGen,
          successfulGenerations: successGen,
          failedGenerations: failedGen,
          generationSuccessRate,
        }
      } catch (error) {
        // GenerationRequest table might not exist, that's ok
        logger.debug('Generation metrics not available')
      }

      return {
        totalRequests: 0, // Would need request tracking middleware
        activeRequests: 0, // Would need request tracking middleware

        totalTasks,
        activeTasks,
        completedTasks,
        failedTasks,
        taskSuccessRate,

        ...generationMetrics,

        memoryUsage: process.memoryUsage(),
        uptime: Math.floor((Date.now() - this.startTime) / 1000),

        timeRange: {
          start: startTime.toISOString(),
          end: now.toISOString(),
        },
      }
    } catch (error) {
      logger.error({ error }, 'Failed to collect metrics')
      throw error
    }
  }

  /**
   * Get Prometheus-formatted metrics
   */
  async getPrometheusMetrics(timeRangeMinutes: number = 60): Promise<string> {
    const metrics = await this.collectMetrics(timeRangeMinutes)

    const lines: string[] = []

    // Helper to add metric
    const addMetric = (name: string, value: number, help: string, type = 'gauge') => {
      lines.push(`# HELP ${name} ${help}`)
      lines.push(`# TYPE ${name} ${type}`)
      lines.push(`${name} ${value}`)
      lines.push('')
    }

    // Task metrics
    addMetric('tasks_total', metrics.totalTasks, 'Total number of tasks', 'counter')
    addMetric('tasks_active', metrics.activeTasks, 'Number of active tasks')
    addMetric(
      'tasks_completed',
      metrics.completedTasks,
      `Number of completed tasks (last ${timeRangeMinutes}m)`,
      'counter'
    )
    addMetric(
      'tasks_failed',
      metrics.failedTasks,
      `Number of failed tasks (last ${timeRangeMinutes}m)`,
      'counter'
    )
    addMetric('tasks_success_rate', metrics.taskSuccessRate, 'Task success rate (%)')

    // Generation metrics (if available)
    if (metrics.totalGenerationRequests !== undefined) {
      addMetric(
        'generations_total',
        metrics.totalGenerationRequests,
        'Total number of generation requests',
        'counter'
      )
      addMetric(
        'generations_successful',
        metrics.successfulGenerations || 0,
        `Successful generations (last ${timeRangeMinutes}m)`,
        'counter'
      )
      addMetric(
        'generations_failed',
        metrics.failedGenerations || 0,
        `Failed generations (last ${timeRangeMinutes}m)`,
        'counter'
      )
      addMetric(
        'generations_success_rate',
        metrics.generationSuccessRate || 0,
        'Generation success rate (%)'
      )
    }

    // Memory metrics
    addMetric('memory_heap_used_bytes', metrics.memoryUsage.heapUsed, 'Heap memory used')
    addMetric('memory_heap_total_bytes', metrics.memoryUsage.heapTotal, 'Total heap memory')
    addMetric('memory_rss_bytes', metrics.memoryUsage.rss, 'Resident set size')

    // Uptime
    addMetric('process_uptime_seconds', metrics.uptime, 'Process uptime', 'counter')

    return lines.join('\n')
  }
}

// Singleton instance
export const metricsCollector = new MetricsCollector()
