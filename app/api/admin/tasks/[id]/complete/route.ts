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
    const { notas, desbloquear_cuenta } = body

    if (!notas || notas.trim() === "") {
      return NextResponse.json({ error: "Las notas son obligatorias al completar una tarea" }, { status: 400 })
    }

    // Get task details
    const taskQuery = `
      SELECT * FROM tasks.tasks WHERE id = $1
    `
    const taskResult = await sql.query(taskQuery, [id])

    if ((taskResult?.rows?.length || 0) === 0) {
      return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 })
    }

    const task = taskResult.rows[0]

    // Complete task
    const completeQuery = `
      UPDATE tasks.tasks
      SET 
        estado = 'COMPLETADA',
        fecha_completada = NOW(),
        notas = $1
      WHERE id = $2
      RETURNING *
    `

    const result = await sql.query(completeQuery, [notas, id])

    // If desbloquear_cuenta and task has cuenta_virtual_id, unblock it
    if (desbloquear_cuenta && task.cuenta_virtual_id) {
      // Check permission
      const permissionQuery = `
        SELECT EXISTS (
          SELECT 1 FROM public."RolePermission" rp
          JOIN public."UserRole" ur ON rp."roleId" = ur."roleId"
          JOIN public."Permission" p ON rp."permissionId" = p.id
          WHERE ur."userId" = $1 
            AND p.resource = 'VIRTUAL_ACCOUNTS' 
            AND p.action = 'UNBLOCK'
        ) as has_permission
      `
      const permCheck = await sql.query(permissionQuery, [session.user.email])

      if (permCheck?.rows?.[0]?.has_permission) {
        await sql.query(
          `UPDATE virtual_accounts.cuentas_virtuales 
           SET vinculacion_bloqueada = false 
           WHERE id = $1`,
          [task.cuenta_virtual_id],
        )
      }
    }

    await logSqlQuery(completeQuery, "tasks.tasks", "UPDATE", session.user.email, {
      task_id: id,
      completed: true,
      desbloquear_cuenta,
    })

    return NextResponse.json(result.rows[0])
  } catch (error: any) {
    console.error("Error completing task:", error)
    return NextResponse.json({ error: "Error al completar tarea", details: error.message }, { status: 500 })
  }
}
