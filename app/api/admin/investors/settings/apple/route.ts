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
    const { clientId, teamId, keyId, privateKey } = await request.json()

    if (!clientId || !teamId || !keyId) {
      return NextResponse.json({ error: "Client ID, Team ID y Key ID son requeridos" }, { status: 400 })
    }

    await ensureSettingsTable()

    // Save Apple config to database
    await sql`
      INSERT INTO investors."Settings" (key, value, updated_at)
      VALUES ('apple_client_id', ${clientId}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = ${clientId}, updated_at = NOW()
    `

    await sql`
      INSERT INTO investors."Settings" (key, value, updated_at)
      VALUES ('apple_team_id', ${teamId}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = ${teamId}, updated_at = NOW()
    `

    await sql`
      INSERT INTO investors."Settings" (key, value, updated_at)
      VALUES ('apple_key_id', ${keyId}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = ${keyId}, updated_at = NOW()
    `

    if (privateKey) {
      await sql`
        INSERT INTO investors."Settings" (key, value, updated_at)
        VALUES ('apple_private_key_set', 'true', NOW())
        ON CONFLICT (key) DO UPDATE SET value = 'true', updated_at = NOW()
      `
      // Note: In production, the private key should be stored securely or in env vars
      console.log("Apple Private Key provided - should be added to APPLE_INVESTOR_PRIVATE_KEY env var")
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving Apple config:", error)
    return NextResponse.json({ error: "Error al guardar configuración" }, { status: 500 })
  }
}
