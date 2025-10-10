/**
 * Metrics Endpoint
 *
 * GET /api/metrics
 *
 * Returns system metrics in Prometheus format.
 * Can be scraped by Prometheus or other monitoring tools.
 */

import { NextResponse } from 'next/server'
import { metricsCollector } from '~/lib/services/metrics-collector'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    // Get time range from query params (default: 60 minutes)
    const { searchParams } = new URL(request.url)
    const timeRange = parseInt(searchParams.get('timeRange') || '60', 10)

    const metrics = await metricsCollector.getPrometheusMetrics(timeRange)

    return new NextResponse(metrics, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4',
      },
    })
  } catch (error) {
    return new NextResponse(
      `# ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`,
      {
        status: 500,
        headers: {
          'Content-Type': 'text/plain',
        },
      }
    )
  }
}
