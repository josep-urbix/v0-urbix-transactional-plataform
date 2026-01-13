import { type NextRequest, NextResponse } from "next/server"
import { getSession, hasPermission } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  try {
    const { runId } = await params

    // Autenticación y autorización
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const canView = await hasPermission(session.user, "lemonway_imports", "read")
    if (!canView) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }

    // Obtener detalles del run
    const runs = await sql`
      SELECT 
        ir.*,
        u.email as user_email
      FROM lemonway_temp.import_runs ir
      LEFT JOIN public."User" u ON ir.created_by = u.id
      WHERE ir.id = ${runId}
    `

    if (!runs || runs.length === 0) {
      return NextResponse.json({ error: "Importación no encontrada" }, { status: 404 })
    }

    const run = runs[0]

    // Obtener estadísticas de transacciones importadas
    const stats = await sql`
      SELECT 
        COUNT(*) as total_movimientos,
        SUM(CASE WHEN error_procesamiento IS NOT NULL THEN 1 ELSE 0 END) as movimientos_con_error
      FROM lemonway_temp.movimientos_cuenta
      WHERE import_run_id = ${runId}
    `

    const movimientos = await sql`
      SELECT urbix_account_id
      FROM lemonway_temp.movimientos_cuenta
      WHERE import_run_id = ${runId}
        AND urbix_account_id IS NOT NULL
      LIMIT 1
    `

    const urbixAccountId = movimientos?.[0]?.urbix_account_id || null

    return NextResponse.json({
      import: {
        ...run,
        urbix_account_id: urbixAccountId,
        stats: stats[0] || { total_movimientos: 0, movimientos_con_error: 0 },
      },
    })
  } catch (error) {
    console.error("[v0] Error fetching import details:", error)
    return NextResponse.json({ error: "Error al obtener detalles de importación" }, { status: 500 })
  }
}
