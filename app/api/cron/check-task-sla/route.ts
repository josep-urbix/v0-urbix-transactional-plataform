import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { startCronExecution, endCronExecution } from "@/lib/cron-logger"

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const executionId = await startCronExecution("check-task-sla")

  try {
    const escalations: any[] = []

    // Buscar tareas que han excedido su SLA
    const overdueTasksResult = await sql`
      SELECT 
        t.id,
        t.tipo,
        t.prioridad,
        t.titulo,
        t.asignado_a,
        t.fecha_vencimiento,
        t.fecha_creacion,
        u.email as asignado_email,
        EXTRACT(EPOCH FROM (NOW() - t.fecha_vencimiento))/3600 as horas_vencida
      FROM tasks.tasks t
      LEFT JOIN public."User" u ON u.id = t.asignado_a
      WHERE t.estado IN ('PENDIENTE', 'EN_PROGRESO')
      AND t.fecha_vencimiento < NOW()
      AND NOT EXISTS (
        SELECT 1 FROM tasks.task_escalations te
        WHERE te.task_id = t.id
        AND te.escalado_a IS NOT NULL
        AND te.created_at > NOW() - INTERVAL '24 hours'
      )
    `

    const overdueTasks = overdueTasksResult as any[]

    for (const task of overdueTasks) {
      // Obtener supervisor
      const supervisors = await sql`
        SELECT u.id, u.email
        FROM public."User" u
        WHERE u.is_supervisor = true
        AND u.id != ${task.asignado_a || "NULL"}
        ORDER BY RANDOM()
        LIMIT 1
      `

      if (supervisors.length > 0) {
        const supervisor = supervisors[0]

        await sql`
          INSERT INTO tasks.task_escalations (
            task_id, escalado_desde, escalado_a, motivo
          )
          VALUES (
            ${task.id},
            ${task.asignado_a},
            ${supervisor.id},
            ${`Tarea vencida hace ${Math.round(task.horas_vencida)} horas`}
          )
        `

        // Reasignar al supervisor
        await sql`
          UPDATE tasks.tasks
          SET asignado_a = ${supervisor.id}, updated_at = NOW()
          WHERE id = ${task.id}
        `

        // TODO: Enviar notificación email al supervisor
        // await sendEmail(supervisor.email, 'Tarea escalada', ...)

        escalations.push({
          task_id: task.id,
          task_title: task.titulo,
          escalated_to: supervisor.email,
          hours_overdue: Math.round(task.horas_vencida),
        })
      }
    }

    // Buscar tareas CRITICAS sin asignar por más de 1 hora
    const unassignedCritical = await sql`
      SELECT t.id, t.titulo, t.fecha_creacion
      FROM tasks.tasks t
      WHERE t.estado = 'PENDIENTE'
      AND t.prioridad = 'CRITICA'
      AND t.asignado_a IS NULL
      AND t.fecha_creacion < NOW() - INTERVAL '1 hour'
    `

    for (const task of unassignedCritical) {
      // Asignar a un supervisor
      const supervisors = await sql`
        SELECT u.id, u.email
        FROM public."User" u
        WHERE u.is_supervisor = true
        ORDER BY RANDOM()
        LIMIT 1
      `

      if (supervisors.length > 0) {
        const supervisor = supervisors[0]

        await sql`
          UPDATE tasks.tasks
          SET asignado_a = ${supervisor.id}, fecha_asignacion = NOW(), updated_at = NOW()
          WHERE id = ${task.id}
        `

        // TODO: Enviar notificación email

        escalations.push({
          task_id: task.id,
          task_title: task.titulo,
          reason: "CRITICA sin asignar por 1+ hora",
          assigned_to: supervisor.email,
        })
      }
    }

    await endCronExecution(executionId, "success", {
      escalations_made: escalations.length,
      overdue_tasks: overdueTasks.length,
      unassigned_critical: unassignedCritical.length,
    })

    return NextResponse.json({
      success: true,
      escalations_made: escalations.length,
      details: escalations,
    })
  } catch (error: any) {
    console.error("Error in check-task-sla cron:", error)
    await endCronExecution(executionId, "failure", { error: error.message })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
