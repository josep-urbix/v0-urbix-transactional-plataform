import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

// POST - Marcar transacciones huérfanas como fallo final
export async function POST(request: Request) {
  try {
    // Obtener IDs del body si se proporcionan
    let specificIds: number[] | null = null
    try {
      const body = await request.json()
      if (body.ids && Array.isArray(body.ids) && body.ids.length > 0) {
        specificIds = body.ids
      }
    } catch {
      // No hay body o no es JSON, marcar todas las huérfanas
    }

    let orphanedTransactions

    if (specificIds) {
      // porque 'success' ahora significa reintento exitoso
      orphanedTransactions = await sql`
        SELECT id, request_id, response_status, retry_status, retry_count
        FROM "LemonwayApiCallLog"
        WHERE id = ANY(${specificIds})
          AND (
            (response_status >= 400 AND (retry_status IS NULL OR retry_status = '' OR retry_status = 'none'))
            OR (response_status IS NULL AND retry_status = 'none')
          )
          AND (final_failure IS NULL OR final_failure = false)
          AND (retry_status IS NULL OR retry_status NOT IN ('pending', 'limit_pending', 'deleted', 'success'))
        ORDER BY id DESC
      `
    } else {
      orphanedTransactions = await sql`
        SELECT id, request_id, response_status, retry_status, retry_count
        FROM "LemonwayApiCallLog"
        WHERE (
            (response_status >= 400 AND (retry_status IS NULL OR retry_status = '' OR retry_status = 'none'))
            OR (response_status IS NULL AND retry_status = 'none')
          )
          AND (final_failure IS NULL OR final_failure = false)
          AND (retry_status IS NULL OR retry_status NOT IN ('pending', 'limit_pending', 'deleted', 'success'))
        ORDER BY id DESC
      `
    }

    console.log(`Found ${orphanedTransactions.length} orphaned failed transactions`)

    if (orphanedTransactions.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No hay transacciones huérfanas para marcar",
        markedCount: 0,
      })
    }

    // Marcar todas como fallo final
    const ids = orphanedTransactions.map((t) => t.id)

    await sql`
      UPDATE "LemonwayApiCallLog"
      SET 
        retry_status = 'failed',
        final_failure = true,
        next_retry_at = NULL
      WHERE id = ANY(${ids})
    `

    console.log(`Marked ${ids.length} transactions as final failure`)

    return NextResponse.json({
      success: true,
      message: `Se han marcado ${ids.length} transacciones como fallo final`,
      markedCount: ids.length,
      ids: ids,
    })
  } catch (error) {
    console.error("Error marking orphaned transactions:", error)
    return NextResponse.json(
      { success: false, error: "Error al marcar transacciones huérfanas", details: String(error) },
      { status: 500 },
    )
  }
}

// GET - Ver transacciones huérfanas sin marcarlas
export async function GET() {
  try {
    const orphanedTransactions = await sql`
      SELECT id, request_id, endpoint, response_status, retry_status, retry_count, final_failure, created_at
      FROM "LemonwayApiCallLog"
      WHERE (
          (response_status >= 400 AND (retry_status IS NULL OR retry_status = '' OR retry_status = 'none'))
          OR (response_status IS NULL AND retry_status = 'none')
        )
        AND (final_failure IS NULL OR final_failure = false)
        AND (retry_status IS NULL OR retry_status NOT IN ('pending', 'limit_pending', 'deleted', 'success'))
      ORDER BY id DESC
      LIMIT 100
    `

    return NextResponse.json({
      count: orphanedTransactions.length,
      transactions: orphanedTransactions,
    })
  } catch (error) {
    console.error("Error fetching orphaned transactions:", error)
    return NextResponse.json(
      { error: "Error al obtener transacciones huérfanas", details: String(error) },
      { status: 500 },
    )
  }
}
