import { LemonwayProcessingWorker } from "@/lib/workers/lemonway-processing-worker"
import { verifyWebhookSignature } from "@/lib/auth/webhook-verification"
import { sql } from "@vercel/postgres"

export async function POST(req: Request) {
  try {
    // Verificar CRON_SECRET
    const signature = req.headers.get("x-cron-signature")
    const cronSecret = process.env.CRON_SECRET

    if (!signature || !cronSecret || !verifyWebhookSignature(signature, cronSecret)) {
      console.log("[v0] [CRON] Unauthorized request - invalid signature")
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] [CRON] process-approved-movements triggered")

    const startTime = Date.now()

    const result = await LemonwayProcessingWorker.processApprovedMovements(false)

    const duration = Date.now() - startTime
    console.log(`[v0] [CRON] Completed in ${duration}ms - Processed: ${result.processed}, Errors: ${result.errors}`)

    try {
      await sql`
        INSERT INTO public."CronJobExecution" 
        (cron_job_id, status, started_at, finished_at, duration_ms, result_data)
        SELECT 
          id, 
          'success',
          NOW() - INTERVAL '${duration}ms',
          NOW(),
          ${duration},
          $1::jsonb
        FROM public."CronJob"
        WHERE name = 'process-approved-movements'
      `
    } catch (auditError) {
      console.error("[v0] [CRON] Error recording execution:", auditError)
    }

    return Response.json({
      success: result.success,
      processed: result.processed,
      errors: result.errors,
      durationMs: duration,
    })
  } catch (error: any) {
    console.error("[v0] [CRON] Fatal error:", error.message)
    return Response.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
