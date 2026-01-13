import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { type LemonwayWebhookPayload, NOTIF_CATEGORY_MAP, type EventType } from "@/lib/types/lemonway-webhook"
import { processWebhookDelivery } from "@/lib/lemonway-webhook/processor"

// Extract raw headers from request
function extractHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {}
  request.headers.forEach((value, key) => {
    headers[key] = value
  })
  return headers
}

// Determine event type from NotifCategory
function getEventType(notifCategory: number): EventType {
  return NOTIF_CATEGORY_MAP[notifCategory] || "UNKNOWN"
}

export async function POST(request: NextRequest) {
  const receivedAt = new Date().toISOString()
  const rawHeaders = extractHeaders(request)
  const ipAddress = rawHeaders["x-forwarded-for"] || rawHeaders["x-real-ip"] || "unknown"

  let bodyText = ""

  try {
    bodyText = await request.text()

    // Log raw webhook immediately - this should always work
    await sql`
      INSERT INTO "LemonwayTransaction" (type, status, request, response, wallet_id, created_at)
      VALUES (
        'WEBHOOK_RAW',
        'received',
        ${JSON.stringify({ raw_body: bodyText, headers: rawHeaders, ip: ipAddress })}::jsonb,
        ${JSON.stringify({ received_at: receivedAt })}::jsonb,
        NULL,
        NOW()
      )
    `
  } catch (immediateLogError) {
    console.error("[LemonwayWebhook] CRITICAL - Failed immediate log:", immediateLogError)
  }

  // Now try to parse and process
  let payload: LemonwayWebhookPayload | null = null

  try {
    payload = JSON.parse(bodyText)
  } catch (parseError) {
    console.error("[LemonwayWebhook] JSON parse error:", parseError)
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const notifCategory = payload?.NotifCategory
  if (typeof notifCategory !== "number") {
    return NextResponse.json({ error: "Missing or invalid NotifCategory" }, { status: 400 })
  }

  const eventType = getEventType(notifCategory)
  const walletExtId = payload.ExtId || null

  // Update the raw log with parsed info
  try {
    await sql`
      UPDATE "LemonwayTransaction" 
      SET 
        type = ${"WEBHOOK_" + eventType},
        wallet_id = ${walletExtId},
        response = ${JSON.stringify({
          notif_category: notifCategory,
          event_type: eventType,
          received_at: receivedAt,
          parsed: true,
        })}::jsonb
      WHERE type = 'WEBHOOK_RAW' 
        AND request->>'received_at' IS NULL
        AND created_at > NOW() - INTERVAL '1 minute'
      ORDER BY created_at DESC
      LIMIT 1
    `
  } catch (updateError) {
    console.error("[LemonwayWebhook] Update error:", updateError)
  }

  // Process webhook in background (fire and forget)
  try {
    const schemaCheck = await sql`
      SELECT EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name = 'lemonway_webhooks') as exists
    `

    if (schemaCheck[0]?.exists) {
      const result = await sql`
        INSERT INTO lemonway_webhooks."WebhookDelivery" (
          notif_category, event_type, wallet_ext_id, wallet_int_id, transaction_id,
          amount, status_code, raw_headers, raw_payload, processing_status, received_at
        ) VALUES (
          ${notifCategory}, ${eventType}::lemonway_webhooks.event_type, ${walletExtId},
          ${payload.IntId || null}, ${payload.IdTransaction || null},
          ${typeof payload.Amount === "number" ? payload.Amount : null},
          ${typeof payload.Status === "number" ? payload.Status : null},
          ${JSON.stringify(rawHeaders)}::jsonb, ${JSON.stringify(payload)}::jsonb,
          'RECEIVED', ${receivedAt}::timestamptz
        ) RETURNING id
      `

      // Fire and forget - don't await
      processWebhookDelivery(result[0].id).catch((err) =>
        console.error("[LemonwayWebhook] Background processing error:", err),
      )
    }
  } catch (webhookError) {
    console.error("[LemonwayWebhook] WebhookDelivery error:", webhookError)
  }

  // Always return 200 quickly
  return NextResponse.json({ success: true, event_type: eventType }, { status: 200 })
}

export async function GET() {
  return NextResponse.json({ status: "ok", endpoint: "lemonway-webhook" })
}
