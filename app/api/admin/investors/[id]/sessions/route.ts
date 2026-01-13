import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { isValidUUID } from "@/lib/utils/uuid"

// Obtener sesiones de un inversor
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    if (!isValidUUID(id)) {
      return NextResponse.json({ error: "ID de inversor inválido" }, { status: 400 })
    }

    const sessions = await sql`
      SELECT * FROM investors."Session"
      WHERE user_id = ${id}
      ORDER BY created_at DESC
    `

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error("Error obteniendo sesiones:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// Revocar todas las sesiones
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    if (!isValidUUID(id)) {
      return NextResponse.json({ error: "ID de inversor inválido" }, { status: 400 })
    }

    const result = await sql`
      UPDATE investors."Session"
      SET is_active = FALSE, revoked_at = NOW(), revoked_reason = 'admin_revoke'
      WHERE user_id = ${id} AND is_active = TRUE
    `

    return NextResponse.json({ success: true, revoked: result.length })
  } catch (error) {
    console.error("Error revocando sesiones:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
