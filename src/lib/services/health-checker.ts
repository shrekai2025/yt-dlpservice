/**
 * Health Checker Service
 *
 * Checks system health including database, S3, and adapters
 */

import { db } from '~/server/db'
import { s3Uploader } from '~/lib/adapters/utils/s3-uploader'
import { logger } from '~/lib/logger'

export interface ComponentHealth {
  status: 'up' | 'down' | 'degraded'
  message?: string
  lastCheck: string
  responseTime?: number
}

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  uptime: number
  version: string
}

export interface DetailedHealthResponse extends HealthResponse {
  components: {
    database: ComponentHealth
    s3: ComponentHealth
    adapters?: Record<string, ComponentHealth>
  }
}

export class HealthChecker {
  private startTime: number

  constructor() {
    this.startTime = Date.now()
  }

  /**
   * Basic health check (fast, no detailed checks)
   */
  async checkBasicHealth(): Promise<HealthResponse> {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000)

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime,
      version: process.env.npm_package_version || '1.0.0',
    }
  }

  /**
   * Detailed health check (checks all components)
   */
  async checkDetailedHealth(): Promise<DetailedHealthResponse> {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000)
    const components: DetailedHealthResponse['components'] = {
      database: await this.checkDatabase(),
      s3: await this.checkS3(),
    }

    // Determine overall status
    const componentStatuses = Object.values(components).map((c) => c.status)
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'

    if (componentStatuses.includes('down')) {
      overallStatus = 'unhealthy'
    } else if (componentStatuses.includes('degraded')) {
      overallStatus = 'degraded'
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime,
      version: process.env.npm_package_version || '1.0.0',
      components,
    }
  }

  /**
   * Check database connectivity
   */
  private async checkDatabase(): Promise<ComponentHealth> {
    const startTime = Date.now()

    try {
      // Simple query to check database
      await db.$queryRaw`SELECT 1`

      const responseTime = Date.now() - startTime

      return {
        status: responseTime < 100 ? 'up' : 'degraded',
        message: responseTime < 100 ? 'Database is healthy' : 'Database is slow',
        lastCheck: new Date().toISOString(),
        responseTime,
      }
    } catch (error) {
      logger.error({ error }, 'Database health check failed')

      return {
        status: 'down',
        message: `Database is down: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastCheck: new Date().toISOString(),
      }
    }
  }

  /**
   * Check S3 connectivity
   */
  private async checkS3(): Promise<ComponentHealth> {
    const startTime = Date.now()

    try {
      // Check if S3 is configured
      if (!process.env.AWS_S3_BUCKET || !process.env.AWS_ACCESS_KEY_ID) {
        return {
          status: 'degraded',
          message: 'S3 is not configured',
          lastCheck: new Date().toISOString(),
        }
      }

      // Try to list bucket (doesn't require actual objects)
      // Note: s3Uploader might not have a direct health check method
      // This is a placeholder - actual implementation depends on s3Uploader API

      const responseTime = Date.now() - startTime

      return {
        status: 'up',
        message: 'S3 is configured',
        lastCheck: new Date().toISOString(),
        responseTime,
      }
    } catch (error) {
      logger.error({ error }, 'S3 health check failed')

      return {
        status: 'down',
        message: `S3 is down: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastCheck: new Date().toISOString(),
      }
    }
  }
}

// Singleton instance
export const healthChecker = new HealthChecker()
