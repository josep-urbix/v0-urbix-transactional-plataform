import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth"

// GET - Obtener tipo de documento por ID
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(["admin", "superadmin"])

    const { id } = await params

    const result = await sql`
      SELECT 
        dt.*,
        u.name as created_by_name
      FROM documentos.document_type dt
      LEFT JOIN public."User" u ON dt.created_by_admin_id = u.id
      WHERE dt.id = ${id}
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Tipo de documento no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ type: result[0] })
  } catch (error: any) {
    console.error("[Documents] Error getting type:", error)
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }
    return NextResponse.json({ error: "Error al obtener tipo de documento" }, { status: 500 })
  }
}

// PUT - Actualizar tipo de documento
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(["admin", "superadmin"])

    const { id } = await params
    const body = await request.json()
    const {
      display_name,
      description,
      requiere_firma,
      obligatorio_antes_de_invertir,
      aplica_a_proyecto,
      dias_validez,
      orden,
      activo,
    } = body

    const result = await sql`
      UPDATE documentos.document_type
      SET
        display_name = COALESCE(${display_name}, display_name),
        description = COALESCE(${description}, description),
        requiere_firma = COALESCE(${requiere_firma}, requiere_firma),
        obligatorio_antes_de_invertir = COALESCE(${obligatorio_antes_de_invertir}, obligatorio_antes_de_invertir),
        aplica_a_proyecto = COALESCE(${aplica_a_proyecto}, aplica_a_proyecto),
        dias_validez = ${dias_validez},
        orden = COALESCE(${orden}, orden),
        activo = COALESCE(${activo}, activo),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Tipo de documento no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ type: result[0] })
  } catch (error: any) {
    console.error("[Documents] Error updating type:", error)
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }
    return NextResponse.json({ error: "Error al actualizar tipo de documento" }, { status: 500 })
  }
}

// DELETE - Eliminar tipo de documento
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(["admin", "superadmin"])

    const { id } = await params

    // Verificar si tiene documentos firmados
    const signed = await sql`
      SELECT COUNT(*) as count
      FROM documentos.signed_document sd
      JOIN documentos.document_version dv ON sd.document_version_id = dv.id
      WHERE dv.document_type_id = ${id}
    `

    if (Number.parseInt(signed[0].count) > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar un tipo de documento con documentos firmados" },
        { status: 400 },
      )
    }

    const result = await sql`
      DELETE FROM documentos.document_type
      WHERE id = ${id}
      RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Tipo de documento no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[Documents] Error deleting type:", error)
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }
    return NextResponse.json({ error: "Error al eliminar tipo de documento" }, { status: 500 })
  }
}
