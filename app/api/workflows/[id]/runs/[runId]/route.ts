// =====================================================
// WORKFLOW RUN DETAIL API
// =====================================================

import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; runId: string }> }) {
  try {
    const { id, runId } = await params

    const runs = await sql`
      SELECT r.*, w.name as workflow_name
      FROM workflows."WorkflowRun" r
      JOIN workflows."Workflow" w ON w.id = r.workflow_id
      WHERE r.id = ${runId} AND r.workflow_id = ${id}
    `

    if (runs.length === 0) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 })
    }

    const run = runs[0]

    // Fetch step runs
    const stepRuns = await sql`
      SELECT sr.*, s.name as step_name, s.type as step_type
      FROM workflows."WorkflowStepRun" sr
      JOIN workflows."WorkflowStep" s ON s.id = sr.step_id
      WHERE sr.workflow_run_id = ${runId}
      ORDER BY sr.started_at ASC
    `

    return NextResponse.json({
      ...run,
      step_runs: stepRuns,
    })
  } catch (error) {
    console.error("Error fetching workflow run:", error)
    return NextResponse.json({ error: "Error fetching workflow run" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; runId: string }> }) {
  try {
    const { runId } = await params

    // Cancel the run if it's still running
    await sql`
      UPDATE workflows."WorkflowRun"
      SET status = 'CANCELLED', finished_at = NOW()
      WHERE id = ${runId} AND status IN ('PENDING', 'RUNNING', 'WAITING')
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error cancelling workflow run:", error)
    return NextResponse.json({ error: "Error cancelling workflow run" }, { status: 500 })
  }
}
