// =====================================================
// WORKFLOW RUNS API
// =====================================================

import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)

    const status = searchParams.get("status")
    const limit = Number(searchParams.get("limit")) || 50
    const offset = Number(searchParams.get("offset")) || 0

    let runs
    let total

    if (status) {
      runs = await sql`
        SELECT * FROM workflows."WorkflowRun"
        WHERE workflow_id = ${id} AND status = ${status}
        ORDER BY started_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      const countResult = await sql`
        SELECT COUNT(*) as count FROM workflows."WorkflowRun"
        WHERE workflow_id = ${id} AND status = ${status}
      `
      total = Number(countResult[0].count)
    } else {
      runs = await sql`
        SELECT * FROM workflows."WorkflowRun"
        WHERE workflow_id = ${id}
        ORDER BY started_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      const countResult = await sql`
        SELECT COUNT(*) as count FROM workflows."WorkflowRun"
        WHERE workflow_id = ${id}
      `
      total = Number(countResult[0].count)
    }

    return NextResponse.json({ runs, total, limit, offset })
  } catch (error) {
    console.error("Error listing workflow runs:", error)
    return NextResponse.json({ error: "Error listing workflow runs" }, { status: 500 })
  }
}
