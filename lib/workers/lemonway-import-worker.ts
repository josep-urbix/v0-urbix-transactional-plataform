import { LemonwayImportsRepository } from "@/lib/repositories/lemonway-imports-repository"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export class LemonwayImportWorker {
  /**
   * Process a pending import run by enqueueing it in LemonwayApiCallLog
   * The retry queue will then call Lemonway's /accounts/{accountId}/transactions/ endpoint
   */
  static async processImportRun(runId: string): Promise<{
    success: boolean
    enqueuedForProcessing: boolean
    error?: string
  }> {
    console.log(`[v0] [LemonwayImportWorker] Starting import run ${runId}`)

    try {
      // Get import run
      const run = await LemonwayImportsRepository.getRunById(runId)
      if (!run) {
        throw new Error(`Import run ${runId} not found`)
      }

      if (run.status !== "pending") {
        throw new Error(`Import run ${runId} is not in pending status (current: ${run.status})`)
      }

      console.log(
        `[v0] Enqueueing import run ${runId} - account: ${run.account_id}, startDate: ${run.start_date}, endDate: ${run.end_date}`,
      )

      await LemonwayImportsRepository.updateRun(runId, { status: "processing" })

      const accountId = run.lemonwayAccountId
      const lemonwayEndpoint = `/accounts/${accountId}/transactions/`

      // accountId ya está en la URL, no debe ir en query params
      const startTimestamp = run.startDate ? Math.floor(run.startDate.getTime() / 1000).toString() : undefined
      const endTimestamp = run.endDate ? Math.floor(run.endDate.getTime() / 1000).toString() : undefined

      const payload = {
        startDate: startTimestamp,
        endDate: endTimestamp,
        importRunId: runId,
      }

      console.log(`[v0] Enqueueing Lemonway call: ${lemonwayEndpoint} with params:`, payload)

      const payloadJson = JSON.stringify(payload)
      const nextRetryAt = new Date(Date.now() + 60 * 1000)

      const result = await sql`
        INSERT INTO "LemonwayApiCallLog" (
          endpoint,
          method,
          request_payload,
          retry_status,
          retry_count,
          next_retry_at,
          manual_retry_needed,
          final_failure,
          success,
          created_at
        ) VALUES (
          ${lemonwayEndpoint},
          'GET',
          ${payloadJson},
          'pending',
          0,
          ${nextRetryAt.toISOString()},
          false,
          false,
          false,
          NOW()
        )
        RETURNING id
      `

      const logId = result[0].id

      await sql`
        UPDATE "LemonwayApiCallLog"
        SET request_id = ${logId.toString()}
        WHERE id = ${logId}
      `

      console.log(`[v0] Enqueued Lemonway call for import run ${runId} with log ID ${logId}`)

      return {
        success: true,
        enqueuedForProcessing: true,
      }
    } catch (error: any) {
      console.error(`[v0] [LemonwayImportWorker] Error processing import run ${runId}:`, error)

      await LemonwayImportsRepository.updateRun(runId, {
        status: "failed",
        errorMessage: error.message,
        completedAt: new Date(),
      })

      return {
        success: false,
        enqueuedForProcessing: false,
        error: error.message,
      }
    }
  }

  /**
   * Process all pending import runs by enqueueing them
   */
  static async processPendingRuns(): Promise<{
    processed: number
    succeeded: number
    failed: number
  }> {
    console.log("[LemonwayImportWorker] Processing pending import runs")

    const pendingRuns = await LemonwayImportsRepository.listRuns({
      status: "pending",
      limit: 10,
    })

    console.log(`[LemonwayImportWorker] Found ${pendingRuns.length} pending runs`)

    let succeeded = 0
    let failed = 0

    for (const run of pendingRuns) {
      const result = await this.processImportRun(run.id)
      if (result.success) {
        succeeded++
      } else {
        failed++
      }
    }

    console.log(`[LemonwayImportWorker] Completed: ${succeeded} succeeded, ${failed} failed`)

    return {
      processed: pendingRuns.length,
      succeeded,
      failed,
    }
  }
}

export async function processLemonwayImports() {
  return await LemonwayImportWorker.processPendingRuns()
}
