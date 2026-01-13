import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession, requireAdmin } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()

    const authResult = await requireAdmin(session?.user, "sql_logs", "view", request)
    if (!authResult.success) return authResult.error

    const { searchParams } = new URL(request.url)

    const page = Number.parseInt(searchParams.get("page") || "1")
    const pageSize = Number.parseInt(searchParams.get("pageSize") || "50")
    const status = searchParams.get("status")
    const apiEndpoint = searchParams.get("apiEndpoint")
    const userEmail = searchParams.get("userEmail")
    const from = searchParams.get("from")
    const to = searchParams.get("to")

    const offset = (page - 1) * pageSize

    const whereConditions = []
    const queryParams = []

    if (status && status !== "") {
      whereConditions.push(`status = $${queryParams.length + 1}`)
      queryParams.push(status)
    }

    if (apiEndpoint && apiEndpoint !== "") {
      whereConditions.push(`api_endpoint ILIKE $${queryParams.length + 1}`)
      queryParams.push(`%${apiEndpoint}%`)
    }

    if (userEmail && userEmail !== "") {
      whereConditions.push(`user_email ILIKE $${queryParams.length + 1}`)
      queryParams.push(`%${userEmail}%`)
    }

    if (from && from !== "") {
      whereConditions.push(`"createdAt" >= $${queryParams.length + 1}::timestamp`)
      queryParams.push(from)
    }

    if (to && to !== "") {
      whereConditions.push(`"createdAt" <= $${queryParams.length + 1}::timestamp`)
      queryParams.push(to)
    }

    queryParams.push(pageSize)
    queryParams.push(offset)

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : ""

    const limitParamIndex = queryParams.length - 1
    const offsetParamIndex = queryParams.length

    const itemsQuery = `
      SELECT 
        id,
        query,
        params,
        execution_time_ms,
        rows_affected,
        status,
        error_message,
        api_endpoint,
        user_email,
        ip_address,
        "createdAt"
      FROM "SQLLog"
      ${whereClause}
      ORDER BY "createdAt" DESC
      LIMIT $${limitParamIndex}
      OFFSET $${offsetParamIndex}
    `

    const countQuery = `
      SELECT COUNT(*)::int as count FROM "SQLLog"
      ${whereClause}
    `

    const items = await sql.query(itemsQuery, queryParams)
    const countParams = queryParams.slice(0, queryParams.length - 2)
    const totalResult = await sql.query(countQuery, countParams)

    const total = totalResult[0]?.count || 0

    // Get statistics
    const statsQuery = `
      SELECT 
        COUNT(*)::int as total_queries,
        COUNT(*) FILTER (WHERE status = 'success')::int as successful_queries,
        COUNT(*) FILTER (WHERE status = 'error')::int as failed_queries,
        AVG(execution_time_ms)::numeric(10,3) as avg_execution_time,
        MAX(execution_time_ms)::numeric(10,3) as max_execution_time,
        MIN(execution_time_ms)::numeric(10,3) as min_execution_time
      FROM "SQLLog"
      ${whereClause}
    `

    const statsCountParams = queryParams.slice(0, queryParams.length - 2)
    const statsResult = await sql.query(statsQuery, statsCountParams)
    const stats = statsResult[0] || {}

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      stats,
    })
  } catch (error) {
    console.error("[SQL Logs API] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
