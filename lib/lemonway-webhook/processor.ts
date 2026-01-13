import { sql } from "@/lib/db"
import type { LemonwayWebhookPayload, WebhookDelivery } from "@/lib/types/lemonway-webhook"
import { HANDLER_REGISTRY, handleUnknown } from "./handlers"

// Main processor function
export async function processWebhookDelivery(deliveryId: string): Promise<void> {
  // Mark as processing
  await sql`
    UPDATE lemonway_webhooks."WebhookDelivery"
    SET processing_status = 'PROCESSING', updated_at = NOW()
    WHERE id = ${deliveryId}::uuid
  `

  try {
    // Fetch the delivery record
    const deliveryResult = await sql`
      SELECT * FROM lemonway_webhooks."WebhookDelivery"
      WHERE id = ${deliveryId}::uuid
    `

    if (deliveryResult.length === 0) {
      throw new Error(`Delivery ${deliveryId} not found`)
    }

    const delivery = deliveryResult[0] as unknown as WebhookDelivery
    const payload = delivery.raw_payload as LemonwayWebhookPayload

    // Get the appropriate handler
    const handler = HANDLER_REGISTRY[delivery.notif_category] || handleUnknown

    // Execute handler
    const result = await handler(payload, delivery)

    if (result.success) {
      // Mark as processed
      await sql`
        UPDATE lemonway_webhooks."WebhookDelivery"
        SET 
          processing_status = 'PROCESSED',
          processed_at = NOW(),
          error_message = NULL,
          updated_at = NOW()
        WHERE id = ${deliveryId}::uuid
      `
    } else {
      throw new Error(result.message)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"

    // Mark as failed and increment retry count
    await sql`
      UPDATE lemonway_webhooks."WebhookDelivery"
      SET 
        processing_status = 'FAILED',
        error_message = ${errorMessage},
        retry_count = retry_count + 1,
        updated_at = NOW()
      WHERE id = ${deliveryId}::uuid
    `

    console.error(`[WebhookProcessor] Failed to process delivery ${deliveryId}:`, errorMessage)
  }
}

// Reprocess a failed delivery (called from admin API)
export async function reprocessWebhookDelivery(deliveryId: string): Promise<{ success: boolean; message: string }> {
  try {
    // Reset status to RECEIVED before reprocessing
    await sql`
      UPDATE lemonway_webhooks."WebhookDelivery"
      SET 
        processing_status = 'RECEIVED',
        error_message = NULL,
        updated_at = NOW()
      WHERE id = ${deliveryId}::uuid
    `

    // Process the delivery
    await processWebhookDelivery(deliveryId)

    // Check final status
    const result = await sql`
      SELECT processing_status, error_message 
      FROM lemonway_webhooks."WebhookDelivery"
      WHERE id = ${deliveryId}::uuid
    `

    if (result.length === 0) {
      return { success: false, message: "Delivery not found" }
    }

    const status = result[0].processing_status
    if (status === "PROCESSED") {
      return { success: true, message: "Webhook reprocessed successfully" }
    } else {
      return { success: false, message: result[0].error_message || "Processing failed" }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return { success: false, message }
  }
}
