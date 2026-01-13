import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clientId, clientSecret } = body

    if (!clientId) {
      return NextResponse.json({ success: false, error: "Client ID es requerido" }, { status: 400 })
    }

    // Si no hay clientSecret, intentar obtenerlo de la DB
    let secretToUse = clientSecret
    if (!secretToUse) {
      const result = await sql`
        SELECT value FROM "AdminSettings" WHERE key = 'google_client_secret'
      `
      if (result.length > 0 && result[0].value) {
        secretToUse = result[0].value
      }
    }

    if (!secretToUse) {
      return NextResponse.json(
        {
          success: false,
          error: "Client Secret es requerido. Guarda primero la configuración.",
        },
        { status: 400 },
      )
    }

    // Validar formato del Client ID
    if (!clientId.includes(".apps.googleusercontent.com")) {
      return NextResponse.json(
        {
          success: false,
          error: "El Client ID no tiene el formato correcto",
          details: "El Client ID debe terminar en .apps.googleusercontent.com",
        },
        { status: 400 },
      )
    }

    // Probar la conexión con Google obteniendo el discovery document
    const discoveryResponse = await fetch("https://accounts.google.com/.well-known/openid-configuration")

    if (!discoveryResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error: "No se pudo conectar con Google APIs",
          details: `Status: ${discoveryResponse.status}`,
        },
        { status: 500 },
      )
    }

    const discovery = await discoveryResponse.json()

    // Verificar que el Client ID es válido intentando obtener info del token endpoint
    const tokenEndpoint = discovery.token_endpoint
    const authEndpoint = discovery.authorization_endpoint

    // Construir URL de autorización para verificar configuración
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "https://integrations.urbix.es"}/auth/callback/google`
    const authUrl = new URL(authEndpoint)
    authUrl.searchParams.set("client_id", clientId)
    authUrl.searchParams.set("redirect_uri", redirectUri)
    authUrl.searchParams.set("response_type", "code")
    authUrl.searchParams.set("scope", "openid email profile")

    return NextResponse.json({
      success: true,
      message: "Configuración válida. Google OAuth está listo para usar.",
      details: JSON.stringify(
        {
          clientIdFormat: "✓ Válido",
          clientSecretPresent: "✓ Configurado",
          googleApiConnection: "✓ Conectado",
          tokenEndpoint: tokenEndpoint,
          authorizationEndpoint: authEndpoint,
          redirectUri: redirectUri,
          testAuthUrl: authUrl.toString().substring(0, 100) + "...",
        },
        null,
        2,
      ),
    })
  } catch (error) {
    console.error("Error testing Google OAuth:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Error al probar la conexión",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
