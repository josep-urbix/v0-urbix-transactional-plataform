import { NextResponse } from "next/server"
import { getSession, hasPermission } from "@/lib/auth"
import { sql } from "@/lib/db"

// GET /api/lemonway-api/presets - List user's presets
export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session || !hasPermission(session.user, "lemonway_api", "view")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const methodId = searchParams.get("method_id")

    let query = sql`
      SELECT p.*, m.name as method_name
      FROM lemonway_api_presets p
      JOIN lemonway_api_methods m ON p.method_id = m.id
      WHERE p.user_id = ${session.user.id}
    `

    if (methodId) {
      query = sql`${query} AND p.method_id = ${methodId}`
    }

    query = sql`${query} ORDER BY p.created_at DESC`

    const presets = await query

    return NextResponse.json({ presets })
  } catch (error: any) {
    console.error("Error fetching presets:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/lemonway-api/presets - Create new preset
export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session || !hasPermission(session.user, "lemonway_api", "manage_presets")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const { method_id, name, parameters } = body

    const result = await sql`
      INSERT INTO lemonway_api_presets (method_id, user_id, name, parameters)
      VALUES (${method_id}, ${session.user.id}, ${name}, ${JSON.stringify(parameters)})
      RETURNING *
    `

    return NextResponse.json({ preset: result[0] })
  } catch (error: any) {
    console.error("Error creating preset:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
