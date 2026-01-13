import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const logId = searchParams.get("logId")

    if (!logId) {
      return NextResponse.json({ error: "logId is required" }, { status: 400 })
    }

    const history = await sql`
      SELECT 
        id,
        api_call_log_id,
        attempt_number,
        response_status,
        success,
        error_message,
        duration_ms,
        response_payload,
        created_at
      FROM "LemonwayApiCallRetryHistory"
      WHERE api_call_log_id = ${Number.parseInt(logId)}
      ORDER BY attempt_number ASC, created_at ASC
    `

    return NextResponse.json({
      success: true,
      history,
      count: history.length,
    })
  } catch (error: any) {
    console.error("Error fetching retry history:", error)
    return NextResponse.json({ error: "Error fetching retry history", details: error.message }, { status: 500 })
  }
}
