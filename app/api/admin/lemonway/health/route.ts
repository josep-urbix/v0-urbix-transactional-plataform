import { type NextRequest, NextResponse } from "next/server"
import { LemonwayClient } from "@/lib/lemonway-client"
import { requireAdmin } from "@/lib/auth/middleware"

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(
      await (async () => {
        const { getServerSession } = await import("@/lib/auth")
        return await getServerSession()
      })(),
      "lemonway:dashboard",
      "view",
      request,
    )

    const client = new LemonwayClient()

    // Check Lemonway API health
    const startTime = Date.now()
    const health = await client.getHealth()
    const responseTime = Date.now() - startTime

    return NextResponse.json({
      success: true,
      data: {
        status: "online",
        responseTime,
        lemonway: health,
      },
    })
  } catch (error) {
    console.error("[v0] Health check error:", error)
    return NextResponse.json(
      {
        success: false,
        status: "offline",
        error: error instanceof Error ? error.message : "Health check failed",
      },
      { status: 503 },
    )
  }
}
