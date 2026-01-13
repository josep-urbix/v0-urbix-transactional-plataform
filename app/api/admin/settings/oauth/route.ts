import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { cookies } from "next/headers"

// Verificar sesión de admin
async function getSession() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get("session")
  if (!sessionCookie?.value) return null
  try {
    return JSON.parse(sessionCookie.value)
  } catch {
    return null
  }
}

// GET - Obtener configuración OAuth del middleware
export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Verificar que la tabla existe
    try {
      const settings = await sql`
        SELECT key, value, description, is_secret FROM "AdminSettings"
        WHERE key IN ('google_client_id', 'google_client_secret', 'allowed_email_domains')
      `

      const result: Record<string, { value: string; description: string }> = {}
      for (const setting of settings) {
        result[setting.key] = {
          value: setting.is_secret ? (setting.value ? "••••••••" : "") : setting.value || "",
          description: setting.description || "",
        }
      }

      return NextResponse.json({
        google_client_id: result.google_client_id?.value || "",
        google_client_secret: result.google_client_secret?.value || "",
        allowed_email_domains: result.allowed_email_domains?.value || "urbix.es",
        configured: !!(result.google_client_id?.value && result.google_client_secret?.value),
      })
    } catch (e) {
      // Tabla no existe, devolver valores por defecto
      return NextResponse.json({
        google_client_id: "",
        google_client_secret: "",
        allowed_email_domains: process.env.ALLOWED_EMAIL_DOMAINS || "urbix.es",
        configured: false,
        table_missing: true,
      })
    }
  } catch (error) {
    console.error("Error getting admin OAuth settings:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// POST - Guardar configuración OAuth del middleware
export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { google_client_id, google_client_secret, allowed_email_domains } = body

    // Crear tabla si no existe
    await sql`
      CREATE TABLE IF NOT EXISTS "AdminSettings" (
        key VARCHAR(255) PRIMARY KEY,
        value TEXT,
        description TEXT,
        is_secret BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    // Guardar Client ID
    if (google_client_id !== undefined) {
      await sql`
        INSERT INTO "AdminSettings" (key, value, description, is_secret, updated_at)
        VALUES ('google_client_id', ${google_client_id}, 'Google OAuth Client ID para el panel de administración', false, NOW())
        ON CONFLICT (key) DO UPDATE SET value = ${google_client_id}, updated_at = NOW()
      `
    }

    // Guardar Client Secret (solo si se proporciona un valor nuevo, no el masked)
    if (google_client_secret && !google_client_secret.includes("•")) {
      await sql`
        INSERT INTO "AdminSettings" (key, value, description, is_secret, updated_at)
        VALUES ('google_client_secret', ${google_client_secret}, 'Google OAuth Client Secret para el panel de administración', true, NOW())
        ON CONFLICT (key) DO UPDATE SET value = ${google_client_secret}, updated_at = NOW()
      `
    }

    // Guardar dominios permitidos
    if (allowed_email_domains !== undefined) {
      await sql`
        INSERT INTO "AdminSettings" (key, value, description, is_secret, updated_at)
        VALUES ('allowed_email_domains', ${allowed_email_domains}, 'Dominios de email permitidos para login (separados por coma)', false, NOW())
        ON CONFLICT (key) DO UPDATE SET value = ${allowed_email_domains}, updated_at = NOW()
      `
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving admin OAuth settings:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
