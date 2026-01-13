import { sql } from "@/lib/db"
import { NextResponse } from "next/server"
import type { EmailTemplate } from "@/lib/types/email"

// GET - Obtener template por ID o slug
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const isNumeric = /^\d+$/.test(id)

    const [template] = await sql<EmailTemplate[]>`
      SELECT * FROM emails.email_templates
      WHERE ${isNumeric ? sql`id = ${Number.parseInt(id)}` : sql`slug = ${id}`}
    `

    if (!template) {
      return NextResponse.json({ error: "Template no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error("Error obteniendo template:", error)
    return NextResponse.json({ error: "Error al obtener template" }, { status: 500 })
  }
}

// PUT - Actualizar template
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    const { name, description, from_email, from_name, reply_to, subject, body_html, body_text, variables, is_active } =
      body

    const [template] = await sql<EmailTemplate[]>`
      UPDATE emails.email_templates
      SET
        name = COALESCE(${name}, name),
        description = ${description !== undefined ? description : null},
        from_email = COALESCE(${from_email}, from_email),
        from_name = ${from_name !== undefined ? from_name : null},
        reply_to = ${reply_to !== undefined ? reply_to : null},
        subject = COALESCE(${subject}, subject),
        body_html = COALESCE(${body_html}, body_html),
        body_text = ${body_text !== undefined ? body_text : null},
        variables = COALESCE(${variables ? JSON.stringify(variables) : null}::jsonb, variables),
        is_active = COALESCE(${is_active}, is_active),
        updated_at = NOW()
      WHERE id = ${Number.parseInt(id)}
      RETURNING *
    `

    if (!template) {
      return NextResponse.json({ error: "Template no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error("Error actualizando template:", error)
    return NextResponse.json({ error: "Error al actualizar template" }, { status: 500 })
  }
}

// DELETE - Eliminar template
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Verificar si hay emails enviados con este template
    const [emailCount] = await sql`
      SELECT COUNT(*) as count FROM emails.email_sends WHERE template_id = ${Number.parseInt(id)}
    `

    if (Number.parseInt(emailCount.count) > 0) {
      // Soft delete - solo desactivar
      await sql`
        UPDATE emails.email_templates SET is_active = false WHERE id = ${Number.parseInt(id)}
      `
      return NextResponse.json({
        message: "Template desactivado (tiene emails asociados)",
        softDeleted: true,
      })
    }

    // Hard delete si no hay emails
    const result = await sql`
      DELETE FROM emails.email_templates WHERE id = ${Number.parseInt(id)}
      RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Template no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ message: "Template eliminado correctamente" })
  } catch (error) {
    console.error("Error eliminando template:", error)
    return NextResponse.json({ error: "Error al eliminar template" }, { status: 500 })
  }
}
