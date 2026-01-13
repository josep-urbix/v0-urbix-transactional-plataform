import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession, hasPermission, logDeniedAccess } from "@/lib/auth"

export async function GET() {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const permCheck = await hasPermission(session.user, "settings:view")
    if (!permCheck.allowed) {
      await logDeniedAccess(
        "settings",
        "view",
        permCheck.reason || "Permiso denegado",
        session.user.id,
        session.user.email,
        session.user.role,
      )
      return NextResponse.json({ error: "Sin permisos suficientes" }, { status: 403 })
    }

    const result = await sql`SELECT value, "updatedAt" FROM "AppConfig" WHERE key = 'webhook_api_key' LIMIT 1`

    const config = result[0]
    const envKeyExists = !!process.env.HUBSPOT_WEBHOOK_SECRET

    let maskedKey: string | null = null
    let keySource: "database" | "environment" | null = null

    if (config?.value) {
      const key = config.value
      maskedKey = key.length > 8 ? `${key.slice(0, 4)}${"*".repeat(key.length - 8)}${key.slice(-4)}` : "****"
      keySource = "database"
    } else if (envKeyExists) {
      const key = process.env.HUBSPOT_WEBHOOK_SECRET!
      maskedKey = key.length > 8 ? `${key.slice(0, 4)}${"*".repeat(key.length - 8)}${key.slice(-4)}` : "****"
      keySource = "environment"
    }

    return NextResponse.json({
      hasKey: !!config?.value || envKeyExists,
      maskedKey,
      keySource,
      updatedAt: config?.updatedAt || null,
    })
  } catch (error) {
    console.error("[Settings API] GET Webhook Key Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const permCheck = await hasPermission(session.user, "settings:update")
    if (!permCheck.allowed) {
      await logDeniedAccess(
        "settings",
        "update",
        permCheck.reason || "Permiso denegado",
        session.user.id,
        session.user.email,
        session.user.role,
      )
      return NextResponse.json({ error: "Sin permisos suficientes" }, { status: 403 })
    }

    const body = await request.json()
    const { newKey } = body

    if (!newKey || typeof newKey !== "string") {
      return NextResponse.json({ error: "Invalid API key provided" }, { status: 400 })
    }

    if (newKey.length < 16) {
      return NextResponse.json({ error: "API key must be at least 16 characters for security" }, { status: 400 })
    }

    await sql`
      INSERT INTO "AppConfig" (key, value, "updatedAt")
      VALUES ('webhook_api_key', ${newKey}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, "updatedAt" = NOW()
    `

    return NextResponse.json({
      success: true,
      message: "Webhook API key updated successfully",
    })
  } catch (error) {
    console.error("[Settings API] PUT Webhook Key Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
