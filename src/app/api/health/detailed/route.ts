/**
 * Detailed Health Check Endpoint
 *
 * GET /api/health/detailed
 *
 * Returns detailed health status including all components.
 * Can be used for admin dashboards or detailed monitoring.
 */

import { NextResponse } from 'next/server'
import { healthChecker } from '~/lib/services/health-checker'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const health = await healthChecker.checkDetailedHealth()

    const status = health.status === 'unhealthy' ? 503 : 200

    return NextResponse.json(health, { status })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        components: {
          database: {
            status: 'down',
            message: 'Health check failed',
            lastCheck: new Date().toISOString(),
          },
          s3: {
            status: 'down',
            message: 'Health check failed',
            lastCheck: new Date().toISOString(),
          },
        },
      },
      { status: 503 }
    )
  }
}
