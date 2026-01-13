import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"
import { logSqlQuery } from "@/lib/sql-logger"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = params
    const body = await request.json()
    const { asignado_a } = body

    if (!asignado_a) {
      return NextResponse.json({ error: "El campo asignado_a es requerido" }, { status: 400 })
    }

    // Verify user exists
    const userCheck = await sql.query(`SELECT id FROM public."User" WHERE id = $1`, [asignado_a])

    if ((userCheck?.rows?.length || 0) === 0) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    const query = `
      UPDATE tasks.tasks
      SET 
        asignado_a = $1,
        fecha_asignacion = NOW(),
        estado = CASE 
          WHEN estado = 'PENDIENTE' THEN 'EN_PROGRESO'
          ELSE estado
        END
      WHERE id = $2
      RETURNING *
    `

    const result = await sql.query(query, [asignado_a, id])

    if ((result?.rows?.length || 0) === 0) {
      return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 })
    }

    await logSqlQuery(query, "tasks.tasks", "UPDATE", session.user.email, { task_id: id, asignado_a })

    return NextResponse.json(result.rows[0])
  } catch (error: any) {
    console.error("Error assigning task:", error)
    return NextResponse.json({ error: "Error al asignar tarea", details: error.message }, { status: 500 })
  }
}
