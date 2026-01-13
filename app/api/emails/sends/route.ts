import { sql } from "@/lib/db"
import { NextResponse } from "next/server"
import type { EmailSend } from "@/lib/types/email"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    // Parámetros de filtro
    const status = searchParams.get("status")
    const templateSlug = searchParams.get("templateSlug")
    const toEmail = searchParams.get("toEmail")
    const fromDate = searchParams.get("fromDate")
    const toDate = searchParams.get("toDate")
    const search = searchParams.get("search")

    // Paginación
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Math.min(Number.parseInt(searchParams.get("limit") || "50"), 100)
    const offset = (page - 1) * limit

    // Query base para emails enviados
    let sends: EmailSend[] = []
    let total = 0

    // Obtener total y registros según los filtros
    if (status && templateSlug && search) {
      const countResult = await sql`
        SELECT COUNT(*) as total 
        FROM emails.email_sends s
        WHERE s.status = ${status}
        AND s.template_slug = ${templateSlug}
        AND (s.to_email ILIKE ${"%" + search + "%"} OR s.subject ILIKE ${"%" + search + "%"})
      `
      total = Number.parseInt(countResult[0].total)

      sends = (await sql`
        SELECT s.*, t.name as template_name
        FROM emails.email_sends s
        LEFT JOIN emails.email_templates t ON s.template_id = t.id
        WHERE s.status = ${status}
        AND s.template_slug = ${templateSlug}
        AND (s.to_email ILIKE ${"%" + search + "%"} OR s.subject ILIKE ${"%" + search + "%"})
        ORDER BY s.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `) as EmailSend[]
    } else if (status && templateSlug) {
      const countResult = await sql`
        SELECT COUNT(*) as total 
        FROM emails.email_sends s
        WHERE s.status = ${status} AND s.template_slug = ${templateSlug}
      `
      total = Number.parseInt(countResult[0].total)

      sends = (await sql`
        SELECT s.*, t.name as template_name
        FROM emails.email_sends s
        LEFT JOIN emails.email_templates t ON s.template_id = t.id
        WHERE s.status = ${status} AND s.template_slug = ${templateSlug}
        ORDER BY s.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `) as EmailSend[]
    } else if (status && search) {
      const countResult = await sql`
        SELECT COUNT(*) as total 
        FROM emails.email_sends s
        WHERE s.status = ${status}
        AND (s.to_email ILIKE ${"%" + search + "%"} OR s.subject ILIKE ${"%" + search + "%"})
      `
      total = Number.parseInt(countResult[0].total)

      sends = (await sql`
        SELECT s.*, t.name as template_name
        FROM emails.email_sends s
        LEFT JOIN emails.email_templates t ON s.template_id = t.id
        WHERE s.status = ${status}
        AND (s.to_email ILIKE ${"%" + search + "%"} OR s.subject ILIKE ${"%" + search + "%"})
        ORDER BY s.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `) as EmailSend[]
    } else if (templateSlug && search) {
      const countResult = await sql`
        SELECT COUNT(*) as total 
        FROM emails.email_sends s
        WHERE s.template_slug = ${templateSlug}
        AND (s.to_email ILIKE ${"%" + search + "%"} OR s.subject ILIKE ${"%" + search + "%"})
      `
      total = Number.parseInt(countResult[0].total)

      sends = (await sql`
        SELECT s.*, t.name as template_name
        FROM emails.email_sends s
        LEFT JOIN emails.email_templates t ON s.template_id = t.id
        WHERE s.template_slug = ${templateSlug}
        AND (s.to_email ILIKE ${"%" + search + "%"} OR s.subject ILIKE ${"%" + search + "%"})
        ORDER BY s.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `) as EmailSend[]
    } else if (status) {
      const countResult = await sql`
        SELECT COUNT(*) as total 
        FROM emails.email_sends s
        WHERE s.status = ${status}
      `
      total = Number.parseInt(countResult[0].total)

      sends = (await sql`
        SELECT s.*, t.name as template_name
        FROM emails.email_sends s
        LEFT JOIN emails.email_templates t ON s.template_id = t.id
        WHERE s.status = ${status}
        ORDER BY s.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `) as EmailSend[]
    } else if (templateSlug) {
      const countResult = await sql`
        SELECT COUNT(*) as total 
        FROM emails.email_sends s
        WHERE s.template_slug = ${templateSlug}
      `
      total = Number.parseInt(countResult[0].total)

      sends = (await sql`
        SELECT s.*, t.name as template_name
        FROM emails.email_sends s
        LEFT JOIN emails.email_templates t ON s.template_id = t.id
        WHERE s.template_slug = ${templateSlug}
        ORDER BY s.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `) as EmailSend[]
    } else if (search) {
      const countResult = await sql`
        SELECT COUNT(*) as total 
        FROM emails.email_sends s
        WHERE s.to_email ILIKE ${"%" + search + "%"} OR s.subject ILIKE ${"%" + search + "%"}
      `
      total = Number.parseInt(countResult[0].total)

      sends = (await sql`
        SELECT s.*, t.name as template_name
        FROM emails.email_sends s
        LEFT JOIN emails.email_templates t ON s.template_id = t.id
        WHERE s.to_email ILIKE ${"%" + search + "%"} OR s.subject ILIKE ${"%" + search + "%"}
        ORDER BY s.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `) as EmailSend[]
    } else {
      // Sin filtros
      const countResult = await sql`
        SELECT COUNT(*) as total FROM emails.email_sends
      `
      total = Number.parseInt(countResult[0].total)

      sends = (await sql`
        SELECT s.*, t.name as template_name
        FROM emails.email_sends s
        LEFT JOIN emails.email_templates t ON s.template_id = t.id
        ORDER BY s.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `) as EmailSend[]
    }

    // Estadísticas rápidas
    const stats = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'sent') as sent,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'pending' OR status = 'sending') as pending
      FROM emails.email_sends
    `

    return NextResponse.json({
      sends,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: stats[0],
    })
  } catch (error) {
    console.error("Error listando emails:", error)
    return NextResponse.json({ error: "Error al listar emails" }, { status: 500 })
  }
}
