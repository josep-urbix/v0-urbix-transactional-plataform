import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession, hasPermission, logDeniedAccess } from "@/lib/auth"
import { secureLog } from "@/lib/security"
import { rateLimit } from "@/lib/rate-limiter"

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

    const result = await sql`SELECT value, "updatedAt" FROM "AppConfig" WHERE key = 'hubspot_access_token' LIMIT 1`

    const config = result[0]
    const envTokenExists = !!process.env.HUBSPOT_ACCESS_TOKEN

    let maskedToken: string | null = null
    let tokenSource: "database" | "environment" | null = null

    if (config?.value) {
      const token = config.value
      maskedToken = token.length > 4 ? `${"*".repeat(token.length - 4)}${token.slice(-4)}` : "****"
      tokenSource = "database"
    } else if (envTokenExists) {
      const token = process.env.HUBSPOT_ACCESS_TOKEN!
      maskedToken = token.length > 4 ? `${"*".repeat(token.length - 4)}${token.slice(-4)}` : "****"
      tokenSource = "environment"
    }

    return NextResponse.json({
      hasToken: !!config?.value || envTokenExists,
      maskedToken,
      tokenSource,
      updatedAt: config?.updatedAt || null,
    })
  } catch (error) {
    secureLog("Settings API GET Error", { error })
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

    // Rate limiting: 10 updates per hour
    const rateLimitResult = rateLimit(`settings:hubspot-token:${session.user.id}`, {
      maxRequests: 10,
      windowMs: 60 * 60 * 1000,
    })

    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 })
    }

    const body = await request.json()
    const { newToken } = body

    if (!newToken || typeof newToken !== "string") {
      return NextResponse.json({ error: "Invalid token provided" }, { status: 400 })
    }

    if (newToken.length < 10) {
      return NextResponse.json({ error: "Token appears to be invalid (too short)" }, { status: 400 })
    }

    // Validate token format (HubSpot tokens typically start with specific prefixes)
    if (!newToken.startsWith("pat-") && !newToken.match(/^[a-f0-9-]{36,}$/i)) {
      return NextResponse.json(
        { error: "Token format appears invalid. Please verify the token from HubSpot." },
        { status: 400 },
      )
    }

    await sql`
      INSERT INTO "AppConfig" (key, value, "updatedAt")
      VALUES ('hubspot_access_token', ${newToken}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, "updatedAt" = NOW()
    `

    secureLog("HubSpot token updated successfully", { userId: session.user.id })

    return NextResponse.json({
      success: true,
      message: "HubSpot access token updated successfully",
    })
  } catch (error) {
    secureLog("Settings API PUT Error", { error })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
