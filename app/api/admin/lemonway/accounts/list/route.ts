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

    const whereConditions: string[] = ["deleted_at IS NULL"]
    const params: any[] = []
    let paramIndex = 1

    if (status) {
      whereConditions.push(`status = $${paramIndex}`)
      params.push(status)
      paramIndex++
    }

    if (validation_status) {
      whereConditions.push(`validation_status = $${paramIndex}`)
      params.push(validation_status)
      paramIndex++
    }

    if (search) {
      const searchTerm = `%${search.toLowerCase()}%`
      whereConditions.push(
        `(LOWER(first_name) LIKE $${paramIndex} OR LOWER(last_name) LIKE $${paramIndex} OR LOWER(email) LIKE $${paramIndex} OR request_reference ILIKE $${paramIndex})`,
      )
      params.push(searchTerm, searchTerm, searchTerm, search)
      paramIndex += 4
    }

    const whereClause = whereConditions.join(" AND ")

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM investors.lemonway_account_requests WHERE ${whereClause}`
    const countResult = await sql.query(countQuery, params)
    const total = countResult[0]?.total || 0

    // Get paginated data
    const dataQuery = `
      SELECT 
        id, request_reference, status, validation_status, validation_errors,
        first_name, last_name, birth_date, email, phone_number,
        street, city, postal_code, province,
        lemonway_wallet_id, profile_type,
        created_at, updated_at, submitted_at, kyc_1_completed_at, kyc_2_completed_at
      FROM investors.lemonway_account_requests 
      WHERE ${whereClause}
      ORDER BY ${sortColumn} ${order}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `
    const dataParams = [...params, limit, offset]
    const dataResult = await sql.query(dataQuery, dataParams)

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
