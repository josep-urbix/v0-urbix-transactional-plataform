import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdmin } from "@/lib/auth/middleware"

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin(
      await (async () => {
        const { getServerSession } = await import("@/lib/auth")
        return await getServerSession()
      })(),
      "lemonway:explorer",
      "test",
      request,
    )

    const body = await request.json()
    const { webhook_event_type, webhook_payload } = body

    if (!webhook_event_type || !webhook_payload) {
      return NextResponse.json({ success: false, error: "Missing event type or payload" }, { status: 400 })
    }

    // Simulate webhook reception
    const simulation = await sql`
      INSERT INTO lemonway_temp.lemonway_webhook_simulations
      (webhook_event_type, webhook_payload, status, created_by)
      VALUES ($1, $2, 'success', $3)
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      data: simulation[0],
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
