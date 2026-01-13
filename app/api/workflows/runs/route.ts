// =====================================================
// ALL WORKFLOW RUNS API
// =====================================================

import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const status = searchParams.get("status")
    const workflowId = searchParams.get("workflow_id")
    const eventName = searchParams.get("event_name")
    const limit = Number(searchParams.get("limit")) || 50
    const offset = Number(searchParams.get("offset")) || 0

    let runs
    let total

    // Build query based on filters
    if (status && workflowId) {
      runs = await sql`
        SELECT r.*, w.name as workflow_name
        FROM workflows."WorkflowRun" r
        JOIN workflows."Workflow" w ON w.id = r.workflow_id
        WHERE r.status = ${status} AND r.workflow_id = ${workflowId}
        ORDER BY r.started_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      const countResult = await sql`
        SELECT COUNT(*) as count FROM workflows."WorkflowRun"
        WHERE status = ${status} AND workflow_id = ${workflowId}
      `
      total = Number(countResult[0].count)
    } else if (status) {
      runs = await sql`
        SELECT r.*, w.name as workflow_name
        FROM workflows."WorkflowRun" r
        JOIN workflows."Workflow" w ON w.id = r.workflow_id
        WHERE r.status = ${status}
        ORDER BY r.started_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      const countResult = await sql`
        SELECT COUNT(*) as count FROM workflows."WorkflowRun"
        WHERE status = ${status}
      `
      total = Number(countResult[0].count)
    } else if (workflowId) {
      runs = await sql`
        SELECT r.*, w.name as workflow_name
        FROM workflows."WorkflowRun" r
        JOIN workflows."Workflow" w ON w.id = r.workflow_id
        WHERE r.workflow_id = ${workflowId}
        ORDER BY r.started_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      const countResult = await sql`
        SELECT COUNT(*) as count FROM workflows."WorkflowRun"
        WHERE workflow_id = ${workflowId}
      `
      total = Number(countResult[0].count)
    } else if (eventName) {
      runs = await sql`
        SELECT r.*, w.name as workflow_name
        FROM workflows."WorkflowRun" r
        JOIN workflows."Workflow" w ON w.id = r.workflow_id
        WHERE r.trigger_event_name = ${eventName}
        ORDER BY r.started_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      const countResult = await sql`
        SELECT COUNT(*) as count FROM workflows."WorkflowRun"
        WHERE trigger_event_name = ${eventName}
      `
      total = Number(countResult[0].count)
    } else {
      runs = await sql`
        SELECT r.*, w.name as workflow_name
        FROM workflows."WorkflowRun" r
        JOIN workflows."Workflow" w ON w.id = r.workflow_id
        ORDER BY r.started_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      const countResult = await sql`SELECT COUNT(*) as count FROM workflows."WorkflowRun"`
      total = Number(countResult[0].count)
    }

    return NextResponse.json({ runs, total, limit, offset })
  } catch (error) {
    console.error("Error listing all workflow runs:", error)
    return NextResponse.json({ error: "Error listing workflow runs" }, { status: 500 })
  }
}
