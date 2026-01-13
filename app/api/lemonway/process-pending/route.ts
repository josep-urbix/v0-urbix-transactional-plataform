import { neon } from "@neondatabase/serverless"
import { LemonwayClient } from "@/lib/lemonway-client"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const pendingLogs = await sql`
      SELECT id FROM "LemonwayApiCallLog" 
      WHERE endpoint = '/import-transactions' 
      AND retry_status = 'pending' 
      AND (next_retry_at IS NULL OR next_retry_at <= NOW())
      LIMIT 100
    `

    console.log(`[v0] Found ${pendingLogs.length} pending transaction logs to process`)

    let successCount = 0
    let failureCount = 0

    for (const log of pendingLogs) {
      try {
        const result = await LemonwayClient.retryFailedCall(log.id)
        if (result.success) {
          successCount++
        } else {
          failureCount++
        }
      } catch (error) {
        failureCount++
        console.error(`[v0] Error processing log ${log.id}:`, error)
      }
    }

    return Response.json({
      processed: pendingLogs.length,
      success: successCount,
      failed: failureCount,
    })
  } catch (error) {
    console.error("[v0] Error in process-pending endpoint:", error)
    return Response.json(
      {
        error: "Failed to process pending logs",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
