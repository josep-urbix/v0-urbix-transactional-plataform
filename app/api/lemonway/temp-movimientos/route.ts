import { type NextRequest, NextResponse } from "next/server"
import { getSession, hasPermission } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    // Autenticación y autorización
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const canView = await hasPermission(session.user, "lemonway_imports", "read")
    if (!canView) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }

    // Obtener parámetros de query
    const { searchParams } = new URL(request.url)
    const importRunId = searchParams.get("importRunId")
    const accountId = searchParams.get("accountId")
    const hasError = searchParams.get("hasError")
    const limit = Number.parseInt(searchParams.get("limit") || "100")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    // Construir condiciones WHERE dinámicamente
    const conditions = []
    if (importRunId) conditions.push(`mc.import_run_id = '${importRunId}'`)
    if (accountId) conditions.push(`mc.lemonway_account_id = '${accountId}'`)
    if (hasError === "true") conditions.push(`mc.error_message IS NOT NULL`)
    else if (hasError === "false") conditions.push(`mc.error_message IS NULL`)

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

    // Query con template literals
    const movimientos = await sql`
      SELECT 
        mc.*,
        cv.lemonway_account_id,
        cv.nombre as cuenta_nombre,
        cv.tipo as cuenta_tipo,
        to_.codigo as tipo_operacion_codigo,
        to_.nombre as tipo_operacion_nombre
      FROM lemonway_temp.movimientos_cuenta mc
      LEFT JOIN lemonway_temp.cuentas_virtuales cv ON mc.cuenta_virtual_id = cv.id
      LEFT JOIN lemonway_temp.tipos_operacion_contable to_ ON mc.tipo_operacion_id = to_.id
      ${sql.unsafe(whereClause)}
      ORDER BY mc.fecha_operacion DESC, mc.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    // Contar total
    const countResult = await sql`
      SELECT COUNT(*) as total 
      FROM lemonway_temp.movimientos_cuenta mc
      ${sql.unsafe(whereClause)}
    `
    const total = Number.parseInt(countResult[0]?.total || "0")

    return NextResponse.json({
      movimientos: Array.isArray(movimientos) ? movimientos : [],
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    })
  } catch (error) {
    console.error("[v0] Error fetching movimientos:", error)
    return NextResponse.json({ error: "Error al obtener movimientos" }, { status: 500 })
  }
}
