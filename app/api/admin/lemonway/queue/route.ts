import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdmin } from "@/lib/auth/middleware"

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(
      await (async () => {
        const { getServerSession } = await import("@/lib/auth")
        return await getServerSession()
      })(),
      "lemonway:queue",
      "view",
      request,
    )

    const { searchParams } = new URL(request.url)
    const priority = searchParams.get("priority") // URGENT | NORMAL | all
    const status = searchParams.get("status") // pending | processing | completed | failed
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = (page - 1) * limit

    const conditions: string[] = []
    const params: any[] = []
    let paramIndex = 1

    if (priority && priority !== "all") {
      conditions.push(`priority = $${paramIndex}`)
      params.push(priority)
      paramIndex++
    }

    if (status) {
      conditions.push(`status = $${paramIndex}`)
      params.push(status)
      paramIndex++
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

    params.push(limit)
    params.push(offset)

    const query = `
      SELECT 
        ROW_NUMBER() OVER (ORDER BY CASE WHEN priority = 'URGENT' THEN 0 ELSE 1 END, created_at) as queue_position,
        id, priority, endpoint, http_method,
        wallet_id, account_id, operation_type_id, status,
        retry_count, max_retries, next_retry_at,
        error_message, sandbox_mode,
        created_at, started_at, completed_at
      FROM lemonway_temp.lemonway_request_queue
      ${whereClause}
      ORDER BY CASE WHEN priority = 'URGENT' THEN 0 ELSE 1 END ASC, created_at ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `

    const queue = await sql.query(query, params)

    const countQuery = `
      SELECT COUNT(*) as count 
      FROM lemonway_temp.lemonway_request_queue
      ${whereClause}
    `
    const countParams = params.slice(0, paramIndex - 1)
    const total = await sql.query(countQuery, countParams)

    return NextResponse.json({
      success: true,
      data: queue,
      pagination: {
        page,
        limit,
        total: total[0]?.count || 0,
        pages: Math.ceil((total[0]?.count || 0) / limit),
      },
    })
  } catch (error) {
    console.error("[v0] GET /api/admin/lemonway/queue error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Error fetching queue" },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(
      await (async () => {
        const { getServerSession } = await import("@/lib/auth")
        return await getServerSession()
      })(),
      "lemonway:queue",
      "manage",
      request,
    )

    const body = await request.json()
    const { action, queue_ids } = body // action: pause | resume | prioritize | cancel

    if (!action || !queue_ids || !Array.isArray(queue_ids)) {
      return NextResponse.json({ success: false, error: "Missing action or queue_ids" }, { status: 400 })
    }

    let updateQuery = ""
    switch (action) {
      case "prioritize":
        updateQuery = `UPDATE lemonway_temp.lemonway_request_queue SET priority = 'URGENT' WHERE id = ANY($1)`
        break
      case "deprioritize":
        updateQuery = `UPDATE lemonway_temp.lemonway_request_queue SET priority = 'NORMAL' WHERE id = ANY($1)`
        break
      case "cancel":
        updateQuery = `UPDATE lemonway_temp.lemonway_request_queue SET status = 'cancelled' WHERE id = ANY($1)`
        break
      default:
        return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
    }

    await sql.query(updateQuery, [queue_ids])

    return NextResponse.json({
      success: true,
      message: `Action '${action}' performed on ${queue_ids.length} queue items`,
    })
  } catch (error) {
    console.error("[v0] POST /api/admin/lemonway/queue error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Error managing queue" },
      { status: 500 },
    )
  }
}
