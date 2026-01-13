import { type NextRequest, NextResponse } from "next/server"
import { rateLimit } from "./rate-limiter"
import { getSession, isAdminRole, type Session } from "@/lib/auth"

export function sanitizeError(error: unknown): string {
  // Never expose stack traces or internal errors in production
  if (process.env.NODE_ENV === "production") {
    return "An error occurred processing your request"
  }
  return error instanceof Error ? error.message : String(error)
}

export async function withAuth(handler: (req: NextRequest, session: Session) => Promise<Response>) {
  return async (req: NextRequest) => {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return handler(req, session)
  }
}

export async function withAdminAuth(handler: (req: NextRequest, session: Session) => Promise<Response>) {
  return async (req: NextRequest) => {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    return handler(req, session)
  }
}

export function withRateLimit(
  handler: (req: NextRequest) => Promise<Response>,
  config: { maxRequests: number; windowMs: number },
) {
  return async (req: NextRequest) => {
    const identifier = req.ip || req.headers.get("x-forwarded-for") || "unknown"
    const { allowed, remaining } = rateLimit(identifier, config)

    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(config.windowMs / 1000)),
            "X-RateLimit-Remaining": "0",
          },
        },
      )
    }

    const response = await handler(req)
    response.headers.set("X-RateLimit-Remaining", String(remaining))
    return response
  }
}

export function addSecurityHeaders(response: Response): Response {
  // Add CORS headers
  response.headers.set("Access-Control-Allow-Origin", process.env.NEXT_PUBLIC_APP_URL || "*")
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")
  response.headers.set("Access-Control-Max-Age", "86400")

  // Add security headers
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()")

  return response
}
