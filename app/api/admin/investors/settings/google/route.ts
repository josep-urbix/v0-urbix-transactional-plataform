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
  await sql`DELETE FROM investors."Settings" WHERE key = 'google_client_secret_set'`
}

export async function POST(request: NextRequest) {
  try {
    const { clientId, clientSecret } = await request.json()

    if (!clientId) {
      return NextResponse.json({ error: "Client ID es requerido" }, { status: 400 })
    }

    await ensureSettingsTable()

    // Save Client ID
    await sql`
      INSERT INTO investors."Settings" (key, value, updated_at)
      VALUES ('google_client_id', ${clientId}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = ${clientId}, updated_at = NOW()
    `

    if (clientSecret) {
      await sql`
        INSERT INTO investors."Settings" (key, value, updated_at)
        VALUES ('google_client_secret', ${clientSecret}, NOW())
        ON CONFLICT (key) DO UPDATE SET value = ${clientSecret}, updated_at = NOW()
      `
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving Google config:", error)
    return NextResponse.json({ error: "Error al guardar configuración" }, { status: 500 })
  }
}
