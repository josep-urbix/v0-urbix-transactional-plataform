import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getCorsHeaders, corsResponse } from "@/lib/investor-auth/cors"
import crypto from "crypto"
import { createSession } from "@/lib/investor-auth/session"
import type { InvestorUser } from "@/lib/types/investor"

function generateOAuthState(): string {
  const timestamp = Date.now().toString()
  const nonce = crypto.randomUUID()
  const data = `${timestamp}.${nonce}`
  const secret = process.env.NEXTAUTH_SECRET || "default-secret"
  const signature = crypto.createHmac("sha256", secret).update(data).digest("hex").substring(0, 16)
  return `${data}.${signature}`
}

function validateOAuthState(state: string): boolean {
  try {
    const parts = state.split(".")
    if (parts.length !== 3) return false

    const [timestamp, nonce, signature] = parts
    const data = `${timestamp}.${nonce}`
    const secret = process.env.NEXTAUTH_SECRET || "default-secret"
    const expectedSignature = crypto.createHmac("sha256", secret).update(data).digest("hex").substring(0, 16)

    if (signature !== expectedSignature) return false

    // Check if state is less than 10 minutes old
    const age = Date.now() - Number.parseInt(timestamp)
    if (age > 10 * 60 * 1000) return false

    return true
  } catch {
    return false
  }
}

export async function OPTIONS(request: Request) {
  return corsResponse(request.headers.get("origin"))
}

