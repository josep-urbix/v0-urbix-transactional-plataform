import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/middleware"
import { queueProcessor } from "@/lib/lemonway-queue-processor"

/**
 * Endpoint para encolar manualmente una solicitud
 * POST /api/admin/lemonway/queue/enqueue
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin(
      await (async () => {
        const { getServerSession } = await import("@/lib/auth")
        return await getServerSession()
      })(),
      "lemonway:queue",
      "manage",
      request,
    )

    const body = await request.json()
    const { priority = "NORMAL", endpoint, http_method, request_payload, wallet_id, account_id, operation_type } = body

    if (!endpoint || !http_method) {
      return NextResponse.json({ success: false, error: "Missing endpoint or http_method" }, { status: 400 })
    }

    // Encolar solicitud
    const queueId = await queueProcessor.enqueue({
      priority,
      endpoint,
      http_method,
      request_payload,
      wallet_id,
      account_id,
      operation_type,
      created_by: user.id,
    })

    // Si es URGENT, procesar inmediatamente
    if (priority === "URGENT") {
      setImmediate(() => {
        queueProcessor.processQueue().catch((err) => console.error("[v0] Immediate processing error:", err))
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        queueId,
        priority,
        message: priority === "URGENT" ? "Queued and processing immediately" : "Queued for processing",
      },
    })
  } catch (error) {
    console.error("[v0] Enqueue error:", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
