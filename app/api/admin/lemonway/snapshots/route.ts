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
      "lemonway:explorer",
      "snapshots",
      request,
    )

    const { searchParams } = new URL(request.url)
    const queue_entry_id = searchParams.get("queue_entry_id")

    let query = `
      SELECT 
        id, queue_entry_id, request_snapshot, response_snapshot,
        execution_time_ms, differences_from_production,
        version, created_by, created_at
      FROM lemonway_temp.lemonway_sandbox_history
    `

    if (queue_entry_id) {
      query += ` WHERE queue_entry_id = $1`
    }

    query += ` ORDER BY created_at DESC`

    const snapshots = await sql.query(query, queue_entry_id ? [queue_entry_id] : [])

    return NextResponse.json({
      success: true,
      data: snapshots,
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin(
      await (async () => {
        const { getServerSession } = await import("@/lib/auth")
        return await getServerSession()
      })(),
      "lemonway:explorer",
      "snapshots",
      request,
    )

    const { searchParams } = new URL(request.url)
    const snapshot_id = searchParams.get("id")

    if (!snapshot_id) {
      return NextResponse.json({ success: false, error: "Missing snapshot id" }, { status: 400 })
    }

    await sql`DELETE FROM lemonway_temp.lemonway_sandbox_history WHERE id = $1`

    return NextResponse.json({
      success: true,
      message: "Snapshot deleted",
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
