import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

// GET - Listar transacciones de Lemonway
export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const searchParams = request.nextUrl.searchParams
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "25")
    const status = searchParams.get("status")
    const type = searchParams.get("type")
    const walletId = searchParams.get("walletId")

    const offset = (page - 1) * limit

    // Construir filtros
    let whereClause = "WHERE 1=1"
    const params: any[] = []
    let paramIndex = 1

    if (status) {
      whereClause += ` AND "status" = $${paramIndex}`
      params.push(status)
      paramIndex++
    }

    if (type) {
      whereClause += ` AND "type" = $${paramIndex}`
      params.push(type)
      paramIndex++
    }

    if (walletId) {
      whereClause += ` AND "wallet_id" = $${paramIndex}`
      params.push(walletId)
      paramIndex++
    }

    // Agregar limit y offset
    params.push(limit, offset)

    const query = `
      SELECT * FROM "LemonwayTransaction"
      ${whereClause}
      ORDER BY "created_at" DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `

    const countQuery = `
      SELECT COUNT(*) as total FROM "LemonwayTransaction"
      ${whereClause}
    `

    const transactions = await sql.query(query, params)
    const countResult = await sql.query(countQuery, params.slice(0, -2))

    const total = Number.parseInt(countResult[0].total)

    return NextResponse.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    console.error("[Lemonway Transactions API] Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
