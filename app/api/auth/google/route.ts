import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { cookies } from "next/headers"
import crypto from "crypto"

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

    const age = Date.now() - Number.parseInt(timestamp)
    if (age > 10 * 60 * 1000) return false

    return true
  } catch {
    return false
  }
}

async function getAdminSettings(): Promise<{
  clientId: string | null
  clientSecret: string | null
  allowedDomains: string[]
}> {
  let clientId: string | null = null
  let clientSecret: string | null = null
  let allowedDomains: string[] = []

  try {
    // Primero intentar desde AdminSettings (configuración separada del middleware)
    const adminSettings = await sql`
      SELECT key, value FROM "AdminSettings"
      WHERE key IN ('google_client_id', 'google_client_secret', 'allowed_email_domains')
    `

    for (const setting of adminSettings) {
      if (setting.key === "google_client_id" && setting.value) clientId = setting.value
      if (setting.key === "google_client_secret" && setting.value) clientSecret = setting.value
      if (setting.key === "allowed_email_domains" && setting.value) {
        allowedDomains = setting.value
          .split(",")
          .map((d: string) => d.trim().toLowerCase())
          .filter(Boolean)
      }
    }
  } catch (e) {
    console.log("AdminSettings table may not exist, using env vars")
  }

  // Fallback a variables de entorno
  if (!clientId) clientId = process.env.GOOGLE_CLIENT_ID || null
  if (!clientSecret) clientSecret = process.env.GOOGLE_CLIENT_SECRET || null
  if (allowedDomains.length === 0) {
    const envDomains = process.env.ALLOWED_EMAIL_DOMAINS || "urbix.es"
    allowedDomains = envDomains
      .split(",")
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean)
  }

  return { clientId, clientSecret, allowedDomains }
}

// GET - Iniciar OAuth con Google
export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url)
    const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`
    const redirectUri = `${baseUrl}/auth/callback/google`

    const { clientId } = await getAdminSettings()

    if (!clientId) {
      return NextResponse.json(
        { error: "Google OAuth no configurado. Configure el Client ID en Configuración > OAuth." },
        { status: 500 },
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

    return NextResponse.json({ auth_url: authUrl.toString(), state })
  } catch (error) {
    console.error("Error in Google OAuth GET:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// POST - Callback de Google OAuth
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { code, state, redirect_uri } = body

    if (!code || !state) {
      return NextResponse.json({ error: "Código o state inválido" }, { status: 400 })
    }

    if (!validateOAuthState(state)) {
      return NextResponse.json({ error: "State inválido o expirado" }, { status: 400 })
    }

    const { clientId, clientSecret, allowedDomains } = await getAdminSettings()

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: "Google OAuth no está configurado completamente." }, { status: 500 })
    }

    const requestUrl = new URL(request.url)
    const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`
    const finalRedirectUri = redirect_uri || `${baseUrl}/auth/callback/google`

    // Intercambiar código por tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: finalRedirectUri,
        grant_type: "authorization_code",
      }),
    })

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text()
      console.error("Error obteniendo tokens de Google:", error)
      return NextResponse.json({ error: "Error de autenticación con Google" }, { status: 400 })
    }

    const tokens = await tokenResponse.json()

    // Obtener información del usuario
    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })

    if (!userInfoResponse.ok) {
      return NextResponse.json({ error: "Error obteniendo información del usuario" }, { status: 400 })
    }

    const googleUser = await userInfoResponse.json()
    const { id: googleId, email, name, picture } = googleUser

    const emailDomain = email.split("@")[1]?.toLowerCase()

    if (allowedDomains.length > 0 && !allowedDomains.includes(emailDomain)) {
      return NextResponse.json(
        {
          error: "Tu cuenta de email no está autorizada para acceder a este sistema. Contacta con el administrador.",
        },
        { status: 403 },
      )
    }

    // Buscar usuario existente por googleId o email
    let user = null

    const existingByGoogle = await sql`
      SELECT * FROM "User" WHERE "googleId" = ${googleId}
    `

    if (existingByGoogle.length > 0) {
      user = existingByGoogle[0]
    } else {
      const existingByEmail = await sql`
        SELECT * FROM "User" WHERE email = ${email.toLowerCase()}
      `

      if (existingByEmail.length > 0) {
        user = existingByEmail[0]
        await sql`
          UPDATE "User"
          SET "googleId" = ${googleId}, "avatarUrl" = COALESCE("avatarUrl", ${picture})
          WHERE id = ${user.id}
        `
      } else {
        return NextResponse.json(
          { error: "No existe una cuenta de administrador con este email. Contacta con el administrador." },
          { status: 403 },
        )
      }
    }

    if (user.isActive === false) {
      return NextResponse.json({ error: "Tu cuenta está desactivada. Contacta con el administrador." }, { status: 403 })
    }

    const sessionData = {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name || name,
      avatarUrl: user.avatarUrl || picture,
      timestamp: Date.now(),
      nonce: Math.random().toString(36).substring(2),
    }

    const cookieStore = await cookies()
    cookieStore.set("session", JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 86400 * 7,
      path: "/",
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name || name,
        avatarUrl: user.avatarUrl || picture,
      },
    })
  } catch (error) {
    console.error("Error en Google OAuth:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
