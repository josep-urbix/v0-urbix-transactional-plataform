import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession, requireAdmin } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()

    const authResult = await requireAdmin(session?.user, "access_logs", "view", request)
    if (!authResult.success) return authResult.error

    const searchParams = request.nextUrl.searchParams
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = (page - 1) * limit
    const allowed = searchParams.get("allowed")
    const userId = searchParams.get("userId")
    const resource = searchParams.get("resource")

    // Build dynamic query with filters
    const whereConditions = []
    const queryParams: any[] = []

    if (allowed !== null && allowed !== "") {
      whereConditions.push(`"allowed" = $${queryParams.length + 1}`)
      queryParams.push(allowed === "true")
    }

    if (userId) {
      whereConditions.push(`"userId" = $${queryParams.length + 1}`)
      queryParams.push(userId)
    }

    if (resource) {
      whereConditions.push(`resource ILIKE $${queryParams.length + 1}`)
      queryParams.push(`%${resource}%`)
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : ""

    // Get logs with filters
    queryParams.push(limit)
    queryParams.push(offset)

    const logsQuery = `
      SELECT * FROM "AccessLog"
      ${whereClause}
      ORDER BY "createdAt" DESC
      LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
    `

    const logs = await sql.query(logsQuery, queryParams)

    // Get stats (last 24h)
    const stats = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE "allowed" = true) as allowed_count,
        COUNT(*) FILTER (WHERE "allowed" = false) as denied_count,
        COUNT(DISTINCT "userId") as unique_users
      FROM "AccessLog"
      WHERE "createdAt" > NOW() - INTERVAL '24 hours'
    `

    // Get total count with same filters
    const countQuery = `SELECT COUNT(*) as count FROM "AccessLog" ${whereClause}`
    const countParams = queryParams.slice(0, queryParams.length - 2)
    const totalCount = await sql.query(countQuery, countParams)

    return NextResponse.json({
      logs,
      stats: stats[0],
      pagination: {
        page,
        limit,
        total: Number.parseInt(totalCount[0]?.count || "0"),
        totalPages: Math.ceil(Number.parseInt(totalCount[0]?.count || "0") / limit),
      },
    })
  } catch (error: any) {
    console.error("[Access Logs API] Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
