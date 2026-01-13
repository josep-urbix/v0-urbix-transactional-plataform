import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function GET(request: Request) {
  try {
    await requireAuth()

    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get("timeRange") || "1h"

    // Calculate time threshold based on selected range
    let minutesAgo = 60 // default 1 hour
    switch (timeRange) {
      case "1m":
        minutesAgo = 1
        break
      case "15m":
        minutesAgo = 15
        break
      case "1h":
        minutesAgo = 60
        break
      case "8h":
        minutesAgo = 480
        break
      case "24h":
        minutesAgo = 1440
        break
    }

    const timeThreshold = new Date(Date.now() - minutesAgo * 60 * 1000)

    const configResult = await sql`
      SELECT value FROM "AppConfig" WHERE key = 'lemonway_processing_grace_period_seconds'
    `
    const gracePeriodSeconds = configResult[0]?.value ? Number.parseInt(configResult[0].value) : 30

    const stats = await sql`
      SELECT 
        COUNT(*) as total_calls,
        COUNT(*) FILTER (WHERE success = true) as successful_calls,
        COUNT(*) FILTER (WHERE success = false) as failed_calls,
        AVG(duration_ms) as avg_duration_ms,
        MAX(duration_ms) as max_duration_ms,
        MIN(duration_ms) as min_duration_ms,
        COUNT(DISTINCT endpoint) as unique_endpoints
      FROM "LemonwayApiCallLog"
      WHERE created_at >= ${timeThreshold.toISOString()}
    `

    const recentCalls = await sql`
      SELECT endpoint, created_at, duration_ms, success
      FROM "LemonwayApiCallLog"
      ORDER BY created_at DESC
      LIMIT 10
    `

    const queuedRequests = await sql`
      SELECT COUNT(*) as queued
      FROM "LemonwayApiCallLog"
      WHERE (retry_status = 'pending' OR retry_status = 'limit_pending')
      AND next_retry_at > NOW()
      AND final_failure = false
    `

    // cuyo next_retry_at ya pasó dentro del período de gracia y aún están pendientes
    const activeRequests = await sql`
      SELECT COUNT(*) as active
      FROM "LemonwayApiCallLog"
      WHERE retry_status IN ('pending', 'limit_pending')
      AND next_retry_at IS NOT NULL
      AND next_retry_at <= NOW()
      AND next_retry_at >= NOW() - INTERVAL '1 second' * ${gracePeriodSeconds}
      AND final_failure = false
    `

    const retryStats = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE manual_retry_needed = true) as manual_retry_count,
        COUNT(*) FILTER (WHERE final_failure = true) as final_failure_count,
        COUNT(*) FILTER (WHERE retry_status = 'pending') as pending_retry_count
      FROM "LemonwayApiCallLog"
      WHERE created_at >= ${timeThreshold.toISOString()}
    `

    const hasRecentFailures = await sql`
      SELECT COUNT(*) as count
      FROM "LemonwayApiCallLog"
      WHERE success = false
      AND created_at >= NOW() - INTERVAL '5 minutes'
    `

    const hasSuccessAfterFailure = await sql`
      SELECT COUNT(*) as count
      FROM "LemonwayApiCallLog"
      WHERE success = true
      AND created_at >= NOW() - INTERVAL '5 minutes'
    `

    let systemStatus = "active"
    if (retryStats[0].manual_retry_count > 0) {
      systemStatus = "warning"
    }
    if (hasRecentFailures[0].count > 0 && hasSuccessAfterFailure[0].count === 0) {
      systemStatus = "error"
    }

    return NextResponse.json({
      stats: stats[0] || {
        total_calls: 0,
        successful_calls: 0,
        failed_calls: 0,
        avg_duration_ms: 0,
        max_duration_ms: 0,
        min_duration_ms: 0,
        unique_endpoints: 0,
      },
      recentCalls,
      queueStatus: {
        queued: Number(queuedRequests[0]?.queued || 0),
        active: Number(activeRequests[0]?.active || 0),
      },
      retryStats: {
        manualRetryCount: Number(retryStats[0]?.manual_retry_count || 0),
        finalFailureCount: Number(retryStats[0]?.final_failure_count || 0),
        pendingRetryCount: Number(retryStats[0]?.pending_retry_count || 0),
      },
      systemStatus,
      timestamp: new Date().toISOString(),
      timeRange,
    })
  } catch (error: any) {
    console.error("Error fetching queue stats:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
