import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

async function ensureSettingsTable() {
  await sql`CREATE SCHEMA IF NOT EXISTS investors`
  await sql`
    CREATE TABLE IF NOT EXISTS investors."Settings" (
      key VARCHAR(100) PRIMARY KEY,
      value TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `
}

export async function POST(request: NextRequest) {
  try {
    const { portalUrl, sessionDuration, maxSessions, requireEmailVerification, require2FA } = await request.json()

    await ensureSettingsTable()

    // Save general settings
    const settings = [
      { key: "portal_url", value: portalUrl || "" },
      { key: "session_duration", value: String(sessionDuration || 24) },
      { key: "max_sessions", value: String(maxSessions || 5) },
      { key: "require_email_verification", value: String(requireEmailVerification) },
      { key: "require_2fa", value: String(require2FA) },
    ]

    for (const setting of settings) {
      await sql`
        INSERT INTO investors."Settings" (key, value, updated_at)
        VALUES (${setting.key}, ${setting.value}, NOW())
        ON CONFLICT (key) DO UPDATE SET value = ${setting.value}, updated_at = NOW()
      `
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving general config:", error)
    return NextResponse.json({ error: "Error al guardar configuración" }, { status: 500 })
  }
}
