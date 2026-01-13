/**
 * Endpoint: GET /api/admin/lemonway/accounts/list
 * Propósito: Listar solicitudes de creación de cuentas con filtrado y búsqueda
 * Query params:
 *   - status: DRAFT, SUBMITTED, KYC-1 Completo, KYC-2 Completo, INVALID, REJECTED, CANCELLED
 *   - search: búsqueda por nombre, email, referencia
 *   - validation_status: PENDING, VALID, INVALID
 *   - page: número de página (default: 1)
 *   - limit: items por página (default: 50, max: 100)
 *   - sort: campo para ordenar (created_at, updated_at, request_reference)
 *   - order: ASC o DESC (default: DESC)
 * Permisos: lemonway:accounts:view
 * Trazabilidad: Especificación Sección 8.2
 */

import { getSession, requirePermission } from "@/lib/auth"
import { sql } from "@neon/serverless"
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
    const status = searchParams.get("status")
    const validation_status = searchParams.get("validation_status")
    const search = searchParams.get("search")
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1"))
    const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get("limit") || "50")))
    const sort = (searchParams.get("sort") || "created_at") as string
    const order = (searchParams.get("order") || "DESC").toUpperCase() as "ASC" | "DESC"

    // Validar columnas permitidas para sort
    const allowedSortColumns = ["created_at", "updated_at", "request_reference", "status"]
    const sortColumn = allowedSortColumns.includes(sort) ? sort : "created_at"

    // Construir WHERE clause dinámico
    const whereConditions = ["deleted_at IS NULL"]

    if (status) {
      whereConditions.push(`status = '${status}'`)
    }

    if (validation_status) {
      whereConditions.push(`validation_status = '${validation_status}'`)
    }

    if (search) {
      const searchTerm = `%${search}%`
      whereConditions.push(
        `(LOWER(first_name) LIKE LOWER('${search}%') OR LOWER(last_name) LIKE LOWER('${search}%') OR LOWER(email) LIKE LOWER('${search}%') OR request_reference LIKE '${searchTerm}')`,
      )
    }

    const whereClause = whereConditions.join(" AND ")
    const offset = (page - 1) * limit

    // Obtener total de registros
    const countResult = await sql`
      SELECT COUNT(*) as total
      FROM investors.lemonway_account_requests
      WHERE ${sql.raw(whereClause)}
    `
    const total = countResult[0].total

    // Obtener registros paginados
    const results = await sql`
      SELECT 
        id,
        request_reference,
        status,
        validation_status,
        first_name,
        last_name,
        email,
        lemonway_wallet_id,
        created_at,
        updated_at,
        submitted_at,
        kyc_1_completed_at,
        kyc_2_completed_at,
        profile_type
      FROM investors.lemonway_account_requests
      WHERE ${sql.raw(whereClause)}
      ORDER BY ${sql.raw(sortColumn)} ${sql.raw(order)}
      LIMIT ${limit} OFFSET ${offset}
    `

    const pages = Math.ceil(total / limit)

    return NextResponse.json(
      {
        success: true,
        data: results,
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
