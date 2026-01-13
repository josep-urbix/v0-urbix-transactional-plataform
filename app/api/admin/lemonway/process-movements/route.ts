import { LemonwayProcessingWorker } from "@/lib/workers/lemonway-processing-worker"
import { requireAuth } from "@/lib/auth/session"

export async function POST(req: Request) {
  try {
    // Verificar autenticación
    await requireAuth()

    console.log("[v0] [API] Manual process-approved-movements triggered")

    // Procesar movimientos aprobados
    const result = await LemonwayProcessingWorker.processApprovedMovements(true)

    return Response.json({
      success: result.success,
      processed: result.processed,
      errors: result.errors,
      details: result.details,
    })
  } catch (error: any) {
    console.error("[v0] API error:", error)
    return Response.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
