import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdmin } from "@/lib/auth/middleware"
import { LemonwayClient } from "@/lib/lemonway-client"

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin(
      await (async () => {
        const { getServerSession } = await import("@/lib/auth")
        return await getServerSession()
      })(),
      "lemonway:explorer",
      "dryrun",
      request,
    )

    const body = await request.json()
    const { queue_entry_id, execute_live = false } = body

    // Fetch queue entry
    const queueEntry = await sql`
      SELECT * FROM lemonway_temp.lemonway_request_queue WHERE id = $1
    `

    if (!queueEntry || queueEntry.length === 0) {
      return NextResponse.json({ success: false, error: "Queue entry not found" }, { status: 404 })
    }

    const entry = queueEntry[0]
    const client = new LemonwayClient()

    // Sandbox execution (dry-run)
    const startTime = Date.now()
    const result = await client.executeRequest({
      endpoint: entry.endpoint,
      method: entry.http_method,
      payload: entry.request_payload,
      sandbox: !execute_live,
    })
    const executionTime = Date.now() - startTime

    // Store snapshot
    await sql`
      INSERT INTO lemonway_temp.lemonway_sandbox_history
      (queue_entry_id, request_snapshot, response_snapshot, execution_time_ms, created_by)
      VALUES ($1, $2, $3, $4, $5)
    `

    return NextResponse.json({
      success: true,
      data: {
        request: entry.request_payload,
        response: result,
        executionTime,
        sandbox: !execute_live,
      },
    })
  } catch (error) {
    console.error("[v0] Sandbox execute error:", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
