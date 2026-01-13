import { type NextRequest, NextResponse } from "next/server"
import { reprocessWebhookDelivery } from "@/lib/lemonway-webhook/processor"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const result = await reprocessWebhookDelivery(id)

    if (result.success) {
      return NextResponse.json({ success: true, message: result.message })
    } else {
      return NextResponse.json({ success: false, error: result.message }, { status: 400 })
    }
  } catch (error) {
    console.error("[AdminWebhooks] Error reprocessing webhook:", error)
    return NextResponse.json({ error: "Error reprocessing webhook" }, { status: 500 })
  }
}
