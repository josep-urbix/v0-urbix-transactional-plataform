import { sql } from "@/lib/db"
import { NextResponse } from "next/server"
import { gmailClient } from "@/lib/gmail-client"

// GET - Obtener configuración y estado
export async function GET() {
  try {
    // Obtener configuración de la base de datos
    const config = await sql`
      SELECT key, value, description, is_secret
      FROM emails.email_config
      ORDER BY key
    `

    // Verificar configuración de Gmail
    const verification = await gmailClient.verifyConfiguration()

    // Estadísticas generales
    const [stats] = await sql`
      SELECT 
        (SELECT COUNT(*) FROM emails.email_templates WHERE is_active = true) as active_templates,
        (SELECT COUNT(*) FROM emails.email_sends) as total_sends,
        (SELECT COUNT(*) FROM emails.email_sends WHERE status = 'sent') as sent_count,
        (SELECT COUNT(*) FROM emails.email_sends WHERE status = 'failed') as failed_count,
        (SELECT COUNT(*) FROM emails.email_sends WHERE created_at > NOW() - INTERVAL '24 hours') as sends_last_24h
    `

    return NextResponse.json({
      config: config.map((c) => ({
        ...c,
        value: c.is_secret ? "********" : c.value,
      })),
      verification,
      stats,
    })
  } catch (error) {
    console.error("Error obteniendo configuración:", error)
    return NextResponse.json({ error: "Error al obtener configuración" }, { status: 500 })
  }
}

// PUT - Actualizar configuración
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { key, value } = body

    if (!key) {
      return NextResponse.json({ error: "Se requiere key" }, { status: 400 })
    }

    await sql`
      UPDATE emails.email_config
      SET value = ${value}, updated_at = NOW()
      WHERE key = ${key}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error actualizando configuración:", error)
    return NextResponse.json({ error: "Error al actualizar configuración" }, { status: 500 })
  }
}
