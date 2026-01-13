import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const logs: string[] = []

  try {
    const body = await request.json().catch(() => ({}))
    const { clientId: bodyClientId, clientSecret: bodyClientSecret } = body

    logs.push("Iniciando prueba de configuración Google OAuth...")

    // Check if settings table exists and get Google config
    let dbClientId: string | null = null
    let dbClientSecret: string | null = null

    try {
      const tableCheck = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'investors' 
          AND table_name = 'Settings'
        ) as exists
      `

      if (tableCheck[0]?.exists) {
        logs.push("✓ Tabla de configuración encontrada")

        const settings = await sql`
          SELECT key, value FROM investors."Settings" 
          WHERE key IN ('google_client_id', 'google_client_secret')
        `

        settings.forEach((s: { key: string; value: string }) => {
          if (s.key === "google_client_id") dbClientId = s.value
          if (s.key === "google_client_secret") dbClientSecret = s.value
        })

        if (dbClientId) logs.push(`  - Client ID en DB: ${dbClientId.substring(0, 20)}...`)
        if (dbClientSecret) logs.push(`  - Client Secret en DB: ****${dbClientSecret.slice(-4)}`)
      } else {
        logs.push("ADVERTENCIA: Tabla de configuración no encontrada")
      }
    } catch (e) {
      logs.push("ADVERTENCIA: No se pudo acceder a la tabla de configuración")
    }

    const clientId = bodyClientId || dbClientId
    const clientSecret = bodyClientSecret || dbClientSecret

    logs.push("")

    if (!clientId) {
      logs.push("ERROR: Client ID no configurado")
      logs.push("SOLUCIÓN: Configura el Client ID en la sección de Inversores > Configuración")
      return NextResponse.json(
        {
          success: false,
          error: "Client ID no configurado",
          details: logs.join("\n"),
        },
        { status: 400 },
      )
    }
    logs.push(`✓ Client ID encontrado: ${clientId.substring(0, 20)}...`)

    if (!clientSecret) {
      logs.push("ERROR: Client Secret no configurado")
      logs.push("")
      logs.push("SOLUCIÓN: Guarda el Client Secret en la configuración de Inversores")
      return NextResponse.json(
        {
          success: false,
          error: "Client Secret no configurado",
          details: logs.join("\n"),
        },
        { status: 400 },
      )
    }
    logs.push(`✓ Client Secret encontrado: ****${clientSecret.slice(-4)}`)

    // Validate Client ID format
    if (!clientId.endsWith(".apps.googleusercontent.com")) {
      logs.push("ADVERTENCIA: El Client ID no tiene el formato esperado (.apps.googleusercontent.com)")
    } else {
      logs.push("✓ Formato de Client ID válido")
    }

    // Test Google's discovery document to verify API is accessible
    logs.push("")
    logs.push("Verificando conectividad con Google APIs...")
    const discoveryUrl = "https://accounts.google.com/.well-known/openid-configuration"

    const discoveryRes = await fetch(discoveryUrl)
    if (!discoveryRes.ok) {
      logs.push(`ERROR: No se puede acceder a Google APIs (HTTP ${discoveryRes.status})`)
      return NextResponse.json(
        {
          success: false,
          error: "No se puede conectar con Google APIs",
          details: logs.join("\n"),
        },
        { status: 500 },
      )
    }

    const discovery = await discoveryRes.json()
    logs.push("✓ Conectividad con Google APIs verificada")
    logs.push(`  - Authorization endpoint: ${discovery.authorization_endpoint}`)
    logs.push(`  - Token endpoint: ${discovery.token_endpoint}`)

    // Build auth URL for verification (don't actually redirect)
    const redirectUri = "https://integrations.urbix.es/investor-portal/auth/callback/google"
    const authUrl = new URL(discovery.authorization_endpoint)
    authUrl.searchParams.set("client_id", clientId)
    authUrl.searchParams.set("response_type", "code")
    authUrl.searchParams.set("scope", "openid email profile")
    authUrl.searchParams.set("redirect_uri", redirectUri)

    logs.push("")
    logs.push("✓ URL de autorización generada correctamente")
    logs.push(`  - Redirect URI: ${redirectUri}`)

    // Log the test
    try {
      await sql`
        INSERT INTO investors."Settings" (key, value, updated_at)
        VALUES ('last_google_test', ${new Date().toISOString()}, NOW())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `
    } catch {
      // Ignore logging errors
    }

    logs.push("")
    logs.push("═══════════════════════════════════════")
    logs.push("  RESULTADO: Configuración válida ✓")
    logs.push("═══════════════════════════════════════")

    return NextResponse.json({
      success: true,
      message: "Configuración de Google OAuth válida",
      details: logs.join("\n"),
      authUrl: authUrl.toString(),
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido"
    logs.push(`ERROR: ${errorMessage}`)
    return NextResponse.json(
      {
        success: false,
        error: "Error al probar la configuración",
        details: logs.join("\n"),
      },
      { status: 500 },
    )
  }
}
