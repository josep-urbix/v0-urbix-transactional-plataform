import { NextResponse } from "next/server"
import { LemonwayClient } from "@/lib/lemonway-client"

export async function POST(request: Request) {
  try {
    const { logId } = await request.json()

    if (!logId) {
      return NextResponse.json({ error: "logId es requerido" }, { status: 400 })
    }

    const result = await LemonwayClient.retryFailedCall(logId)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[v0] Error en reintento manual:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
