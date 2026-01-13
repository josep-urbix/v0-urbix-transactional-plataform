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
      "lemonway:dashboard",
      "view",
      request,
    )

    const limits = await sql`
      SELECT 
        id, operation_type_id, calls_in_window, window_start,
        max_calls_per_window, window_duration_seconds,
        created_at, updated_at
      FROM lemonway_temp.lemonway_rate_limit_tracking
      ORDER BY updated_at DESC
    `

    return NextResponse.json({
      success: true,
      data: limits,
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin(
      await (async () => {
        const { getServerSession } = await import("@/lib/auth")
        return await getServerSession()
      })(),
      "lemonway:dashboard",
      "config",
      request,
    )

    const body = await request.json()
    const { operation_type_id, max_calls_per_window, window_duration_seconds } = body

    const updated = await sql`
      UPDATE lemonway_temp.lemonway_rate_limit_tracking
      SET max_calls_per_window = $1, window_duration_seconds = $2
      WHERE operation_type_id = $3
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      data: updated[0],
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
