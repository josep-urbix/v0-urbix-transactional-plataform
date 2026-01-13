import { NextResponse } from "next/server"
import { getSession, hasPermission } from "@/lib/auth"
import { sql } from "@/lib/db"

// GET /api/lemonway-api/methods - List all API methods
export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const permCheck = await hasPermission(session.user, "lemonway_api:view")
    if (!permCheck.allowed) {
      return NextResponse.json({ error: "Sin permisos suficientes" }, { status: 403 })
    }

    const result = await sql`
      SELECT 
        id, name, endpoint, http_method, description, category,
        is_enabled, request_schema, response_schema,
        example_request, example_response, created_at, updated_at
      FROM lemonway_api_methods
      ORDER BY category, name
    `

    return NextResponse.json({ methods: result })
  } catch (error: any) {
    console.error("[v0] Error fetching API methods:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch API methods" }, { status: 500 })
  }
}
