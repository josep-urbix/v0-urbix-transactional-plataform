// =====================================================
// WORKFLOWS API - LIST AND CREATE
// =====================================================

import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import type { WorkflowListFilters, CreateWorkflowRequest } from "@/lib/types/workflow"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const filters: WorkflowListFilters = {
      status: searchParams.get("status") as "ACTIVE" | "INACTIVE" | undefined,
      search: searchParams.get("search") || undefined,
      event_name: searchParams.get("event_name") || undefined,
      limit: Number(searchParams.get("limit")) || 50,
      offset: Number(searchParams.get("offset")) || 0,
    }

    // Build query based on filters
    let workflows
    let total

    if (filters.search && filters.status && filters.event_name) {
      workflows = await sql`
        SELECT DISTINCT w.*, 
          (SELECT COUNT(*) FROM workflows."WorkflowRun" r WHERE r.workflow_id = w.id) as run_count,
          (SELECT json_agg(json_build_object('event_name', t.event_name, 'id', t.id)) 
           FROM workflows."WorkflowTrigger" t WHERE t.workflow_id = w.id) as triggers
        FROM workflows."Workflow" w
        LEFT JOIN workflows."WorkflowTrigger" t ON t.workflow_id = w.id
        WHERE w.name ILIKE ${"%" + filters.search + "%"}
          AND w.status = ${filters.status}
          AND t.event_name = ${filters.event_name}
        ORDER BY w.updated_at DESC
        LIMIT ${filters.limit} OFFSET ${filters.offset}
      `
      const countResult = await sql`
        SELECT COUNT(DISTINCT w.id) as count FROM workflows."Workflow" w
        LEFT JOIN workflows."WorkflowTrigger" t ON t.workflow_id = w.id
        WHERE w.name ILIKE ${"%" + filters.search + "%"}
          AND w.status = ${filters.status}
          AND t.event_name = ${filters.event_name}
      `
      total = Number(countResult[0].count)
    } else if (filters.search && filters.status) {
      workflows = await sql`
        SELECT w.*, 
          (SELECT COUNT(*) FROM workflows."WorkflowRun" r WHERE r.workflow_id = w.id) as run_count,
          (SELECT json_agg(json_build_object('event_name', t.event_name, 'id', t.id)) 
           FROM workflows."WorkflowTrigger" t WHERE t.workflow_id = w.id) as triggers
        FROM workflows."Workflow" w
        WHERE w.name ILIKE ${"%" + filters.search + "%"}
          AND w.status = ${filters.status}
        ORDER BY w.updated_at DESC
        LIMIT ${filters.limit} OFFSET ${filters.offset}
      `
      const countResult = await sql`
        SELECT COUNT(*) as count FROM workflows."Workflow"
        WHERE name ILIKE ${"%" + filters.search + "%"} AND status = ${filters.status}
      `
      total = Number(countResult[0].count)
    } else if (filters.search && filters.event_name) {
      workflows = await sql`
        SELECT DISTINCT w.*, 
          (SELECT COUNT(*) FROM workflows."WorkflowRun" r WHERE r.workflow_id = w.id) as run_count,
          (SELECT json_agg(json_build_object('event_name', t.event_name, 'id', t.id)) 
           FROM workflows."WorkflowTrigger" t WHERE t.workflow_id = w.id) as triggers
        FROM workflows."Workflow" w
        LEFT JOIN workflows."WorkflowTrigger" t ON t.workflow_id = w.id
        WHERE w.name ILIKE ${"%" + filters.search + "%"}
          AND t.event_name = ${filters.event_name}
        ORDER BY w.updated_at DESC
        LIMIT ${filters.limit} OFFSET ${filters.offset}
      `
      const countResult = await sql`
        SELECT COUNT(DISTINCT w.id) as count FROM workflows."Workflow" w
        LEFT JOIN workflows."WorkflowTrigger" t ON t.workflow_id = w.id
        WHERE w.name ILIKE ${"%" + filters.search + "%"}
          AND t.event_name = ${filters.event_name}
      `
      total = Number(countResult[0].count)
    } else if (filters.status && filters.event_name) {
      workflows = await sql`
        SELECT DISTINCT w.*, 
          (SELECT COUNT(*) FROM workflows."WorkflowRun" r WHERE r.workflow_id = w.id) as run_count,
          (SELECT json_agg(json_build_object('event_name', t.event_name, 'id', t.id)) 
           FROM workflows."WorkflowTrigger" t WHERE t.workflow_id = w.id) as triggers
        FROM workflows."Workflow" w
        LEFT JOIN workflows."WorkflowTrigger" t ON t.workflow_id = w.id
        WHERE w.status = ${filters.status}
          AND t.event_name = ${filters.event_name}
        ORDER BY w.updated_at DESC
        LIMIT ${filters.limit} OFFSET ${filters.offset}
      `
      const countResult = await sql`
        SELECT COUNT(DISTINCT w.id) as count FROM workflows."Workflow" w
        LEFT JOIN workflows."WorkflowTrigger" t ON t.workflow_id = w.id
        WHERE w.status = ${filters.status}
          AND t.event_name = ${filters.event_name}
      `
      total = Number(countResult[0].count)
    } else if (filters.search) {
      workflows = await sql`
        SELECT w.*, 
          (SELECT COUNT(*) FROM workflows."WorkflowRun" r WHERE r.workflow_id = w.id) as run_count,
          (SELECT json_agg(json_build_object('event_name', t.event_name, 'id', t.id)) 
           FROM workflows."WorkflowTrigger" t WHERE t.workflow_id = w.id) as triggers
        FROM workflows."Workflow" w
        WHERE w.name ILIKE ${"%" + filters.search + "%"}
        ORDER BY w.updated_at DESC
        LIMIT ${filters.limit} OFFSET ${filters.offset}
      `
      const countResult = await sql`
        SELECT COUNT(*) as count FROM workflows."Workflow"
        WHERE name ILIKE ${"%" + filters.search + "%"}
      `
      total = Number(countResult[0].count)
    } else if (filters.status) {
      workflows = await sql`
        SELECT w.*, 
          (SELECT COUNT(*) FROM workflows."WorkflowRun" r WHERE r.workflow_id = w.id) as run_count,
          (SELECT json_agg(json_build_object('event_name', t.event_name, 'id', t.id)) 
           FROM workflows."WorkflowTrigger" t WHERE t.workflow_id = w.id) as triggers
        FROM workflows."Workflow" w
        WHERE w.status = ${filters.status}
        ORDER BY w.updated_at DESC
        LIMIT ${filters.limit} OFFSET ${filters.offset}
      `
      const countResult = await sql`
        SELECT COUNT(*) as count FROM workflows."Workflow"
        WHERE status = ${filters.status}
      `
      total = Number(countResult[0].count)
    } else if (filters.event_name) {
      workflows = await sql`
        SELECT DISTINCT w.*, 
          (SELECT COUNT(*) FROM workflows."WorkflowRun" r WHERE r.workflow_id = w.id) as run_count,
          (SELECT json_agg(json_build_object('event_name', t.event_name, 'id', t.id)) 
           FROM workflows."WorkflowTrigger" t WHERE t.workflow_id = w.id) as triggers
        FROM workflows."Workflow" w
        LEFT JOIN workflows."WorkflowTrigger" t ON t.workflow_id = w.id
        WHERE t.event_name = ${filters.event_name}
        ORDER BY w.updated_at DESC
        LIMIT ${filters.limit} OFFSET ${filters.offset}
      `
      const countResult = await sql`
        SELECT COUNT(DISTINCT w.id) as count FROM workflows."Workflow" w
        LEFT JOIN workflows."WorkflowTrigger" t ON t.workflow_id = w.id
        WHERE t.event_name = ${filters.event_name}
      `
      total = Number(countResult[0].count)
    } else {
      workflows = await sql`
        SELECT w.*, 
          (SELECT COUNT(*) FROM workflows."WorkflowRun" r WHERE r.workflow_id = w.id) as run_count,
          (SELECT json_agg(json_build_object('event_name', t.event_name, 'id', t.id)) 
           FROM workflows."WorkflowTrigger" t WHERE t.workflow_id = w.id) as triggers
        FROM workflows."Workflow" w
        ORDER BY w.updated_at DESC
        LIMIT ${filters.limit} OFFSET ${filters.offset}
      `
      const countResult = await sql`SELECT COUNT(*) as count FROM workflows."Workflow"`
      total = Number(countResult[0].count)
    }

    return NextResponse.json({
      workflows,
      total,
      limit: filters.limit,
      offset: filters.offset,
    })
  } catch (error) {
    console.error("Error listing workflows:", error)
    return NextResponse.json({ error: "Error listing workflows" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateWorkflowRequest = await request.json()

    if (!body.name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    // Create workflow
    const workflowResult = await sql`
      INSERT INTO workflows."Workflow" (name, description, entry_step_key, canvas_data)
      VALUES (
        ${body.name},
        ${body.description || null},
        ${body.entry_step_key || null},
        ${JSON.stringify(body.canvas_data || {})}::jsonb
      )
      RETURNING *
    `

    const workflow = workflowResult[0]

    // Create triggers if provided
    if (body.triggers && body.triggers.length > 0) {
      for (const trigger of body.triggers) {
        await sql`
          INSERT INTO workflows."WorkflowTrigger" (workflow_id, event_name, filter_expression, description)
          VALUES (${workflow.id}, ${trigger.event_name}, ${trigger.filter_expression || null}, ${trigger.description || null})
        `
      }
    }

    // Create steps if provided
    if (body.steps && body.steps.length > 0) {
      for (const step of body.steps) {
        await sql`
          INSERT INTO workflows."WorkflowStep" (
            workflow_id, step_key, name, type, config,
            next_step_on_success, next_step_on_error,
            max_retries, retry_delay_ms, position_x, position_y
          )
          VALUES (
            ${workflow.id},
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

    // Fetch complete workflow with triggers and steps
    const triggers = await sql`
      SELECT * FROM workflows."WorkflowTrigger" WHERE workflow_id = ${workflow.id}
    `
    const steps = await sql`
      SELECT * FROM workflows."WorkflowStep" WHERE workflow_id = ${workflow.id}
    `

    return NextResponse.json({
      ...workflow,
      triggers,
      steps,
    })
  } catch (error) {
    console.error("Error creating workflow:", error)
    return NextResponse.json({ error: "Error creating workflow" }, { status: 500 })
  }
}
