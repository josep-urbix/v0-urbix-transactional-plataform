export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

import { NextResponse } from "next/server"
import { startCronExecution, endCronExecution } from "@/lib/cron-logger"
import { processRetryQueue } from "@/lib/lemonway-client"

export async function GET(request: Request) {
  let executionId: number | null = null

  try {
    // Verificar que la petición viene de Vercel Cron o es interna
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET || "dev-secret"

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    executionId = await startCronExecution("retry-queue")

    const result = await processRetryQueue()

    await endCronExecution(executionId, "success", result)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    })
  } catch (error: any) {
    console.error("Error processing retry queue:", error)

    if (executionId) {
      await endCronExecution(executionId, "failed", null, error)
    }

    return NextResponse.json(
      {
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
