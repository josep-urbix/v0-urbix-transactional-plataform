import { getSession, requirePermission } from "@/lib/auth"
import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()

    // Verificar permisos
    const authResult = await requirePermission(
      session?.user,
      "lemonway:accounts:view",
      "lemonway:accounts",
      "view",
      request,
    )
    if (!authResult.success) return authResult.error

    // Parsear query params
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status") || null
    const validation_status = searchParams.get("validation_status") || null
    const search = searchParams.get("search") || null
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1"))
    const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get("limit") || "50")))
    const sort = (searchParams.get("sort") || "created_at") as string
    const order = (searchParams.get("order") || "DESC").toUpperCase() as "ASC" | "DESC"

    // Validar columnas permitidas para sort
    const allowedSortColumns = ["created_at", "updated_at", "request_reference", "status"]
    const sortColumn = allowedSortColumns.includes(sort) ? sort : "created_at"
    const offset = (page - 1) * limit

    // Build WHERE clause with proper parameterization
    const baseWhere = `deleted_at IS NULL`
    const whereConditions: string[] = [baseWhere]
    const queryParams: (string | number | null)[] = []

    if (status) {
      whereConditions.push(`status = $${queryParams.length + 1}`)
      queryParams.push(status)
    }

    if (validation_status) {
      whereConditions.push(`validation_status = $${queryParams.length + 1}`)
      queryParams.push(validation_status)
    }

    if (search) {
      const searchTerm = `%${search}%`
      whereConditions.push(
        `(LOWER(first_name) LIKE LOWER($${queryParams.length + 1}) OR LOWER(last_name) LIKE LOWER($${queryParams.length + 1}) OR LOWER(email) LIKE LOWER($${queryParams.length + 1}) OR request_reference LIKE $${queryParams.length + 4})`,
      )
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm)
    }

    const whereClause = whereConditions.join(" AND ")

    // Build dynamic WHERE clause using template literals with proper parameter binding
    let countQuery: string
    let dataQuery: string
    const params = queryParams

    if (search) {
      countQuery = sql`
        SELECT COUNT(*) as total FROM investors.lemonway_account_requests 
        WHERE ${sql(whereClause)}
      `.text
    } else {
      countQuery = sql`
        SELECT COUNT(*) as total FROM investors.lemonway_account_requests 
        WHERE deleted_at IS NULL
        ${status ? sql`AND status = ${status}` : sql``}
        ${validation_status ? sql`AND validation_status = ${validation_status}` : sql``}
      `.text
    }

    const countResult = await sql.unsafe(countQuery, queryParams)
    const total = countResult[0]?.total || 0

    const dataQueryStr = `
      SELECT 
        id, request_reference, status, validation_status, first_name, last_name, email,
        lemonway_wallet_id, created_at, updated_at, submitted_at, kyc_1_completed_at,
        kyc_2_completed_at, profile_type
      FROM investors.lemonway_account_requests 
      WHERE ${whereClause}
      ORDER BY ${sortColumn} ${order}
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `
    queryParams.push(limit, offset)

    const dataResult = await sql.unsafe(dataQueryStr, queryParams)

    const pages = Math.ceil(total / limit)

    return NextResponse.json(
      {
        success: true,
        data: dataResult,
        pagination: {
          page,
          limit,
          total,
          pages,
          hasMore: page < pages,
        },
        filters: {
          status,
          validation_status,
          search,
          sort: sortColumn,
          order,
        },
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("[v0] List accounts error:", error)
    return NextResponse.json({ error: "Failed to list accounts" }, { status: 500 })
  }
}
