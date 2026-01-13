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
      "lemonway:queries",
      "view",
      request,
    )

    const queries = await sql`
      SELECT 
        id, name, description, slug, endpoint, http_method,
        request_template, version, is_active, is_public,
        requires_sandbox_approval, created_at, updated_at
      FROM lemonway_temp.lemonway_custom_queries
      ORDER BY created_at DESC
    `

    return NextResponse.json({
      success: true,
      data: queries,
    })
  } catch (error) {
    console.error("[v0] GET custom-queries error:", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin(
      await (async () => {
        const { getServerSession } = await import("@/lib/auth")
        return await getServerSession()
      })(),
      "lemonway:queries",
      "create",
      request,
    )

    const body = await request.json()
    const { name, description, slug, endpoint, http_method, request_template } = body

    if (!name || !endpoint || !http_method) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    const query = await sql`
      INSERT INTO lemonway_temp.lemonway_custom_queries 
      (name, description, slug, endpoint, http_method, request_template, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      data: query[0],
    })
  } catch (error) {
    console.error("[v0] POST custom-queries error:", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
