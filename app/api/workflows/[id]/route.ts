// =====================================================
// WORKFLOW API - GET, UPDATE, DELETE
// =====================================================

import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import type { UpdateWorkflowRequest } from "@/lib/types/workflow"

const isValidUUID = (str: string) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    if (!id || !isValidUUID(id)) {
      return NextResponse.json({ error: "ID de workflow inválido" }, { status: 400 })
    }

    const workflows = await sql`
      SELECT * FROM workflows."Workflow" WHERE id = ${id}
    `

    if (workflows.length === 0) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
    }

    const workflow = workflows[0]

    // Fetch triggers and steps
    const triggers = await sql`
      SELECT * FROM workflows."WorkflowTrigger" 
      WHERE workflow_id = ${id}
      ORDER BY created_at
    `

    const steps = await sql`
      SELECT * FROM workflows."WorkflowStep" 
      WHERE workflow_id = ${id}
      ORDER BY created_at
    `

    return NextResponse.json({
      ...workflow,
      triggers,
      steps,
    })
  } catch (error) {
    console.error("Error fetching workflow:", error)
    return NextResponse.json({ error: "Error fetching workflow" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body: UpdateWorkflowRequest = await request.json()

    // Validate UUID before updating
    if (!id || !isValidUUID(id)) {
      return NextResponse.json({ error: "ID de workflow inválido" }, { status: 400 })
    }

    // Check if workflow exists
    const existing = await sql`SELECT id FROM workflows."Workflow" WHERE id = ${id}`
    if (existing.length === 0) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
    }

    // Update workflow basic fields
    if (
      body.name !== undefined ||
      body.description !== undefined ||
      body.status !== undefined ||
      body.entry_step_key !== undefined ||
      body.canvas_data !== undefined
    ) {
      await sql`
        UPDATE workflows."Workflow"
        SET
          name = COALESCE(${body.name || null}, name),
          description = COALESCE(${body.description || null}, description),
          status = COALESCE(${body.status || null}, status),
          entry_step_key = COALESCE(${body.entry_step_key || null}, entry_step_key),
          canvas_data = COALESCE(${body.canvas_data ? JSON.stringify(body.canvas_data) : null}::jsonb, canvas_data),
          version = version + 1,
          updated_at = NOW()
        WHERE id = ${id}
      `
    }

    // Update triggers if provided
    if (body.triggers !== undefined) {
      // Delete existing triggers
      await sql`DELETE FROM workflows."WorkflowTrigger" WHERE workflow_id = ${id}`

      // Insert new triggers
      for (const trigger of body.triggers) {
        await sql`
          INSERT INTO workflows."WorkflowTrigger" (workflow_id, event_name, filter_expression, description)
          VALUES (${id}, ${trigger.event_name}, ${trigger.filter_expression || null}, ${trigger.description || null})
        `
      }
    }

    // Update steps if provided
    if (body.steps !== undefined) {
      // Delete existing steps
      await sql`DELETE FROM workflows."WorkflowStep" WHERE workflow_id = ${id}`

      // Insert new steps
      for (const step of body.steps) {
        await sql`
          INSERT INTO workflows."WorkflowStep" (
            workflow_id, step_key, name, type, config,
            next_step_on_success, next_step_on_error,
            max_retries, retry_delay_ms, position_x, position_y
          )
          VALUES (
            ${id},
            ${step.step_key},
            ${step.name},
            ${step.type},
            ${JSON.stringify(step.config)}::jsonb,
            ${step.next_step_on_success || null},
            ${step.next_step_on_error || null},
            ${step.max_retries || 3},
            ${step.retry_delay_ms || 1000},
            ${step.position_x || 0},
            ${step.position_y || 0}
          )
        `
      }
    }

    // Fetch updated workflow
    const workflows = await sql`SELECT * FROM workflows."Workflow" WHERE id = ${id}`
    const triggers = await sql`SELECT * FROM workflows."WorkflowTrigger" WHERE workflow_id = ${id}`
    const steps = await sql`SELECT * FROM workflows."WorkflowStep" WHERE workflow_id = ${id}`

    return NextResponse.json({
      ...workflows[0],
      triggers,
      steps,
    })
  } catch (error) {
    console.error("Error updating workflow:", error)
    return NextResponse.json({ error: "Error updating workflow" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Validate UUID before deleting
    if (!id || !isValidUUID(id)) {
      return NextResponse.json({ error: "ID de workflow inválido" }, { status: 400 })
    }

    // Check if workflow exists
    const existing = await sql`SELECT id FROM workflows."Workflow" WHERE id = ${id}`
    if (existing.length === 0) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
    }

    // Delete workflow (cascades to triggers, steps, runs)
    await sql`DELETE FROM workflows."Workflow" WHERE id = ${id}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting workflow:", error)
    return NextResponse.json({ error: "Error deleting workflow" }, { status: 500 })
  }
}
