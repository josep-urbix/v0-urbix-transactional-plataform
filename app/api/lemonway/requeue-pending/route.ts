import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { sql } from "@/lib/db"
import { retryFailedCall } from "@/lib/lemonway-client"

export async function POST(request: Request) {
  try {
    await requireAuth()

    // Obtener configuración de rate limit
    const configResult = await sql`
      SELECT min_delay_between_requests_ms 
      FROM "LemonwayConfig" 
      LIMIT 1
    `
    const delayMs = configResult[0]?.min_delay_between_requests_ms || 1000

    const pendingTransactions = await sql`
      SELECT id, request_id, retry_count, retry_status, response_status
      FROM "LemonwayApiCallLog"
      WHERE (
        -- Transacciones en cola o pendientes
        (retry_status IN ('limit_pending', 'pending') AND (final_failure = false OR final_failure IS NULL))
        OR
        -- Transacciones que fallaron (503, 520) pero no se marcaron correctamente
        (response_status IN (503, 520, 429) AND success IS NULL AND (final_failure = false OR final_failure IS NULL))
      )
      ORDER BY id ASC
    `

    if (pendingTransactions.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No hay transacciones pendientes para reencolar",
        requeued: 0,
        processed: 0,
      })
    }

    console.log(`[Requeue] Found ${pendingTransactions.length} pending transactions to process`)

    const results = {
      requeued: 0,
      processed: 0,
      success: 0,
      failed: 0,
      errors: [] as string[],
    }

    for (let i = 0; i < pendingTransactions.length; i++) {
      const tx = pendingTransactions[i]

      // Esperar el delay del rate limit entre peticiones
      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }

      console.log(`[Requeue] Processing transaction ${tx.id} (${i + 1}/${pendingTransactions.length})`)

      try {
        // Llamar directamente a retryFailedCall para procesar la transacción
        const result = await retryFailedCall(tx.id)
        results.processed++

        if (result.success) {
          results.success++
          console.log(`[Requeue] Transaction ${tx.id} processed successfully`)
        } else {
          results.failed++
          console.log(`[Requeue] Transaction ${tx.id} failed: ${result.message}`)
        }
      } catch (error: any) {
        results.errors.push(`TX ${tx.id}: ${error.message}`)
        console.error(`[Requeue] Error processing transaction ${tx.id}:`, error.message)

        // Si hay un error, marcar para reintento posterior
        const nextRetryAt = new Date(Date.now() + delayMs * (i + 1))
        await sql`
          UPDATE "LemonwayApiCallLog"
          SET next_retry_at = ${nextRetryAt.toISOString()},
              retry_status = 'pending'
          WHERE id = ${tx.id}
        `
        results.requeued++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Procesadas ${results.processed} transacciones: ${results.success} exitosas, ${results.failed} fallidas`,
      ...results,
    })
  } catch (error: any) {
    console.error("[Requeue Pending] Error:", error)
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 })
  }
}
