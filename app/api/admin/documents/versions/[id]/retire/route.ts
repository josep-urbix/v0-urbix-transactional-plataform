import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth"

// POST - Retirar versión
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(["admin", "superadmin"])

    const { id } = await params

    // Verificar estado actual
    const current = await sql`
      SELECT status FROM documentos.document_version WHERE id = ${id}
    `

    if (current.length === 0) {
      return NextResponse.json({ error: "Versión no encontrada" }, { status: 404 })
    }

    if (current[0].status !== "publicado") {
      return NextResponse.json({ error: "Solo se pueden retirar versiones publicadas" }, { status: 400 })
    }

    const result = await sql`
      UPDATE documentos.document_version
      SET 
        status = 'retirado',
        fecha_retiro = NOW()
      WHERE id = ${id}
      RETURNING *
    `

    return NextResponse.json({ version: result[0] })
  } catch (error: any) {
    console.error("[Documents] Error retiring version:", error)
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }
    return NextResponse.json({ error: "Error al retirar versión" }, { status: 500 })
  }
}
