import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const result = await sql`
      SELECT * FROM lemonway_webhooks."WebhookDelivery"
      WHERE id = ${id}::uuid
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Webhook delivery not found" }, { status: 404 })
    }

    return NextResponse.json({ webhook: result[0] })
  } catch (error) {
    console.error("[AdminWebhooks] Error getting webhook:", error)
    return NextResponse.json({ error: "Error getting webhook" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const result = await sql`
      DELETE FROM lemonway_webhooks."WebhookDelivery"
      WHERE id = ${id}::uuid
      RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Webhook delivery not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: "Webhook deleted" })
  } catch (error) {
    console.error("[AdminWebhooks] Error deleting webhook:", error)
    return NextResponse.json({ error: "Error deleting webhook" }, { status: 500 })
  }
}
