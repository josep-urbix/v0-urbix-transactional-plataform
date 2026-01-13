import { sql } from "@/lib/db"
import { NextResponse } from "next/server"
import type { EmailTemplate } from "@/lib/types/email"

// GET - Listar templates
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get("activeOnly") === "true"

    let templates: EmailTemplate[]

    if (activeOnly) {
      templates = await sql<EmailTemplate[]>`
        SELECT * FROM emails.email_templates
        WHERE is_active = true
        ORDER BY name ASC
      `
    } else {
      templates = await sql<EmailTemplate[]>`
        SELECT * FROM emails.email_templates
        ORDER BY name ASC
      `
    }

    return NextResponse.json({ templates })
  } catch (error) {
    console.error("Error listando templates:", error)

    // Check if it's a rate limit error
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes("Too Many Requests") || errorMessage.includes("rate limit")) {
      return NextResponse.json(
        { error: "Demasiadas peticiones. Por favor, espera un momento e intenta de nuevo." },
        { status: 429 },
      )
    }

    return NextResponse.json({ error: "Error al listar templates", details: errorMessage }, { status: 500 })
  }
}

// POST - Crear template
export async function POST(request: Request) {
  try {
    const body = await request.json()

    const { slug, name, description, from_email, from_name, reply_to, subject, body_html, body_text, variables } = body

    // Validaciones
    if (!slug || !name || !from_email || !subject || !body_html) {
      return NextResponse.json(
        { error: "Campos requeridos: slug, name, from_email, subject, body_html" },
        { status: 400 },
      )
    }

    // Verificar slug único
    const [existing] = await sql`
      SELECT id FROM emails.email_templates WHERE slug = ${slug}
    `

    if (existing) {
      return NextResponse.json({ error: "Ya existe un template con ese slug" }, { status: 400 })
    }

    const [template] = await sql<EmailTemplate[]>`
      INSERT INTO emails.email_templates (
        slug, name, description, from_email, from_name,
        reply_to, subject, body_html, body_text, variables
      ) VALUES (
        ${slug},
        ${name},
        ${description || null},
        ${from_email},
        ${from_name || null},
        ${reply_to || null},
        ${subject},
        ${body_html},
        ${body_text || null},
        ${JSON.stringify(variables || [])}::jsonb
      )
      RETURNING *
    `

    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    console.error("Error creando template:", error)
    return NextResponse.json({ error: "Error al crear template" }, { status: 500 })
  }
}
