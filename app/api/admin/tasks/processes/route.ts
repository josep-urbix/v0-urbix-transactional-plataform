import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { logSqlQuery } from "@/lib/sql-logger"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const startTime = Date.now()

    const processes = await sql`
      SELECT 
        id,
        nombre,
        descripcion,
        titulo_template,
        descripcion_template,
        activa
      FROM tasks.process_templates
      WHERE activa = true
      ORDER BY nombre
    `

    await logSqlQuery("SELECT", "tasks.process_templates", startTime, processes.length, session.user.id, {
      action: "get_processes",
    })

    return NextResponse.json(processes || [])
  } catch (error: any) {
    console.error("Error fetching processes:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { nombre, descripcion, titulo_template, descripcion_template } = body

    if (!nombre || !titulo_template || !descripcion_template) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const startTime = Date.now()

    const result = await sql`
      INSERT INTO tasks.process_templates (nombre, descripcion, titulo_template, descripcion_template, activa, created_at, updated_at)
      VALUES (${nombre}, ${descripcion || null}, ${titulo_template}, ${descripcion_template}, true, NOW(), NOW())
      RETURNING id, nombre, descripcion, titulo_template, descripcion_template, activa
    `

    const process = result[0]

    await logSqlQuery("INSERT", "tasks.process_templates", startTime, 1, session.user.id, {
      nombre,
      descripcion,
    })

    return NextResponse.json(process, { status: 201 })
  } catch (error: any) {
    console.error("Error creating process:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
