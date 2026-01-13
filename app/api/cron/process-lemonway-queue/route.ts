import { NextResponse } from "next/server"
import { queueProcessor } from "@/lib/lemonway-queue-processor"

/**
 * Cron job para procesar cola dual FIFO cada 30 segundos
 * GET /api/cron/process-lemonway-queue
 */
export async function GET(request: Request) {
  try {
    // Validar token de cron
    const cronSecret = process.env.CRON_SECRET
    const authHeader = request.headers.get("authorization")

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Starting queue processor cron job")

    // Procesar reintentos primero
    await queueProcessor.processRetries()

    // Procesar cola (URGENT primero, luego NORMAL)
    await queueProcessor.processQueue()

    // Obtener estadísticas
    const stats = await queueProcessor.getQueueStats()

    return NextResponse.json({
      success: true,
      message: "Queue processing completed",
      stats,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Queue processor cron error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Queue processing failed",
      },
      { status: 500 },
    )
  }
}
