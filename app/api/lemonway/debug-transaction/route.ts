import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const requestId = searchParams.get("request_id")

    let transactions

    if (id) {
      transactions = await sql`
        SELECT 
          id, 
          request_id, 
          endpoint, 
          retry_status, 
          retry_count, 
          next_retry_at,
          response_status,
          final_failure,
          manual_retry_needed,
          created_at,
          NOW() as current_time,
          (next_retry_at <= NOW()) as should_process
        FROM "LemonwayApiCallLog"
        WHERE id = ${Number.parseInt(id)}
      `
    } else if (requestId) {
      transactions = await sql`
        SELECT 
          id, 
          request_id, 
          endpoint, 
          retry_status, 
          retry_count, 
          next_retry_at,
          response_status,
          final_failure,
          manual_retry_needed,
          created_at,
          NOW() as current_time,
          (next_retry_at <= NOW()) as should_process
        FROM "LemonwayApiCallLog"
        WHERE request_id LIKE ${requestId + "%"}
        ORDER BY created_at DESC
      `
    } else {
      // Mostrar todas las pendientes
      transactions = await sql`
        SELECT 
          id, 
          request_id, 
          endpoint, 
          retry_status, 
          retry_count, 
          next_retry_at,
          response_status,
          final_failure,
          manual_retry_needed,
          created_at,
          NOW() as current_time,
          (next_retry_at <= NOW()) as should_process
        FROM "LemonwayApiCallLog"
        WHERE (retry_status = 'pending' OR retry_status = 'limit_pending')
          AND next_retry_at <= NOW()
        ORDER BY next_retry_at ASC
        LIMIT 20
      `
    }

    return NextResponse.json({
      count: transactions.length,
      transactions,
    })
  } catch (error: any) {
    console.error("Debug transaction error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
