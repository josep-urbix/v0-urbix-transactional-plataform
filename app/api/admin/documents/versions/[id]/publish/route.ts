import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth"

// POST - Publicar versión
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(["admin", "superadmin"])

    const { id } = await params

    // Verificar estado actual
    const current = await sql`
      SELECT status, document_type_id FROM documentos.document_version WHERE id = ${id}
    `

    if (current.length === 0) {
      return NextResponse.json({ error: "Versión no encontrada" }, { status: 404 })
    }

    if (current[0].status !== "borrador") {
      return NextResponse.json({ error: "Solo se pueden publicar versiones en estado borrador" }, { status: 400 })
    }

    // Retirar versión publicada anterior del mismo tipo (si existe)
    await sql`
      UPDATE documentos.document_version
      SET status = 'retirado', fecha_retiro = NOW()
      WHERE document_type_id = ${current[0].document_type_id}
        AND status = 'publicado'
        AND id != ${id}
    `

    // Publicar la nueva versión
    const result = await sql`
      UPDATE documentos.document_version
      SET 
        status = 'publicado',
        fecha_publicacion = NOW(),
        published_by_admin_id = ${session.user.id}
      WHERE id = ${id}
      RETURNING *
    `

    return NextResponse.json({ version: result[0] })
  } catch (error: any) {
    console.error("[Documents] Error publishing version:", error)
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }
    return NextResponse.json({ error: "Error al publicar versión" }, { status: 500 })
  }
}
