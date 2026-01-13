import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth"

// GET - Obtener versión por ID
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(["admin", "superadmin"])

    const { id } = await params

    const result = await sql`
      SELECT 
        dv.*,
        dt.name as type_name,
        dt.display_name as type_display_name,
        uc.name as created_by_name,
        up.name as published_by_name
      FROM documentos.document_version dv
      JOIN documentos.document_type dt ON dv.document_type_id = dt.id
      LEFT JOIN public."User" uc ON dv.created_by_admin_id = uc.id
      LEFT JOIN public."User" up ON dv.published_by_admin_id = up.id
      WHERE dv.id = ${id}
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Versión no encontrada" }, { status: 404 })
    }

    return NextResponse.json({ version: result[0] })
  } catch (error: any) {
    console.error("[Documents] Error getting version:", error)
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }
    return NextResponse.json({ error: "Error al obtener versión" }, { status: 500 })
  }
}

// PUT - Actualizar versión (solo borrador)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(["admin", "superadmin"])

    const { id } = await params
    const body = await request.json()

    // Verificar que la versión está en borrador
    const current = await sql`
      SELECT status FROM documentos.document_version WHERE id = ${id}
    `

    if (current.length === 0) {
      return NextResponse.json({ error: "Versión no encontrada" }, { status: 404 })
    }

    if (current[0].status !== "borrador") {
      return NextResponse.json({ error: "Solo se pueden editar versiones en estado borrador" }, { status: 400 })
    }

    const { contenido_html, variables_disponibles, notas_version } = body

    const result = await sql`
      UPDATE documentos.document_version
      SET
        contenido_html = COALESCE(${contenido_html}, contenido_html),
        variables_disponibles = COALESCE(${variables_disponibles ? JSON.stringify(variables_disponibles) : null}::jsonb, variables_disponibles),
        notas_version = COALESCE(${notas_version}, notas_version),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `

    return NextResponse.json({ version: result[0] })
  } catch (error: any) {
    console.error("[Documents] Error updating version:", error)
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }
    return NextResponse.json({ error: "Error al actualizar versión" }, { status: 500 })
  }
}

// DELETE - Eliminar versión (solo borrador)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(["admin", "superadmin"])

    const { id } = await params

    // Verificar que la versión está en borrador
    const current = await sql`
      SELECT status FROM documentos.document_version WHERE id = ${id}
    `

    if (current.length === 0) {
      return NextResponse.json({ error: "Versión no encontrada" }, { status: 404 })
    }

    if (current[0].status !== "borrador") {
      return NextResponse.json({ error: "Solo se pueden eliminar versiones en estado borrador" }, { status: 400 })
    }

    await sql`DELETE FROM documentos.document_version WHERE id = ${id}`

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[Documents] Error deleting version:", error)
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }
    return NextResponse.json({ error: "Error al eliminar versión" }, { status: 500 })
  }
}
