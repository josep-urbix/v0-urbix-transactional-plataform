import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"
import { logSqlQuery } from "@/lib/sql-logger"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Total tasks by status
    const statusQuery = `
      SELECT estado, COUNT(*) as count
      FROM tasks.tasks
      GROUP BY estado
    `
    const statusStats = await sql.query(statusQuery, [])

    // Tasks by priority
    const priorityQuery = `
      SELECT prioridad, COUNT(*) as count
      FROM tasks.tasks
      WHERE estado != 'COMPLETADA' AND estado != 'CANCELADA'
      GROUP BY prioridad
    `
    const priorityStats = await sql.query(priorityQuery, [])

    // Critical unassigned
    const criticalQuery = `
      SELECT COUNT(*) as count
      FROM tasks.tasks
      WHERE prioridad = 'CRITICA' 
        AND estado = 'PENDIENTE'
        AND asignado_a IS NULL
    `
    const criticalUnassigned = await sql.query(criticalQuery, [])

    // Average resolution time by type
    const resolutionQuery = `
      SELECT 
        tipo,
        AVG(EXTRACT(EPOCH FROM (fecha_completada - fecha_creacion))/3600) as avg_hours
      FROM tasks.tasks
      WHERE fecha_completada IS NOT NULL
      GROUP BY tipo
    `
    const resolutionStats = await sql.query(resolutionQuery, [])

    // Overdue tasks
    const overdueQuery = `
      SELECT COUNT(*) as count
      FROM tasks.tasks
      WHERE fecha_vencimiento < NOW()
        AND estado != 'COMPLETADA'
        AND estado != 'CANCELADA'
    `
    const overdueCount = await sql.query(overdueQuery, [])

    // Top users by completed tasks
    const topUsersQuery = `
      SELECT 
        u.name,
        u.email,
        COUNT(t.id) as completed_count
      FROM tasks.tasks t
      JOIN public."User" u ON t.asignado_a = u.id
      WHERE t.estado = 'COMPLETADA'
        AND t.fecha_completada >= NOW() - INTERVAL '30 days'
      GROUP BY u.name, u.email
      ORDER BY completed_count DESC
      LIMIT 10
    `
    const topUsers = await sql.query(topUsersQuery, [])

    await logSqlQuery("Multiple stats queries", "tasks.tasks", "SELECT", session.user.email, { type: "stats" })

    return NextResponse.json({
      by_status: statusStats?.rows || [],
      by_priority: priorityStats?.rows || [],
      critical_unassigned: criticalUnassigned?.rows?.[0]?.count || 0,
      avg_resolution_time: resolutionStats?.rows || [],
      overdue_count: overdueCount?.rows?.[0]?.count || 0,
      top_users: topUsers?.rows || [],
    })
  } catch (error: any) {
    console.error("Error fetching task stats:", error)
    return NextResponse.json({ error: "Error al obtener estadísticas", details: error.message }, { status: 500 })
  }
}
