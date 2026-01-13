import { sql } from "@/lib/db"
import { NextResponse } from "next/server"
import type { EmailSend } from "@/lib/types/email"

// GET - Obtener detalle de un email enviado
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const [send] = await sql<EmailSend[]>`
      SELECT 
        s.*,
        t.name as template_name,
        t.slug as template_slug_ref
      FROM emails.email_sends s
      LEFT JOIN emails.email_templates t ON s.template_id = t.id
      WHERE s.id = ${Number.parseInt(id)}
    `

    if (!send) {
      return NextResponse.json({ error: "Email no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ send })
  } catch (error) {
    console.error("Error obteniendo email:", error)
    return NextResponse.json({ error: "Error al obtener email" }, { status: 500 })
  }
}
