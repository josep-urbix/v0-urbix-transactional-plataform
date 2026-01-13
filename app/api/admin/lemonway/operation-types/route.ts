import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdmin } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(
      await (async () => {
        const { getServerSession } = await import("@/lib/auth")
        return await getServerSession()
      })(),
      "lemonway:operations",
      "view",
      request,
    )

    const types = await sql`
      SELECT 
        id, name, display_name, description,
        default_priority, auto_approve, requires_notification,
        is_active, order_display, created_at, updated_at
      FROM lemonway_temp.lemonway_operation_types
      ORDER BY order_display ASC
    `

    return NextResponse.json({
      success: true,
      data: types,
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(
      await (async () => {
        const { getServerSession } = await import("@/lib/auth")
        return await getServerSession()
      })(),
      "lemonway:operations",
      "create",
      request,
    )

    const body = await request.json()
    const {
      name,
      display_name,
      description,
      default_priority = "NORMAL",
      auto_approve = false,
      requires_notification = true,
    } = body

    if (!name || !display_name) {
      return NextResponse.json({ success: false, error: "Missing name or display_name" }, { status: 400 })
    }

    const type = await sql`
      INSERT INTO lemonway_temp.lemonway_operation_types 
      (name, display_name, description, default_priority, auto_approve, requires_notification)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      data: type[0],
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
