// =====================================================
// WORKFLOW ACTIVATE/DEACTIVATE API
// =====================================================

import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Validate workflow has at least one trigger and one step
    const triggers = await sql`
      SELECT COUNT(*) as count FROM workflows."WorkflowTrigger" WHERE workflow_id = ${id}
    `
    const steps = await sql`
      SELECT COUNT(*) as count FROM workflows."WorkflowStep" WHERE workflow_id = ${id}
    `

    if (Number(triggers[0].count) === 0) {
      return NextResponse.json({ error: "Workflow must have at least one trigger" }, { status: 400 })
    }

    if (Number(steps[0].count) === 0) {
      return NextResponse.json({ error: "Workflow must have at least one step" }, { status: 400 })
    }

    // Check entry_step_key is valid
    const workflow = await sql`SELECT entry_step_key FROM workflows."Workflow" WHERE id = ${id}`
    if (workflow.length === 0) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
    }

    if (workflow[0].entry_step_key) {
      const entryStep = await sql`
        SELECT id FROM workflows."WorkflowStep" 
        WHERE workflow_id = ${id} AND step_key = ${workflow[0].entry_step_key}
      `
      if (entryStep.length === 0) {
        return NextResponse.json({ error: "Entry step not found" }, { status: 400 })
      }
    }

    // Activate
    await sql`
      UPDATE workflows."Workflow"
      SET status = 'ACTIVE', updated_at = NOW()
      WHERE id = ${id}
    `

    return NextResponse.json({ success: true, status: "ACTIVE" })
  } catch (error) {
    console.error("Error activating workflow:", error)
    return NextResponse.json({ error: "Error activating workflow" }, { status: 500 })
  }
}
