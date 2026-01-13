// =====================================================
// WORKFLOW CLONE API
// =====================================================

import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const newName = body.name

    // Get original workflow
    const workflows = await sql`SELECT * FROM workflows."Workflow" WHERE id = ${id}`
    if (workflows.length === 0) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
    }

    const original = workflows[0]

    // Create clone
    const cloneResult = await sql`
      INSERT INTO workflows."Workflow" (name, description, entry_step_key, canvas_data, status)
      VALUES (
        ${newName || original.name + " (Copy)"},
        ${original.description},
        ${original.entry_step_key},
        ${JSON.stringify(original.canvas_data)}::jsonb,
        'INACTIVE'
      )
      RETURNING *
    `

    const clone = cloneResult[0]

    // Clone triggers
    const triggers = await sql`SELECT * FROM workflows."WorkflowTrigger" WHERE workflow_id = ${id}`
    for (const trigger of triggers) {
      await sql`
        INSERT INTO workflows."WorkflowTrigger" (workflow_id, event_name, filter_expression, description)
        VALUES (${clone.id}, ${trigger.event_name}, ${trigger.filter_expression}, ${trigger.description})
      `
    }

    // Clone steps
    const steps = await sql`SELECT * FROM workflows."WorkflowStep" WHERE workflow_id = ${id}`
    for (const step of steps) {
      await sql`
        INSERT INTO workflows."WorkflowStep" (
          workflow_id, step_key, name, type, config,
          next_step_on_success, next_step_on_error,
          max_retries, retry_delay_ms, position_x, position_y
        )
        VALUES (
          ${clone.id},
          ${step.step_key},
          ${step.name},
          ${step.type},
          ${JSON.stringify(step.config)}::jsonb,
          ${step.next_step_on_success},
          ${step.next_step_on_error},
          ${step.max_retries},
          ${step.retry_delay_ms},
          ${step.position_x},
          ${step.position_y}
        )
      `
    }

    // Fetch complete cloned workflow
    const clonedTriggers = await sql`SELECT * FROM workflows."WorkflowTrigger" WHERE workflow_id = ${clone.id}`
    const clonedSteps = await sql`SELECT * FROM workflows."WorkflowStep" WHERE workflow_id = ${clone.id}`

    return NextResponse.json({
      ...clone,
      triggers: clonedTriggers,
      steps: clonedSteps,
    })
  } catch (error) {
    console.error("Error cloning workflow:", error)
    return NextResponse.json({ error: "Error cloning workflow" }, { status: 500 })
  }
}
