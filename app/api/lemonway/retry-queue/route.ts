import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { LemonwayClient } from "@/lib/lemonway-client"

export async function POST() {
  try {
    await sql`
      UPDATE "LemonwayApiCallLog"
      SET retry_status = 'pending'
      WHERE retry_status = 'processing'
        AND created_at < NOW() - INTERVAL '5 minutes'
    `

    const pendingRetries = await sql`
      SELECT id, endpoint, method, request_payload, created_at, retry_count
      FROM "LemonwayApiCallLog"
      WHERE retry_status = 'pending'
        AND (retry_count IS NULL OR retry_count < 3)
        AND created_at > NOW() - INTERVAL '24 hours'
      ORDER BY created_at ASC
      LIMIT 10
    `

    for (const log of pendingRetries) {
      await sql`
        UPDATE "LemonwayApiCallLog"
        SET retry_status = 'processing'
        WHERE id = ${log.id}
      `
    }

    const results = []

    const config = await LemonwayClient.getConfig()
    if (!config) {
      throw new Error("No se encontró configuración de Lemonway")
    }

    const client = new LemonwayClient(config)

    for (const log of pendingRetries) {
      try {
        console.log(`[v0] [Retry Queue] Procesando log ${log.id}, endpoint: ${log.endpoint}`)

        // Este método maneja todo: Bearer token, fetch a Lemonway, actualización del log
        const result = await client.executeAndUpdateLog(
          log.id,
          log.endpoint,
          log.method || "GET",
          log.request_payload, // Para GET, este método los convertirá en query params
        )

        if (result.success) {
          results.push({
            logId: log.id,
            success: true,
            message: "Procesado exitosamente",
            responseStatus: result.responseStatus,
          })
          console.log(`[v0] [Retry Queue] Log ${log.id} procesado: ÉXITO`)
        } else {
          results.push({
            logId: log.id,
            success: false,
            message: result.errorMessage || "Error desconocido",
            responseStatus: result.responseStatus,
          })
          console.log(`[v0] [Retry Queue] Log ${log.id} procesado: FALLO - ${result.errorMessage}`)
        }
      } catch (error: any) {
        console.error(`[v0] [Retry Queue] Error procesando log ${log.id}:`, error)

        const newRetryCount = (log.retry_count || 0) + 1
        const errorMessage = error.message || "Error de conexión"

        await sql`
          UPDATE "LemonwayApiCallLog"
          SET retry_count = ${newRetryCount},
              error_message = ${errorMessage},
              retry_status = ${newRetryCount >= 3 ? "failed" : "pending"},
              final_failure = ${newRetryCount >= 3}
          WHERE id = ${log.id}
        `

        results.push({ logId: log.id, success: false, message: errorMessage, retryCount: newRetryCount })
      }
    }

    const successCount = results.filter((r) => r.success).length
    const failedCount = results.filter((r) => !r.success).length

    console.log(
      `[v0] [Retry Queue] Resumen: ${successCount} exitosos, ${failedCount} fallidos de ${results.length} logs`,
    )

    return NextResponse.json({
      processed: results.length,
      success: successCount,
      failed: failedCount,
      requeued: 0,
      results,
      message: `Procesadas ${results.length} transacciones: ${successCount} exitosas, ${failedCount} fallidas`,
    })
  } catch (error: any) {
    console.error("[v0] [Retry Queue] Error processing retry queue:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const stats = await sql`
      SELECT 
        COUNT(CASE WHEN retry_status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN success = true THEN 1 END) as success_count,
        COUNT(CASE WHEN retry_status = 'processing' THEN 1 END) as processing_count
      FROM "LemonwayApiCallLog"
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `

    return NextResponse.json(stats[0])
  } catch (error: any) {
    console.error("[v0] [Retry Queue] Error getting queue stats:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
