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

    const types = await sql`
      SELECT 
        id,
        nombre,
        descripcion_template as descripcion,
        titulo_template,
        tipo,
        proceso,
        prioridad
      FROM tasks.task_templates
      WHERE activa = true
      ORDER BY nombre
    `

    await logSqlQuery("SELECT", "tasks.task_templates", startTime, types.length, session.user.id, {
      action: "get_task_types",
    })

    return NextResponse.json(types || [])
  } catch (error: any) {
    console.error("Error fetching task types:", error)
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
    const { nombre, descripcion, titulo_template, tipo, proceso, prioridad } = body

    if (!nombre) {
      return NextResponse.json({ error: "Missing required field: nombre" }, { status: 400 })
    }

    const startTime = Date.now()

    const result = await sql`
      INSERT INTO tasks.task_templates (nombre, descripcion_template, titulo_template, tipo, proceso, prioridad, activa, created_at, updated_at)
      VALUES (${nombre}, ${descripcion || null}, ${titulo_template || null}, ${tipo || null}, ${proceso || null}, ${prioridad || null}, true, NOW(), NOW())
      RETURNING id, nombre, descripcion_template as descripcion, titulo_template, tipo, proceso, prioridad
    `

    const type = result[0]

    await logSqlQuery("INSERT", "tasks.task_templates", startTime, 1, session.user.id, {
      nombre,
      descripcion,
      titulo_template,
      tipo,
      proceso,
      prioridad,
    })

    return NextResponse.json({ type }, { status: 201 })
  } catch (error: any) {
    console.error("Error creating task type:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
