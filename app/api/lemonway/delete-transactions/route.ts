import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ids } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: false, message: "IDs de transacciones requeridos" }, { status: 400 })
    }

    // Verificar que todas las transacciones a marcar como eliminadas son fallidas
    const transactionsToDelete = await sql`
      SELECT id, success, final_failure, retry_status, request_id
      FROM "LemonwayApiCallLog"
      WHERE id = ANY(${ids})
    `

    const validIds = transactionsToDelete
      .filter((t: any) => !t.success && (t.final_failure || t.retry_status === "failed"))
      .map((t: any) => t.id)

    const validRequestIds = transactionsToDelete
      .filter((t: any) => !t.success && (t.final_failure || t.retry_status === "failed"))
      .map((t: any) => t.request_id)
      .filter((id: any) => id !== null)

    if (validIds.length === 0) {
      return NextResponse.json(
        { success: false, message: "Solo se pueden eliminar transacciones fallidas" },
        { status: 400 },
      )
    }

    // Marcamos todas las transacciones con el mismo request_id (incluyendo reintentos)
    const result = await sql`
      UPDATE "LemonwayApiCallLog"
      SET retry_status = 'deleted'
      WHERE request_id = ANY(${validRequestIds})
    `

    return NextResponse.json({
      success: true,
      deletedCount: validIds.length,
      message: `${validIds.length} transacción(es) marcada(s) como eliminada(s)`,
    })
  } catch (error: any) {
    console.error("[Delete Transactions] Error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
