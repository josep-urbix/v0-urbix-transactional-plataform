import { sql } from "@/lib/db"

interface RetryConfig {
  retryDelaySeconds: number
  maxRetryAttempts: number
  manualRetryEnabled: boolean
}

let cachedConfig: RetryConfig | null = null
let lastFetch = 0
const CACHE_DURATION = 60000 // Cache for 1 minute

export async function getRetryConfig(): Promise<RetryConfig> {
  const now = Date.now()

  // Return cached config if still valid
  if (cachedConfig && now - lastFetch < CACHE_DURATION) {
    return cachedConfig
  }

  try {
    const config = await sql`
      SELECT key, value
      FROM "AppConfig"
      WHERE key IN ('lemonway_retry_delay_seconds', 'lemonway_max_retry_attempts', 'lemonway_manual_retry_enabled')
    `

    const retryConfig = {
      retryDelaySeconds: Number.parseInt(config.find((c) => c.key === "lemonway_retry_delay_seconds")?.value || "120"),
      maxRetryAttempts: Number.parseInt(config.find((c) => c.key === "lemonway_max_retry_attempts")?.value || "2"),
      manualRetryEnabled: config.find((c) => c.key === "lemonway_manual_retry_enabled")?.value !== "false",
    }

    cachedConfig = retryConfig
    lastFetch = now

    return retryConfig
  } catch (error) {
    console.error("Error fetching retry config:", error)
    // Return default values if fetch fails
    return {
      retryDelaySeconds: 120,
      maxRetryAttempts: 2,
      manualRetryEnabled: true,
    }
  }
}
