export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const cronJobs = await sql`
      SELECT * FROM "CronJob"
      ORDER BY name ASC
    `

    // Get recent executions for each job
    const jobsWithExecutions = await Promise.all(
      cronJobs.map(async (job) => {
        const recentExecutions = await sql`
          SELECT id, started_at, finished_at, duration_ms, status, error_message
          FROM "CronJobExecution"
          WHERE cron_job_id = ${job.id}
          ORDER BY started_at DESC
          LIMIT 10
        `
        return {
          id: job.id,
          name: job.name,
          description: job.description,
          endpoint: job.endpoint,
          schedule: job.schedule,
          is_active: job.is_active,
          created_at: job.created_at,
          updated_at: job.updated_at,
          unique_id: job.unique_id,
          recent_executions: recentExecutions.map((ex) => {
            let errorMsg = null
            if (ex.error_message) {
              try {
                errorMsg = typeof ex.error_message === "string" ? ex.error_message : JSON.stringify(ex.error_message)
                errorMsg = errorMsg.substring(0, 200)
              } catch {
                errorMsg = "Error message could not be serialized"
              }
            }
            return {
              id: ex.id,
              started_at: ex.started_at,
              finished_at: ex.finished_at,
              duration_ms: ex.duration_ms,
              status: ex.status,
              error_message: errorMsg,
            }
          }),
        }
      }),
    )

    return NextResponse.json({ cronJobs: jobsWithExecutions })
  } catch (error: any) {
    const errorMsg = error?.message || "Unknown error"
    console.error("[API] Error fetching cron jobs:", errorMsg)
    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, description, endpoint, schedule, is_active } = body

    if (!name || !endpoint || !schedule) {
      return NextResponse.json({ error: "Name, endpoint, and schedule are required" }, { status: 400 })
    }

    const created = await sql`
      INSERT INTO "CronJob" (name, description, endpoint, schedule, is_active, created_at, updated_at)
      VALUES (${name}, ${description || ""}, ${endpoint}, ${schedule}, ${is_active ?? true}, NOW(), NOW())
      RETURNING *
    `

    return NextResponse.json({ cronJob: created[0] }, { status: 201 })
  } catch (error: any) {
    console.error("[API] Error creating cron job:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, name, description, endpoint, schedule, is_active } = body

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 })
    }

    // Permitir actualización parcial o completa
    const updates: Record<string, any> = { updated_at: "NOW()" }
    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description
    if (endpoint !== undefined) updates.endpoint = endpoint
    if (schedule !== undefined) updates.schedule = schedule
    if (is_active !== undefined) updates.is_active = is_active

    const updateClauses = Object.entries(updates)
      .map(([key, value]) => `${key} = ${value === "NOW()" ? "NOW()" : `'${value}'`}`)
      .join(", ")

    const updated = await sql.query(`UPDATE "CronJob" SET ${updateClauses} WHERE id = $1 RETURNING *`, [id])

    if (updated.length === 0) {
      return NextResponse.json({ error: "Cron job not found" }, { status: 404 })
    }

    return NextResponse.json({ cronJob: updated[0] })
  } catch (error: any) {
    console.error("[API] Error updating cron job:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 })
    }

    await sql`
      DELETE FROM "CronJobExecution"
      WHERE cron_job_id = ${Number.parseInt(id)}
    `

    const deleted = await sql`
      DELETE FROM "CronJob"
      WHERE id = ${Number.parseInt(id)}
      RETURNING *
    `

    if (deleted.length === 0) {
      return NextResponse.json({ error: "Cron job not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Cron job deleted successfully" })
  } catch (error: any) {
    const errorMsg = error?.message || "Unknown error"
    console.error("[API] Error deleting cron job:", errorMsg)
    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}
