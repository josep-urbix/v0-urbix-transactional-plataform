import { sql } from "@/lib/db"

export async function startCronExecution(jobName: string): Promise<number | null> {
  try {
    // Buscar el job por nombre
    const job = await sql`
      SELECT id FROM "CronJob"
      WHERE name = ${jobName}
      LIMIT 1
    `

    if (job.length === 0) {
      console.error(`[CronLogger] Job "${jobName}" not found in database`)
      return null
    }

    const jobId = job[0].id
    const now = new Date().toISOString()

    // Crear registro de ejecución
    const execution = await sql`
      INSERT INTO "CronJobExecution" (
        cron_job_id,
        status,
        started_at,
        created_at
      )
      VALUES (${jobId}, 'running', ${now}, ${now})
      RETURNING id
    `

    return execution[0].id
  } catch (error) {
    console.error("[CronLogger] Error starting execution:", error)
    return null
  }
}

export async function endCronExecution(
  executionId: number | null,
  status: "success" | "failed",
  resultData?: Record<string, unknown>,
  error?: Error,
): Promise<void> {
  if (!executionId) return

  try {
    const executionData = await sql`
      SELECT started_at, cron_job_id 
      FROM "CronJobExecution"
      WHERE id = ${executionId}
    `

    if (executionData.length === 0) {
      console.error(`[CronLogger] Execution ${executionId} not found`)
      return
    }

    const startedAt = new Date(executionData[0].started_at)
    const finishedAt = new Date()
    const durationMs = finishedAt.getTime() - startedAt.getTime()
    const cronJobId = executionData[0].cron_job_id

    let resultJson: Record<string, unknown> | null = null
    if (resultData) {
      resultJson = resultData
    }

    let errorMsg = error?.message || null
    if (errorMsg && errorMsg.length > 500) {
      errorMsg = errorMsg.substring(0, 500)
    }

    if (resultJson) {
      await sql`
        UPDATE "CronJobExecution"
        SET 
          finished_at = ${finishedAt.toISOString()},
          duration_ms = ${durationMs},
          status = ${status},
          result_data = ${JSON.stringify(resultJson)}::jsonb,
          error_message = ${errorMsg},
          error_stack = ${error?.stack ? error.stack.substring(0, 1000) : null}
        WHERE id = ${executionId}
      `
    } else {
      await sql`
        UPDATE "CronJobExecution"
        SET 
          finished_at = ${finishedAt.toISOString()},
          duration_ms = ${durationMs},
          status = ${status},
          error_message = ${errorMsg},
          error_stack = ${error?.stack ? error.stack.substring(0, 1000) : null}
        WHERE id = ${executionId}
      `
    }

    // Actualizar estadísticas del job
    await sql`
      UPDATE "CronJob"
      SET 
        last_run_at = ${finishedAt.toISOString()},
        last_run_status = ${status},
        last_run_duration_ms = ${durationMs},
        last_run_error = ${errorMsg},
        total_runs = COALESCE(total_runs, 0) + 1,
        successful_runs = COALESCE(successful_runs, 0) + ${status === "success" ? 1 : 0},
        failed_runs = COALESCE(failed_runs, 0) + ${status === "failed" ? 1 : 0},
        updated_at = ${finishedAt.toISOString()}
      WHERE id = ${cronJobId}
    `
  } catch (err: any) {
    console.error("[CronLogger] Error ending execution:", err?.message)
  }
}

export async function logCronExecution(
  jobName: string,
  status: "started" | "completed" | "failed",
  data?: Record<string, unknown> | null,
): Promise<void> {
  if (status === "started") {
    const executionId = await startCronExecution(jobName)
    // Store executionId in memory for completion (simplified approach)
    if (executionId) {
      ;(global as any).__cronExecutionId = executionId
    }
  } else {
    const executionId = (global as any).__cronExecutionId
    if (executionId) {
      await endCronExecution(
        executionId,
        status === "completed" ? "success" : "failed",
        data || undefined,
        status === "failed" ? new Error(data?.error as string) : undefined,
      )
      delete (global as any).__cronExecutionId
    }
  }
}
