/**
 * Endpoint: POST /api/admin/lemonway/accounts/search
 * Propósito: Búsqueda avanzada con múltiples criterios
 * Body:
 *   - query: búsqueda textual (nombre, email, referencia)
 *   - statuses: array de estados
 *   - created_after: fecha mínima
 *   - created_before: fecha máxima
 *   - profile_type: tipo de perfil
 * Permisos: lemonway:accounts:view
 * Trazabilidad: Especificación Sección 8.2
 */

import { getSession, requirePermission } from "@/lib/auth"
import { sql } from "@neon/serverless"
import { type NextRequest, NextResponse } from "next/server"

interface SearchPayload {
  query?: string
  statuses?: string[]
  created_after?: string
  created_before?: string
  profile_type?: string
  limit?: number
}

export async function POST(request: NextRequest) {
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

    const payload: SearchPayload = await request.json()
    const limit = Math.min(100, payload.limit || 50)

    // Construir WHERE clauses
    const whereConditions = ["deleted_at IS NULL"]

    if (payload.query) {
      whereConditions.push(
        `(LOWER(first_name) LIKE LOWER('%${payload.query}%') OR LOWER(last_name) LIKE LOWER('%${payload.query}%') OR LOWER(email) LIKE LOWER('%${payload.query}%') OR request_reference LIKE '%${payload.query}%')`,
      )
    }

    if (payload.statuses && payload.statuses.length > 0) {
      const statusList = payload.statuses.map((s) => `'${s}'`).join(",")
      whereConditions.push(`status IN (${statusList})`)
    }

    if (payload.created_after) {
      whereConditions.push(`created_at >= '${payload.created_after}'`)
    }

    if (payload.created_before) {
      whereConditions.push(`created_at <= '${payload.created_before}'`)
    }

    if (payload.profile_type) {
      whereConditions.push(`profile_type = '${payload.profile_type}'`)
    }

    const whereClause = whereConditions.join(" AND ")

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
        profile_type,
        created_at,
        updated_at
      FROM investors.lemonway_account_requests
      WHERE ${sql.raw(whereClause)}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `

    return NextResponse.json(
      {
        success: true,
        data: results,
        count: results.length,
        filters_applied: {
          query: payload.query,
          statuses: payload.statuses,
          created_after: payload.created_after,
          created_before: payload.created_before,
          profile_type: payload.profile_type,
        },
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("[v0] Search accounts error:", error)
    return NextResponse.json({ error: "Failed to search accounts" }, { status: 500 })
  }
}
