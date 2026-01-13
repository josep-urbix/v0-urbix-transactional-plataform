import { NextResponse } from "next/server"
import { requireAuth, getSession } from "@/lib/auth"
import { sql } from "@/lib/db"
import { canProcessRequest } from "@/lib/lemonway-deduplication"

export async function POST(request: Request) {
  try {
    console.log("[Sync Range] POST request received")

    const session = await getSession()
    await requireAuth()

    console.log("[Sync Range] Auth passed")

    const body = await request.json()
    const { startId, endId } = body

    console.log("[Sync Range] Body parsed:", { startId, endId })

    if (!startId || !endId) {
      return NextResponse.json({ error: "Both startId and endId are required" }, { status: 400 })
    }

    const start = Number.parseInt(startId)
    const end = Number.parseInt(endId)

    if (isNaN(start) || isNaN(end)) {
      return NextResponse.json({ error: "startId and endId must be valid numbers" }, { status: 400 })
    }

    if (start > end) {
      return NextResponse.json({ error: "startId must be less than or equal to endId" }, { status: 400 })
    }

    if (end - start > 100) {
      return NextResponse.json({ error: "Maximum range is 100 accounts" }, { status: 400 })
    }

    console.log("[Sync Range] Fetching config...")

    const configResult = await sql`
      SELECT min_delay_between_requests_ms 
      FROM "LemonwayConfig" 
      LIMIT 1
    `
    const delayMs = configResult[0]?.min_delay_between_requests_ms || 1000

    console.log("[Sync Range] Config fetched, delayMs:", delayMs)

    const totalAccounts = end - start + 1
    let enqueued = 0
    let skipped = 0
    const skippedAccounts: { accountId: number; reason: string }[] = []
    const now = Date.now()

    console.log("[Sync Range] Starting to enqueue", totalAccounts, "accounts")

    for (let accountId = start; accountId <= end; accountId++) {
      const dedupeCheck = await canProcessRequest(String(accountId), "/accounts/retrieve")

      if (!dedupeCheck.canProceed) {
        console.log(`[Sync Range] SKIPPED account ${accountId}: ${dedupeCheck.reason}`)
        skipped++
        skippedAccounts.push({ accountId, reason: dedupeCheck.reason! })
        continue
      }

      const queuePosition = enqueued
      const nextRetryAt = new Date(now + queuePosition * delayMs)

      console.log(
        `[Sync Range] Enqueuing account ${accountId}, position ${queuePosition}, nextRetryAt: ${nextRetryAt.toISOString()}`,
      )

      const result = await sql`
        INSERT INTO "LemonwayApiCallLog" (
          method,
          endpoint,
          request_payload,
          retry_status,
          retry_count,
          next_retry_at,
          manual_retry_needed,
          final_failure,
          created_at
        ) VALUES (
          'POST',
          '/accounts/retrieve',
          ${JSON.stringify({ accounts: [{ accountid: String(accountId), email: "" }] })},
          'limit_pending',
          0,
          ${nextRetryAt.toISOString()},
          false,
          false,
          NOW()
        )
        RETURNING id
      `

      const insertedId = result[0].id
      await sql`
        UPDATE "LemonwayApiCallLog"
        SET request_id = ${String(insertedId)}
        WHERE id = ${insertedId}
      `

      enqueued++
      console.log(`[Sync Range] Account ${accountId} enqueued successfully with Request ID: ${insertedId}`)
    }

    console.log(`[Sync Range] Enqueued ${enqueued} accounts, skipped ${skipped}`)

    return NextResponse.json({
      success: true,
      message: `${enqueued} cuentas encoladas para sincronización${skipped > 0 ? `, ${skipped} omitidas por deduplicación` : ""}. Se procesarán automáticamente respetando el rate limit.`,
      enqueued,
      skipped,
      skippedAccounts: skippedAccounts.length > 0 ? skippedAccounts : undefined,
      totalAccounts,
    })
  } catch (error: any) {
    console.error("[Sync Range] Error enqueuing accounts:", error)
    console.error("[Sync Range] Error stack:", error.stack)
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 })
  }
}
