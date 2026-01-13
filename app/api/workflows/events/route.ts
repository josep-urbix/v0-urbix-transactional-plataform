import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const events = await sql`
      SELECT 
        e.id,
        e.event_name as name,
        e.description,
        e.payload_schema,
        e.category,
        e.created_at,
        e.updated_at,
        COUNT(DISTINCT t.workflow_id) FILTER (WHERE t.is_active = true) as active_workflow_count
      FROM workflows."WorkflowEvent" e
      LEFT JOIN workflows."WorkflowTrigger" t ON t.event_name = e.event_name AND t.is_active = true
      WHERE e.is_active = true
      GROUP BY e.id, e.event_name, e.description, e.payload_schema, e.category, e.created_at, e.updated_at
      ORDER BY e.category, e.event_name
    `

    return NextResponse.json({ events })
  } catch (error) {
    console.error("Error listing workflow events:", error)
    return NextResponse.json({ error: "Error listing workflow events" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO workflows."WorkflowEvent" (event_name, description, payload_schema, category)
      VALUES (
        ${body.name},
        ${body.description || null},
        ${body.payload_schema ? JSON.stringify(body.payload_schema) : null}::jsonb,
        ${body.category || "general"}
      )
      ON CONFLICT (event_name) DO UPDATE SET
        description = EXCLUDED.description,
        payload_schema = EXCLUDED.payload_schema,
        category = EXCLUDED.category,
        updated_at = NOW()
      RETURNING 
        id,
        event_name as name,
        description,
        payload_schema,
        category,
        created_at,
        updated_at
    `

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error creating workflow event:", error)
    return NextResponse.json({ error: "Error creating workflow event" }, { status: 500 })
  }
}
