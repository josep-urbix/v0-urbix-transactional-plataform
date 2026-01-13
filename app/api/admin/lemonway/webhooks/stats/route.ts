import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    // Get overall stats
    const stats = await sql`
      SELECT * FROM lemonway_webhooks."WebhookStats"
    `

    // Get breakdown by event type (last 24h)
    const byEventType = await sql`
      SELECT 
        event_type,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE processing_status = 'PROCESSED') as processed,
        COUNT(*) FILTER (WHERE processing_status = 'FAILED') as failed
      FROM lemonway_webhooks."WebhookDelivery"
      WHERE received_at >= NOW() - INTERVAL '24 hours'
      GROUP BY event_type
      ORDER BY count DESC
    `

    // Get breakdown by notif_category
    const byCategory = await sql`
      SELECT 
        w.notif_category,
        m.description,
        COUNT(*) as count
      FROM lemonway_webhooks."WebhookDelivery" w
      LEFT JOIN lemonway_webhooks."NotifCategoryMapping" m ON w.notif_category = m.notif_category
      WHERE w.received_at >= NOW() - INTERVAL '24 hours'
      GROUP BY w.notif_category, m.description
      ORDER BY count DESC
    `

    return NextResponse.json({
      stats: stats[0] || {},
      byEventType,
      byCategory,
    })
  } catch (error) {
    console.error("[AdminWebhooks] Error getting stats:", error)
    return NextResponse.json({ error: "Error getting stats" }, { status: 500 })
  }
}
