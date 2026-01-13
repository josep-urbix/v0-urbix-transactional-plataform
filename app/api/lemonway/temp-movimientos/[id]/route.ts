import { type NextRequest, NextResponse } from "next/server"
import { getSession, hasPermission } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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

    const id = params.id

    // Obtener movimiento con todos los detalles
    const movimientos = await sql`
      SELECT 
        mc.*,
        cv.numero_cuenta,
        cv.nombre_cuenta,
        cv.lemonway_account_id,
        to_.codigo as tipo_operacion_codigo,
        to_.descripcion as tipo_operacion_descripcion,
        ir.status as import_run_status,
        ir.created_at as import_run_created_at
      FROM lemonway_temp.movimientos_cuenta mc
      LEFT JOIN lemonway_temp.cuentas_virtuales cv ON mc.cuenta_virtual_id = cv.id
      LEFT JOIN lemonway_temp.tipos_operacion_contable to_ ON mc.tipo_operacion_id = to_.id
      LEFT JOIN lemonway_temp.import_runs ir ON mc.import_run_id = ir.id
      WHERE mc.id = ${id}
    `

    if (!movimientos || movimientos.length === 0) {
      return NextResponse.json({ error: "Movimiento no encontrado" }, { status: 404 })
    }

    return NextResponse.json(movimientos[0])
  } catch (error) {
    console.error("[v0] Error fetching movimiento:", error)
    return NextResponse.json({ error: "Error al obtener movimiento" }, { status: 500 })
  }
}
