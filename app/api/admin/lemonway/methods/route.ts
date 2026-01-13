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
      "view",
      request,
    )

    const methods = await sql`
      SELECT 
        id, name, endpoint, http_method, category,
        description, request_schema, response_schema,
        example_request, example_response, is_enabled,
        created_at, updated_at
      FROM lemonway_api_methods
      WHERE is_enabled = true
      ORDER BY category, name
    `

    return NextResponse.json({
      success: true,
      data: methods,
      total: methods.length,
    })
  } catch (error) {
    console.error("[v0] GET methods error:", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