// Endpoint para iniciar OAuth con Google O intercambiar el code
export async function POST(request: Request) {
  const origin = request.headers.get("origin")
  const corsHeaders = getCorsHeaders(origin)

  try {
    const body = await request.json()
    const { device_fingerprint, code, state: receivedState } = body

    // === INTERCAMBIO DE CÓDIGO ===
    if (code && receivedState) {
      if (!validateOAuthState(receivedState)) {
        return NextResponse.json({ error: "State inválido o expirado" }, { status: 400, headers: corsHeaders })
      }

      // Obtener credenciales de Google desde la BD
      const requestUrl = new URL(request.url)
      const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`
      const redirectUri = `${baseUrl}/investor-portal/auth/callback/google`

      let clientId: string | null = null
      let clientSecret: string | null = null

      try {
        const dbSettings = await sql`
          SELECT key, value FROM investors."Settings"
          WHERE key IN ('google_client_id', 'google_client_secret')
        `
        for (const row of dbSettings) {
          if (row.key === "google_client_id") clientId = row.value
          if (row.key === "google_client_secret") clientSecret = row.value
        }
      } catch (e) {
        console.error("Could not read Google settings from DB:", e)
      }

      if (!clientId || !clientSecret) {
        return NextResponse.json(
          { error: "Google OAuth no configurado completamente" },
          { status: 500, headers: corsHeaders },
        )
      }

      // Intercambiar código por tokens
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      })

      const tokens = await tokenResponse.json()

      if (!tokenResponse.ok) {
        return NextResponse.json(
          { error: tokens.error_description || "Error intercambiando código" },
          { status: 400, headers: corsHeaders },
        )
      }

      // Obtener información del usuario de Google
      const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      })

      const userInfo = await userInfoResponse.json()

      if (!userInfoResponse.ok) {
        return NextResponse.json(
          { error: "Error obteniendo información del usuario" },
          { status: 400, headers: corsHeaders },
        )
      }

      const userResult = await sql`
        SELECT * FROM investors."User"
        WHERE email = ${userInfo.email}
        LIMIT 1
      `

      let userData: InvestorUser

      if (userResult.length === 0) {
        // Crear nuevo usuario
        const newUser = await sql`
          INSERT INTO investors."User" (
            id, 
            email, 
            first_name, 
            last_name,
            display_name,
            avatar_url, 
            email_verified,
            google_id,
            status,
            kyc_status,
            kyc_level,
            two_factor_enabled,
            created_at, 
            updated_at
          ) VALUES (
            gen_random_uuid(), 
            ${userInfo.email}, 
            ${userInfo.given_name || userInfo.name?.split(" ")[0] || ""},
            ${userInfo.family_name || userInfo.name?.split(" ").slice(1).join(" ") || ""},
            ${userInfo.name || userInfo.email},
            ${userInfo.picture || null},
            true,
            ${userInfo.id},
            'active',
            'pending',
            0,
            false,
            NOW(), 
            NOW()
          )
          RETURNING *
        `
        userData = newUser[0] as InvestorUser
      } else {
        userData = userResult[0] as InvestorUser

        // Actualizar google_id si no estaba vinculado
        if (!userData.google_id) {
          await sql`
            UPDATE investors."User"
            SET google_id = ${userInfo.id}, updated_at = NOW()
            WHERE id = ${userData.id}
          `
        }
      }

      // Crear sesión con device tracking
      const { accessToken, refreshToken, expiresAt } = await createSession(
        userData,
        request,
        device_fingerprint || undefined,
        userInfo.name || undefined,
      )

      return NextResponse.json(
        {
          success: true,
          user: {
            id: userData.id,
            email: userData.email,
            name: userData.display_name || `${userData.first_name} ${userData.last_name}`.trim(),
            first_name: userData.first_name,
            last_name: userData.last_name,
            avatar_url: userData.avatar_url,
            email_verified: userData.email_verified,
            two_factor_enabled: userData.two_factor_enabled,
            kyc_status: userData.kyc_status,
            kyc_level: userData.kyc_level,
          },
          access_token: accessToken,
          refresh_token: refreshToken,
        },
        { headers: corsHeaders },
      )
    }

    // === INICIAR OAUTH ===
    const requestUrl = new URL(request.url)
    const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`
    const redirectUri = `${baseUrl}/investor-portal/auth/callback/google`

    let clientId: string | null = null

    try {
      const tableExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'investors' AND table_name = 'Settings'
        ) as exists
      `

      if (tableExists[0]?.exists) {
        const dbSettings = await sql`
          SELECT key, value FROM investors."Settings"
          WHERE key = 'google_client_id'
        `
        if (dbSettings.length > 0 && dbSettings[0].value) {
          clientId = dbSettings[0].value
        }
      }
    } catch (e) {
      console.error("Could not read from investors.Settings:", e)
    }

    if (!clientId) {
      return NextResponse.json(
        { error: "Google OAuth no configurado. Configure el Client ID en la configuración de inversores." },
        { status: 500, headers: corsHeaders },
      )
    }

    const state = generateOAuthState()

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth")
    authUrl.searchParams.set("client_id", clientId)
    authUrl.searchParams.set("redirect_uri", redirectUri)
    authUrl.searchParams.set("response_type", "code")
    authUrl.searchParams.set("scope", "openid email profile")
    authUrl.searchParams.set("state", state)
    authUrl.searchParams.set("prompt", "select_account")

    return NextResponse.json({ auth_url: authUrl.toString(), state }, { headers: corsHeaders })
  } catch (error) {
    console.error("Unexpected error in Google OAuth POST:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500, headers: corsHeaders })
  }
}

// Callback de Google OAuth (redirige al frontend)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")

    const requestUrl = new URL(request.url)
    const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`

    // Si hay error de Google, redirigir con error
    if (error) {
      return NextResponse.redirect(`${baseUrl}/investor-portal/login?error=${encodeURIComponent(error)}`)
    }

    if (!code || !state) {
      return NextResponse.redirect(`${baseUrl}/investor-portal/login?error=missing_params`)
    }

    if (!validateOAuthState(state)) {
      return NextResponse.redirect(`${baseUrl}/investor-portal/login?error=invalid_state`)
    }

    // Redirigir al frontend con code y state para completar el intercambio
    return NextResponse.redirect(
      `${baseUrl}/investor-portal/auth/callback/google?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
    )
  } catch (error) {
    console.error("Error in Google OAuth callback:", error)
    const requestUrl = new URL(request.url)
    return NextResponse.redirect(`${requestUrl.protocol}//${requestUrl.host}/investor-portal/login?error=server_error`)
  }
}
