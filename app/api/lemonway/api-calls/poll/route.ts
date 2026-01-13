import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "25")
    const successFilter = searchParams.get("success") || "all"
    const retryStatusFilter = searchParams.get("retryStatus") || "all"

    const offset = (page - 1) * limit

    let successCondition = ""
    if (successFilter === "true") {
      successCondition = "AND success = true"
    } else if (successFilter === "false") {
      successCondition = "AND success = false"
    } else if (successFilter === "null") {
      successCondition = "AND success IS NULL"
    }

    let retryStatusCondition = ""
    if (retryStatusFilter !== "all") {
      retryStatusCondition = `AND retry_status = '${retryStatusFilter}'`
    }

    const calls = await sql`
      WITH ordered_requests AS (
        SELECT 
          request_id,
          MIN(id) as first_id
        FROM "LemonwayApiCallLog"
        WHERE retry_status != 'deleted' OR retry_status IS NULL
        GROUP BY request_id
        ORDER BY MIN(id) DESC
      ),
      grouped_data AS (
        SELECT DISTINCT ON (l.request_id)
          l.id,
          l.request_id,
          l.created_at,
          l.sent_at,
          l.method,
          l.endpoint,
          l.success,
          l.retry_status,
          l.retry_count,
          l.next_retry_at,
          l.response_status,
          l.duration,
          l.final_failure,
          (SELECT COUNT(*) FROM "LemonwayApiCallLog" WHERE request_id = l.request_id) - 1 as total_retries
        FROM "LemonwayApiCallLog" l
        INNER JOIN ordered_requests o ON l.request_id = o.request_id
        WHERE (l.retry_status != 'deleted' OR l.retry_status IS NULL)
          ${successCondition ? sql.unsafe(successCondition) : sql``}
          ${retryStatusCondition ? sql.unsafe(retryStatusCondition) : sql``}
        ORDER BY l.request_id, l.created_at DESC
      )
      SELECT 
        gd.*,
        o.first_id
      FROM grouped_data gd
      INNER JOIN ordered_requests o ON gd.request_id = o.request_id
      ORDER BY o.first_id DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `

    const totalResult = await sql`
      SELECT COUNT(DISTINCT request_id) as total
      FROM "LemonwayApiCallLog"
      WHERE (retry_status != 'deleted' OR retry_status IS NULL)
        ${successCondition ? sql.unsafe(successCondition) : sql``}
        ${retryStatusCondition ? sql.unsafe(retryStatusCondition) : sql``}
    `

    const total = Number(totalResult[0]?.total || 0)
    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      calls,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    })
  } catch (error: any) {
    console.error("Error fetching API calls (poll):", error)
    return NextResponse.json(
      {
        calls: [],
        pagination: { page: 1, limit: 25, total: 0, totalPages: 0 },
      },
      { status: 200 },
    )
  }
}
