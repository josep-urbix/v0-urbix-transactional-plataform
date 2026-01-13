export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const job = await sql`
      SELECT id, name, description 
      FROM "CronJob" 
      WHERE name = ${id}
      LIMIT 1
    `

    if (job.length === 0) {
      return NextResponse.json({
        executions: [],
        error: `Job "${id}" not found`,
      })
    }

    const executions = await sql`
      SELECT 
        id,
        cron_job_id,
        status,
        started_at,
        finished_at,
        duration_ms,
        error_message,
        error_stack,
        result_data,
        created_at
      FROM "CronJobExecution"
      WHERE cron_job_id = ${job[0].id}
      ORDER BY started_at DESC
      LIMIT 100
    `

    return NextResponse.json({
      executions,
      job: job[0],
    })
  } catch (error: any) {
    console.error("[API] Error fetching cron executions:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
