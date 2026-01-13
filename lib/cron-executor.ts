// Ejecutor de tareas CRON internas
import { sql } from "@/lib/db"

export async function executeCronJob(jobName: string) {
  const startTime = Date.now()
  let executionStatus = "success"
  let executionError: string | null = null
  let resultData: any = null

  try {
    // Obtener el cron job
    const jobs = await sql`
      SELECT id FROM "CronJob" 
      WHERE name = ${jobName} AND is_active = true
    `

    if (!jobs.length) {
      throw new Error(`Cron job no encontrado: ${jobName}`)
    }

    const jobId = jobs[0].id

    // Ejecutar la acción específica del cron job
    if (jobName === "Procesar Movimientos Aprobados de Lemonway") {
      const { LemonwayProcessingWorker } = await import("@/lib/workers/lemonway-processing-worker")
      const result = await LemonwayProcessingWorker.processApprovedMovements(false)
      resultData = result
    } else {
      throw new Error(`Cron job no implementado: ${jobName}`)
    }

    // Registrar ejecución exitosa
    const duration = Date.now() - startTime
    await sql`
      INSERT INTO "CronJobExecution" (cron_job_id, started_at, finished_at, duration_ms, status, result_data)
      VALUES (${jobId}, NOW(), NOW(), ${duration}, 'success', ${JSON.stringify(resultData)})
    `

    // Actualizar estadísticas del cron job
    await sql`
      UPDATE "CronJob"
      SET 
        last_run_at = NOW(),
        last_run_status = 'success',
        last_run_duration_ms = ${duration},
        successful_runs = successful_runs + 1,
        total_runs = total_runs + 1,
        updated_at = NOW()
      WHERE id = ${jobId}
    `

    return { success: true, duration, resultData }
  } catch (error: any) {
    executionError = error.message
    executionStatus = "error"

    // Registrar ejecución fallida
    const duration = Date.now() - startTime
    const jobs = await sql`SELECT id FROM "CronJob" WHERE name = ${jobName}`

    if (jobs.length) {
      const jobId = jobs[0].id
      await sql`
        INSERT INTO "CronJobExecution" (cron_job_id, started_at, finished_at, duration_ms, status, error_message)
        VALUES (${jobId}, NOW(), NOW(), ${duration}, 'error', ${executionError})
      `

      // Actualizar estadísticas del cron job
      await sql`
        UPDATE "CronJob"
        SET 
          last_run_at = NOW(),
          last_run_status = 'error',
          last_run_duration_ms = ${duration},
          last_run_error = ${executionError},
          failed_runs = failed_runs + 1,
          total_runs = total_runs + 1,
          updated_at = NOW()
        WHERE id = ${jobId}
      `
    }

    throw error
  }
}
