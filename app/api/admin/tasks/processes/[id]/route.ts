import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { logSqlQuery } from "@/lib/sql-logger"

function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    if (!isValidUUID(id)) {
      return NextResponse.json({ error: "Invalid process ID format" }, { status: 400 })
    }

    const startTime = Date.now()

    const result = await sql`
      SELECT 
        id,
        nombre,
        descripcion,
        titulo_template,
        descripcion_template,
        activa
      FROM tasks.process_templates
      WHERE id = ${id}
    `

    if (!result || result.length === 0) {
      return NextResponse.json({ error: "Process not found" }, { status: 404 })
    }

    await logSqlQuery("SELECT", "tasks.process_templates", startTime, 1, session.user.id, {
      action: "get_process",
      id,
    })

    return NextResponse.json(result[0])
  } catch (error: any) {
    console.error("Error fetching process:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { nombre, descripcion, titulo_template, descripcion_template, activa } = body

    if (!isValidUUID(id)) {
      return NextResponse.json({ error: "Invalid process ID format" }, { status: 400 })
    }

    const startTime = Date.now()

    const result = await sql`
      UPDATE tasks.process_templates
      SET 
        nombre = ${nombre || null},
        descripcion = ${descripcion || null},
        titulo_template = ${titulo_template || null},
        descripcion_template = ${descripcion_template || null},
        activa = ${activa !== undefined ? activa : null},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, nombre, descripcion, titulo_template, descripcion_template, activa
    `

    if (!result || result.length === 0) {
      return NextResponse.json({ error: "Process not found" }, { status: 404 })
    }

    await logSqlQuery("UPDATE", "tasks.process_templates", startTime, 1, session.user.id, {
      id,
      nombre,
      descripcion,
    })

    return NextResponse.json(result[0])
  } catch (error: any) {
    console.error("Error updating process:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    if (!isValidUUID(id)) {
      return NextResponse.json({ error: "Invalid process ID format" }, { status: 400 })
    }

    const startTime = Date.now()

    await sql`
      DELETE FROM tasks.process_templates
      WHERE id = ${id}
    `

    await logSqlQuery("DELETE", "tasks.process_templates", startTime, 1, session.user.id, {
      id,
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    console.error("Error deleting process:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
