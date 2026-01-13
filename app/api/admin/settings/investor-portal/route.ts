import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { logSqlExecution } from "@/lib/sql-logger"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const settings = await sql`
      SELECT key, value 
      FROM public."AdminSettings" 
      WHERE key IN ('investor_portal_google_oauth_enabled', 'investor_portal_magic_link_enabled', 'investor_portal_password_login_enabled')
    `

    await logSqlExecution({
      query: "SELECT investor portal settings",
      params: [],
      result: settings,
      duration: 0,
      user_email: session.user?.email || "system",
      success: true,
    })

    const config = {
      google_oauth_enabled: settings.find((s) => s.key === "investor_portal_google_oauth_enabled")?.value === "true",
      magic_link_enabled: settings.find((s) => s.key === "investor_portal_magic_link_enabled")?.value === "true",
      password_login_enabled:
        settings.find((s) => s.key === "investor_portal_password_login_enabled")?.value === "true",
    }

    return NextResponse.json({ config })
  } catch (error) {
    console.error("Error fetching investor portal settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || !["admin", "superadmin"].includes(session.user?.role?.toLowerCase() || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { google_oauth_enabled, magic_link_enabled, password_login_enabled } = await request.json()

    // Validate at least one method is enabled
    if (!google_oauth_enabled && !magic_link_enabled && !password_login_enabled) {
      return NextResponse.json({ error: "At least one authentication method must be enabled" }, { status: 400 })
    }

    const settings = [
      { key: "investor_portal_google_oauth_enabled", value: String(google_oauth_enabled) },
      { key: "investor_portal_magic_link_enabled", value: String(magic_link_enabled) },
      { key: "investor_portal_password_login_enabled", value: String(password_login_enabled) },
    ]

    for (const setting of settings) {
      await sql`
        INSERT INTO public."AdminSettings" (key, value, updated_at)
        VALUES (${setting.key}, ${setting.value}, NOW())
        ON CONFLICT (key) 
        DO UPDATE SET value = ${setting.value}, updated_at = NOW()
      `

      await logSqlExecution({
        query: `UPDATE investor portal setting: ${setting.key}`,
        params: [setting.key, setting.value],
        result: null,
        duration: 0,
        user_email: session.user?.email || "system",
        success: true,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving investor portal settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
