// Simple in-memory rate limiter (use Redis for production)
const requestCounts = new Map<string, { count: number; resetAt: number }>()

export interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

export function rateLimit(identifier: string, config: RateLimitConfig): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const record = requestCounts.get(identifier)

  // Clean up old entries
  if (record && now > record.resetAt) {
    requestCounts.delete(identifier)
  }

  const currentRecord = requestCounts.get(identifier)

  if (!currentRecord) {
    requestCounts.set(identifier, {
      count: 1,
      resetAt: now + config.windowMs,
    })
    return { allowed: true, remaining: config.maxRequests - 1 }
  }

  if (currentRecord.count >= config.maxRequests) {
    return { allowed: false, remaining: 0 }
  }

  currentRecord.count++
  return { allowed: true, remaining: config.maxRequests - currentRecord.count }
}

// Cleanup old entries every 10 minutes
setInterval(
  () => {
    const now = Date.now()
    for (const [key, value] of requestCounts.entries()) {
      if (now > value.resetAt) {
        requestCounts.delete(key)
      }
    }
  },
  10 * 60 * 1000,
)
