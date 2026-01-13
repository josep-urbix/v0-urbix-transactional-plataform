import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession, requireAdmin } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()

    const authResult = await requireAdmin(session?.user, "lemonway_queue", "view", request)
    if (!authResult.success) return authResult.error

    const result = await sql(
      `
      SELECT 
        priority,
        status,
        COUNT(*) as count
      FROM lemonway_temp.lemonway_request_queue
      WHERE status != 'cancelled' AND status != 'failed'
      GROUP BY priority, status
      ORDER BY 
        CASE priority WHEN 'URGENT' THEN 1 WHEN 'NORMAL' THEN 2 END,
        CASE status WHEN 'pending' THEN 1 WHEN 'processing' THEN 2 ELSE 3 END
      `,
    )

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error("[v0] Queue stats error:", error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Error fetching stats",
      },
      { status: 500 },
    )
  }
}
