import { getSession } from "@/lib/auth/session"
import { LemonwayProcessingWorker } from "@/lib/workers/lemonway-processing-worker"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { movementIds } = body

    if (!movementIds || movementIds.length === 0) {
      return NextResponse.json({ error: "movementIds required" }, { status: 400 })
    }

    console.log(`[v0] [API] Manual reprocess triggered for ${movementIds.length} movements`)

    const result = await LemonwayProcessingWorker.processApprovedMovements(true, movementIds)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[v0] Error in reprocess-movements:", error)
    return NextResponse.json({ error: error.message || "Error reprocessing movements" }, { status: 500 })
  }
}
