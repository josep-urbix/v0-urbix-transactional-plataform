import { NextResponse } from "next/server"
import { getSession, hasPermission } from "@/lib/auth"
import { sql } from "@/lib/db"

// GET /api/lemonway-api/methods/[methodId] - Get method details
export async function GET(request: Request, { params }: { params: Promise<{ methodId: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!hasPermission(session.user, "lemonway_api:view")) {
      return NextResponse.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 })
    }

    const { methodId } = await params

    const result = await sql`
      SELECT * FROM lemonway_api_methods
      WHERE id = ${methodId}
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Method not found" }, { status: 404 })
    }

    return NextResponse.json({ method: result[0] })
  } catch (error: any) {
    console.error("Error fetching method:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH /api/lemonway-api/methods/[methodId] - Toggle method enabled status
export async function PATCH(request: Request, { params }: { params: Promise<{ methodId: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!hasPermission(session.user, "lemonway_api:toggle")) {
      return NextResponse.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 })
    }

    const { methodId } = await params
    const body = await request.json()
    const { is_enabled } = body

    const result = await sql`
      UPDATE lemonway_api_methods
      SET 
        is_enabled = ${is_enabled},
        updated_at = NOW()
      WHERE id = ${methodId}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Method not found" }, { status: 404 })
    }

    // Log audit
    await sql`
      INSERT INTO "AccessLog" (user_id, action, resource_type, resource_id, details)
      VALUES (
        ${session.user.id},
        ${is_enabled ? "enable" : "disable"},
        'lemonway_api_method',
        ${methodId},
        ${JSON.stringify({ method_name: result[0].name })}
      )
    `

    return NextResponse.json({ method: result[0] })
  } catch (error: any) {
    console.error("Error toggling method:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
