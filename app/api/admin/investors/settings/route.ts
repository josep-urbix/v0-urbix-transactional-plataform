import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    let settingsMap = new Map<string, string>()

    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'investors' 
        AND table_name = 'Settings'
      ) as exists
    `

    if (tableExists[0]?.exists) {
      const settings = await sql`
        SELECT key, value FROM investors."Settings"
        WHERE key IN (
          'google_client_id', 
          'google_client_secret',
          'google_client_secret_set',
          'apple_client_id', 
          'apple_team_id', 
          'apple_key_id',
          'apple_private_key',
          'portal_url',
          'session_duration',
          'max_sessions',
          'require_email_verification',
          'require_2fa'
        )
      `

      const settingsArray = Array.isArray(settings) ? settings : settings?.rows || []
      settingsMap = new Map(settingsArray.map((s: { key: string; value: string }) => [s.key, s.value]))
    }

    const dbGoogleSecret = settingsMap.get("google_client_secret")
    const dbGoogleSecretSet = settingsMap.get("google_client_secret_set")
    const hasGoogleSecret = !!dbGoogleSecret

    const needsSecretResave = !!(dbGoogleSecretSet && !dbGoogleSecret)

    const dbApplePrivateKey = settingsMap.get("apple_private_key")
    const hasApplePrivateKey = !!dbApplePrivateKey

    const googleClientId = settingsMap.get("google_client_id") || null
    const appleClientId = settingsMap.get("apple_client_id") || null
    const appleTeamId = settingsMap.get("apple_team_id") || null
    const appleKeyId = settingsMap.get("apple_key_id") || null

    return NextResponse.json({
      google: {
        configured: !!(googleClientId && hasGoogleSecret),
        clientId: googleClientId,
        hasSecret: hasGoogleSecret,
        needsSecretResave,
      },
      apple: {
        configured: !!(appleClientId && appleTeamId && appleKeyId && hasApplePrivateKey),
        clientId: appleClientId,
        teamId: appleTeamId,
        keyId: appleKeyId,
        hasPrivateKey: hasApplePrivateKey,
      },
      general: {
        portalUrl: settingsMap.get("portal_url") || null,
        sessionDuration: Number.parseInt(settingsMap.get("session_duration") || "24"),
        maxSessions: Number.parseInt(settingsMap.get("max_sessions") || "5"),
        requireEmailVerification: settingsMap.get("require_email_verification") !== "false",
        require2FA: settingsMap.get("require_2fa") === "true",
      },
    })
  } catch (error) {
    console.error("Error fetching investor settings:", error)
    return NextResponse.json({ error: "Error al cargar configuración" }, { status: 500 })
  }
}
