import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params
    const { id } = resolvedParams

    console.log("[v0] GET /api/admin/tasks/view/[id] - params received:", resolvedParams)
    console.log("[v0] GET /api/admin/tasks/view/[id] - params.id value:", id)

    // Validar que id es un UUID válido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      console.log("[v0] UUID validation FAILED for id:", id)
      return NextResponse.json({ error: "ID de tarea inválido. Debe ser un UUID válido." }, { status: 400 })
    }

    const result = await sql`
      SELECT 
        id, tipo, proceso, prioridad, estado, 
        titulo, descripcion, creado_por, fecha_creacion,
        asignado_a, cuenta_virtual_id, payment_account_id, contexto, fecha_vencimiento
      FROM tasks.tasks
      WHERE id = ${id}::uuid
    `

    const rows = Array.isArray(result) ? result : result?.rows || []

    console.log("[v0] Rows after processing:", rows)
    console.log("[v0] Rows length:", rows?.length)

    if (!rows.length) {
      console.log("[v0] Task not found for id:", id)
      return NextResponse.json({ error: "Tarea no encontrada." }, { status: 404 })
    }

    console.log("[v0] Task found:", rows[0])
    return NextResponse.json({ task: rows[0] })
  } catch (error) {
    console.error("[v0] Error fetching task:", error)
    return NextResponse.json({ error: "Error al cargar la tarea" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params
    const { id } = resolvedParams
    const body = await request.json()

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return NextResponse.json({ error: "ID de tarea inválido." }, { status: 400 })
    }

    const result = await sql`
      UPDATE tasks.tasks 
      SET estado = ${body.estado}, prioridad = ${body.prioridad}, descripcion = ${body.descripcion}
      WHERE id = ${id}::uuid
      RETURNING *
    `

    if (!result?.[0]) {
      return NextResponse.json({ error: "Tarea no encontrada." }, { status: 404 })
    }

    return NextResponse.json({ task: result[0] })
  } catch (error) {
    console.error("[v0] Error updating task:", error)
    return NextResponse.json({ error: "Error al actualizar la tarea" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params
    const { id } = resolvedParams

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return NextResponse.json({ error: "ID de tarea inválido." }, { status: 400 })
    }

    await sql`DELETE FROM tasks.tasks WHERE id = ${id}::uuid`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting task:", error)
    return NextResponse.json({ error: "Error al eliminar la tarea" }, { status: 500 })
  }
}
