import { NextResponse } from "next/server"
import { requireAuth, getSession } from "@/lib/auth"
import { createSQLLogger } from "@/lib/sql-logger"

export async function GET(request: Request) {
  try {
    const session = await getSession()
    await requireAuth()

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "25")
    const successParam = searchParams.get("success")
    const retryStatusParam = searchParams.get("retryStatus")
    const retryCountParam = searchParams.get("retryCount")
    const offset = (page - 1) * limit

    const sql = createSQLLogger({
      apiEndpoint: "/api/lemonway/api-calls",
      userEmail: session?.user?.email,
    })

    const filterConditions: string[] = []

    // Por defecto excluir eliminadas
    if (retryStatusParam !== "deleted") {
      filterConditions.push("retry_status IS DISTINCT FROM 'deleted'")
    }

    // Filtro "Estado" - basado en el badge visual
    if (successParam === "pending") {
      filterConditions.push("(retry_status = 'pending' OR retry_status = 'limit_pending')")
    } else if (successParam === "true") {
      filterConditions.push("success = true")
    } else if (successParam === "false") {
      filterConditions.push("success = false")
    }

    // Filtro "Estado Reintento"
    if (retryStatusParam === "pending") {
      filterConditions.push("retry_status = 'pending'")
    } else if (retryStatusParam === "limit_pending") {
      filterConditions.push("retry_status = 'limit_pending'")
    } else if (retryStatusParam === "success") {
      filterConditions.push("retry_status = 'success'")
    } else if (retryStatusParam === "failed") {
      filterConditions.push("(retry_status = 'failed' OR final_failure = true)")
    } else if (retryStatusParam === "deleted") {
      filterConditions.push("retry_status = 'deleted'")
    } else if (retryStatusParam === "none") {
      filterConditions.push("(retry_status = 'none' OR retry_status IS NULL OR retry_status = '')")
    }

    if (retryCountParam && retryCountParam !== "all") {
      if (retryCountParam === "5") {
        filterConditions.push("retry_count >= 5")
      } else {
        const retryCount = Number.parseInt(retryCountParam, 10)
        if (!isNaN(retryCount)) {
          filterConditions.push(`retry_count = ${retryCount}`)
        }
      }
    }

    const whereClause = filterConditions.length > 0 ? `WHERE ${filterConditions.join(" AND ")}` : ""

    const dataQuery = `
      WITH filtered_logs AS (
        SELECT *
        FROM "LemonwayApiCallLog"
        ${whereClause}
      ),
      latest_logs AS (
        SELECT DISTINCT ON (request_id) *
        FROM filtered_logs
        ORDER BY request_id, id DESC
      )
      SELECT 
        l.*,
        COALESCE(l.retry_count, 0) as total_retries
      FROM latest_logs l
      ORDER BY l.id DESC
      LIMIT $1 OFFSET $2
    `

    const countQuery = `
      WITH filtered_logs AS (
        SELECT *
        FROM "LemonwayApiCallLog"
        ${whereClause}
      ),
      latest_logs AS (
        SELECT DISTINCT ON (request_id) *
        FROM filtered_logs
        ORDER BY request_id, id DESC
      )
      SELECT COUNT(*) as count FROM latest_logs
    `

    const [countResult, calls] = await Promise.all([sql.query(countQuery), sql.query(dataQuery, [limit, offset])])

    const total = Number.parseInt(countResult[0]?.count?.toString() || "0")

    return NextResponse.json({
      calls,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    console.error("Error fetching API call logs:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
