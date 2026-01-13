import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { LemonwayProcessingWorker } from "@/lib/workers/lemonway-processing-worker"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { cronJobId } = body

    if (!cronJobId) {
      return NextResponse.json({ error: "cronJobId is required" }, { status: 400 })
    }

    const jobId = Number.parseInt(String(cronJobId), 10)
    if (isNaN(jobId)) {
      return NextResponse.json({ error: "Invalid cronJobId format" }, { status: 400 })
    }

    // Get the cron job details
    const jobs = await sql`
      SELECT * FROM "CronJob"
      WHERE id = ${jobId}
      LIMIT 1
    `

    if (jobs.length === 0) {
      return NextResponse.json({ error: "Cron job not found" }, { status: 404 })
    }

    const job = jobs[0]
    console.log(`[v0] [CronJobsAPI] Executing cron job: ${job.name} (ID: ${job.id})`)

    const startTime = new Date()

    try {
      let result: any

      // Mapear endpoints a sus workers correspondientes
      if (
        job.endpoint === "/api/cron/process-approved-movements" ||
        job.endpoint === "/api/admin/lemonway/process-movements"
      ) {
        console.log(`[v0] [CronJobsAPI] Calling LemonwayProcessingWorker directly`)
        result = await LemonwayProcessingWorker.processApprovedMovements(false)
      } else if (job.endpoint === "/api/cron/process-lemonway-imports") {
        console.log(`[v0] [CronJobsAPI] Calling processLemonwayImports directly`)
        const { processLemonwayImports } = await import("@/lib/workers/lemonway-import-worker")
        result = await processLemonwayImports()
      } else if (job.endpoint === "/api/cron/check-task-sla") {
        console.log(`[v0] [CronJobsAPI] Calling checkTaskSla directly`)
        const { GET } = await import("@/app/api/cron/check-task-sla/route")
        const mockRequest = {
          headers: {
            get: (header: string) => {
              if (header === "authorization") return `Bearer ${process.env.CRON_SECRET}`
              return null
            },
          },
        } as any
        const response = await GET(mockRequest)
        result = await response.json()
      } else if (job.endpoint === "/api/cron/retry-queue") {
        console.log(`[v0] [CronJobsAPI] Calling processRetryQueue directly`)
        const { processRetryQueue } = await import("@/lib/lemonway-client")
        result = await processRetryQueue()
      } else if (job.endpoint === "/api/cron/verify-permissions-integrity") {
        console.log(`[v0] [CronJobsAPI] Calling verifyPermissionsIntegrity directly`)
        const { GET } = await import("@/app/api/cron/verify-permissions-integrity/route")
        const mockRequest = {
          headers: {
            get: (header: string) => {
              if (header === "authorization") return `Bearer ${process.env.CRON_SECRET}`
              return null
            },
          },
        } as any
        const response = await GET(mockRequest)
        result = await response.json()
      } else if (job.endpoint === "/api/cron/verify-wallet-links") {
        console.log(`[v0] [CronJobsAPI] Calling verifyWalletLinks directly`)
        const { GET } = await import("@/app/api/cron/verify-wallet-links/route")
        const mockRequest = {
          headers: {
            get: (header: string) => {
              if (header === "authorization") return `Bearer ${process.env.CRON_SECRET}`
              return null
            },
          },
        } as any
        const response = await GET(mockRequest)
        result = await response.json()
      } else {
        return NextResponse.json({ error: `Unknown cron job endpoint: ${job.endpoint}` }, { status: 400 })
      }

      const endTime = new Date()
      const durationMs = endTime.getTime() - startTime.getTime()

      const status = result.success !== false ? "success" : "failed"
      const errorMessage = result.success === false ? result.error || result.message || "Unknown error" : null

      // Update execution record
      await sql`
        INSERT INTO "CronJobExecution" (cron_job_id, started_at, finished_at, status, duration_ms, error_message)
        VALUES (${jobId}, ${startTime.toISOString()}, ${endTime.toISOString()}, ${status}, ${durationMs}, ${errorMessage?.substring(0, 500) || null})
      `

      // Update cron job stats
      if (status === "success") {
        await sql`
          UPDATE "CronJob"
          SET last_run_at = NOW(), 
              last_run_status = ${status}, 
              last_run_error = NULL, 
              last_run_duration_ms = ${durationMs}, 
              successful_runs = successful_runs + 1, 
              total_runs = total_runs + 1, 
              updated_at = NOW()
          WHERE id = ${jobId}
        `
      } else {
        await sql`
          UPDATE "CronJob"
          SET last_run_at = NOW(), 
              last_run_status = ${status}, 
              last_run_error = ${errorMessage?.substring(0, 500) || "Unknown error"}, 
              last_run_duration_ms = ${durationMs}, 
              failed_runs = failed_runs + 1, 
              total_runs = total_runs + 1, 
              updated_at = NOW()
          WHERE id = ${jobId}
        `
      }

      console.log(
        `[v0] [CronJobsAPI] Execution completed for ${job.name}, status: ${status}, duration: ${durationMs}ms`,
      )

      return NextResponse.json({
        success: status === "success",
        duration_ms: durationMs,
        message: status === "success" ? "Cron job executed successfully" : errorMessage || "Execution failed",
      })
    } catch (execError: any) {
      const endTime = new Date()
      const durationMs = endTime.getTime() - startTime.getTime()
      const status = "failed"
      const errorMessage = execError.message || "Unknown error during execution"

      // Update execution record with error
      await sql`
        INSERT INTO "CronJobExecution" (cron_job_id, started_at, finished_at, status, duration_ms, error_message)
        VALUES (${jobId}, ${startTime.toISOString()}, ${endTime.toISOString()}, ${status}, ${durationMs}, ${errorMessage.substring(0, 500)})
      `

      // Update cron job with error
      await sql`
        UPDATE "CronJob"
        SET last_run_at = NOW(), 
            last_run_status = ${status}, 
            last_run_error = ${errorMessage.substring(0, 500)}, 
            last_run_duration_ms = ${durationMs}, 
            failed_runs = failed_runs + 1, 
            total_runs = total_runs + 1, 
            updated_at = NOW()
        WHERE id = ${jobId}
      `

      console.error(`[v0] [CronJobsAPI] Execution error for ${job.name}:`, errorMessage)
      return NextResponse.json(
        { success: false, error: errorMessage.substring(0, 500), duration_ms: durationMs },
        { status: 500 },
      )
    }
  } catch (error: any) {
    const errorMsg = error?.message || "Unknown error"
    console.error("[v0] [CronJobsAPI] Error in execute endpoint:", errorMsg)
    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}
