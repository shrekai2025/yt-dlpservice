/**
 * Basic Health Check Endpoint
 *
 * GET /api/health
 *
 * Returns basic health status without detailed checks.
 * No authentication required - meant for load balancers and monitoring tools.
 */

import { NextResponse } from 'next/server'
import { healthChecker } from '~/lib/services/health-checker'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const health = await healthChecker.checkBasicHealth()

    const status = health.status === 'healthy' ? 200 : 503

    return NextResponse.json(health, { status })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    )
  }
}
