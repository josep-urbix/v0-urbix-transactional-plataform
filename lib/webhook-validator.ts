import { sql } from "@/lib/db"
import { secureLog, secureError } from "./security"

export async function getWebhookApiKey(): Promise<string | null> {
  try {
    const result = await sql`SELECT value FROM "AppConfig" WHERE key = 'webhook_api_key' LIMIT 1`

    // First check database, then fallback to environment variable
    if (result[0]?.value) {
      secureLog("[Webhook] Using API key from database")
      return result[0].value
    }

    if (process.env.HUBSPOT_WEBHOOK_SECRET) {
      secureLog("[Webhook] Using API key from environment variable")
      return process.env.HUBSPOT_WEBHOOK_SECRET
    }

    secureError("[Webhook] No API key configured in database or environment!")
    return null
  } catch (error) {
    secureError("[Webhook] Error fetching webhook API key from database:", error)
    // Fallback to environment variable on error
    return process.env.HUBSPOT_WEBHOOK_SECRET || null
  }
}
