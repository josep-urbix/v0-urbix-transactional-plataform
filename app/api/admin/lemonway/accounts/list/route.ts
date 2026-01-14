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
    let whereClause = "deleted_at IS NULL"
    const params: (string | number | null)[] = []

    if (status) {
      whereClause += ` AND status = $${params.length + 1}`
      params.push(status)
    }

    if (validation_status) {
      whereClause += ` AND validation_status = $${params.length + 1}`
      params.push(validation_status)
    }

    if (search) {
      const searchTerm = `%${search}%`
      whereClause += ` AND (LOWER(first_name) LIKE LOWER($${params.length + 1}) OR LOWER(last_name) LIKE LOWER($${params.length + 2}) OR LOWER(email) LIKE LOWER($${params.length + 3}) OR request_reference LIKE $${params.length + 4})`
      params.push(searchTerm, searchTerm, searchTerm, searchTerm)
    }

    // Get total count - using template literal with dynamic WHERE clause
    const countQueryStr = `SELECT COUNT(*) as total FROM investors.lemonway_account_requests WHERE ${whereClause}`
    const countResult = await sql.query(countQueryStr, params)
    const total = countResult[0]?.total || 0

    // Get paginated data - add LIMIT and OFFSET parameters
    params.push(limit, offset)
    const dataQueryStr = `
      SELECT 
        id, request_reference, status, validation_status, validation_errors,
        first_name, last_name, birth_date, email, phone_number,
        street, city, postal_code, province,
        lemonway_wallet_id, profile_type,
        created_at, updated_at, submitted_at, kyc_1_completed_at, kyc_2_completed_at
      FROM investors.lemonway_account_requests 
      WHERE ${whereClause}
      ORDER BY ${sortColumn} ${order}
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `

    const dataResult = await sql.query(dataQueryStr, params)

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
