import { NextResponse } from "next/server"
import { getSession, hasPermission } from "@/lib/auth"
import { sql } from "@/lib/db"

// GET /api/lemonway-api/history - Get call history with filters
export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session || !hasPermission(session.user, "lemonway_api", "view")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const methodId = searchParams.get("method_id")
    const success = searchParams.get("success")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    let query = sql`
      SELECT 
        h.*,
        m.name as method_name,
        m.endpoint as method_endpoint,
        u.email as user_email
      FROM lemonway_api_call_history h
      JOIN lemonway_api_methods m ON h.method_id = m.id
      LEFT JOIN "User" u ON h.user_id = u.id
      WHERE 1=1
    `

    if (methodId) {
      query = sql`${query} AND h.method_id = ${methodId}`
    }

    if (success !== null) {
      const isSuccess = success === "true"
      query = sql`${query} AND h.success = ${isSuccess}`
    }

    query = sql`${query} 
      ORDER BY h.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    const history = await query

    // Get total count
    let countQuery = sql`
      SELECT COUNT(*) as total
      FROM lemonway_api_call_history h
      WHERE 1=1
    `

    if (methodId) {
      countQuery = sql`${countQuery} AND h.method_id = ${methodId}`
    }

    if (success !== null) {
      const isSuccess = success === "true"
      countQuery = sql`${countQuery} AND h.success = ${isSuccess}`
    }

    const countResult = await countQuery
    const total = Number.parseInt(countResult[0].total)

    return NextResponse.json({
      history,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    })
  } catch (error: any) {
    console.error("Error fetching history:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
