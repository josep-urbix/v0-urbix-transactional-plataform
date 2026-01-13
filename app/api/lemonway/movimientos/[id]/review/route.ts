import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

interface ReviewRequest {
  action: "approve" | "reject" | "edit"
  motivo_rechazo?: string
  campos_editados?: Record<string, any>
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth()
    const user = await requireAuth()
    const body: ReviewRequest = await request.json()
    const { id } = params

    if (body.action === "approve") {
      // Aprobar movimiento
      await sql`
        UPDATE lemonway_temp.movimientos_cuenta 
        SET 
          estado_revision = 'aprobado',
          revisado_por = ${user.email},
          revisado_at = NOW()
        WHERE id = ${id}
      `

      return NextResponse.json({
        success: true,
        message: "Movimiento aprobado",
      })
    } else if (body.action === "reject") {
      // Rechazar movimiento
      await sql`
        UPDATE lemonway_temp.movimientos_cuenta 
        SET 
          estado_revision = 'rechazado',
          revisado_por = ${user.email},
          revisado_at = NOW(),
          motivo_rechazo = ${body.motivo_rechazo || ""}
        WHERE id = ${id}
      `

      return NextResponse.json({
        success: true,
        message: "Movimiento rechazado",
      })
    } else if (body.action === "edit") {
      // Editar campos del movimiento
      const updates: Record<string, any> = {}
      const allowedFields = [
        "monto",
        "commission",
        "descripcion",
        "comentario",
        "referencia_externa",
        "tipo_transaccion",
      ]

      for (const [key, value] of Object.entries(body.campos_editados || {})) {
        if (allowedFields.includes(key)) {
          updates[key] = value
        }
      }

      if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: "No hay campos válidos para editar" }, { status: 400 })
      }

      // Construir UPDATE dinámicamente
      let updateQuery = `UPDATE lemonway_temp.movimientos_cuenta SET `
      const setClauses = Object.entries(updates)
        .map(([key, value]) => `${key} = '${value}'`)
        .join(", ")
      updateQuery += setClauses + ` WHERE id = '${id}'`

      await sql.query(updateQuery)

      return NextResponse.json({
        success: true,
        message: "Movimiento editado",
      })
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 })
  } catch (error) {
    console.error("Error en revisión de movimiento:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error desconocido" }, { status: 500 })
  }
}
