// =====================================================
// EMIT EVENT API - Trigger workflows
// =====================================================

import { type NextRequest, NextResponse } from "next/server"
import { emitEvent } from "@/lib/workflow-engine/engine"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.eventName) {
      return NextResponse.json({ error: "eventName is required" }, { status: 400 })
    }

    const result = await emitEvent(body.eventName, body.payload || {})

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error emitting event:", error)
    return NextResponse.json({ error: "Error emitting event" }, { status: 500 })
  }
}
