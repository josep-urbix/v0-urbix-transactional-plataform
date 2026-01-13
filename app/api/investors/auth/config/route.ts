import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const settingsQuery = `
      SELECT key, value 
      FROM public."AdminSettings" 
      WHERE key IN ('investor_portal_google_oauth_enabled', 'investor_portal_magic_link_enabled', 'investor_portal_password_login_enabled')
    `
    const settings = await sql(settingsQuery)

    const config = {
      googleOAuthEnabled: settings.find((s) => s.key === "investor_portal_google_oauth_enabled")?.value !== "false",
      magicLinkEnabled: settings.find((s) => s.key === "investor_portal_magic_link_enabled")?.value !== "false",
      passwordLoginEnabled: settings.find((s) => s.key === "investor_portal_password_login_enabled")?.value !== "false",
    }

    return NextResponse.json(config)
  } catch (error) {
    console.error("Error fetching auth config:", error)
    // Return all enabled by default on error
    return NextResponse.json({
      googleOAuthEnabled: true,
      magicLinkEnabled: true,
      passwordLoginEnabled: true,
    })
  }
}
