import { type NextRequest, NextResponse } from "next/server"
import { getSession, hasPermission } from "@/lib/auth"
import { sql } from "@/lib/db"
import { auditLog } from "@/lib/audit"

export async function POST(request: NextRequest, { params }: { params: { runId: string } }) {
  try {
    // Autenticación y autorización
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const canRetry = await hasPermission(session.user, "lemonway_imports", "update")
    if (!canRetry) {
      return NextResponse.json({ error: "Sin permisos para reintentar" }, { status: 403 })
    }

    const runId = params.runId

    // Verificar que existe y está en estado error
    const runs = await sql`
      SELECT * FROM lemonway_temp.import_runs
      WHERE id = ${runId}
    `

    if (!runs || runs.length === 0) {
      return NextResponse.json({ error: "Importación no encontrada" }, { status: 404 })
    }

    const run = runs[0]

    if (run.status !== "error" && run.status !== "partial" && run.status !== "failed") {
      return NextResponse.json(
        { error: "Solo se pueden reintentar importaciones con error, parciales o fallidas" },
        { status: 400 },
      )
    }

    // Actualizar estado a pending para reprocesar
    await sql`
      UPDATE lemonway_temp.import_runs
      SET 
        status = 'pending',
        error_message = NULL,
        started_at = NULL,
        completed_at = NULL,
        total_transactions = 0,
        imported_transactions = 0,
        failed_transactions = 0,
        skipped_transactions = 0,
        updated_at = NOW()
      WHERE id = ${runId}
    `

    // Audit log
    await auditLog({
      userId: session.user.id,
      action: "lemonway_import_retry",
      resource: "lemonway_imports",
      resourceId: runId,
      details: { previous_status: run.status },
    })

    return NextResponse.json({
      success: true,
      message: "Importación reintentada. Se procesará en segundo plano.",
    })
  } catch (error) {
    console.error("[v0] Error retrying import:", error)
    return NextResponse.json({ error: "Error al reintentar importación" }, { status: 500 })
  }
}
