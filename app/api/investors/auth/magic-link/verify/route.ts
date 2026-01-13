import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { verifyMagicLink } from "@/lib/investor-auth/magic-link"
import { createSession } from "@/lib/investor-auth/session"
import { getClientIP } from "@/lib/investor-auth/utils"
import { getCorsHeaders, corsResponse } from "@/lib/investor-auth/cors"
import type { InvestorUser, MagicLinkVerifyRequest } from "@/lib/types/investor"

export async function OPTIONS(request: Request) {
  return corsResponse(request.headers.get("origin"))
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin")
  const corsHeaders = getCorsHeaders(origin)

  try {
    const body: MagicLinkVerifyRequest = await request.json()
    const { token, device_fingerprint, device_name } = body

    if (!token) {
      return NextResponse.json({ error: "Token requerido" }, { status: 400, headers: corsHeaders })
    }

    // Verificar magic link
    const verification = await verifyMagicLink(token)

    if (!verification.valid) {
      // Registrar intento fallido
      const ip = getClientIP(request)
      await sql`
        INSERT INTO investors."LoginAttempt" (
          email, auth_method, success, failure_reason, ip_address, 
          user_agent, device_fingerprint
        ) VALUES (
          NULL, 'magic_link', FALSE, ${verification.error},
          ${ip}, ${request.headers.get("user-agent")}, ${device_fingerprint}
        )
      `

      return NextResponse.json({ error: verification.error }, { status: 400, headers: corsHeaders })
    }

    let user: InvestorUser | null = null

    // Si es registro, crear usuario
    if (verification.purpose === "register" && !verification.userId) {
      const newUser = await sql`
        INSERT INTO investors."User" (email, email_verified, status)
        VALUES (${verification.email}, TRUE, 'active')
        RETURNING *
      `
      user = newUser[0] as InvestorUser

      // Log de actividad
      await sql`
        INSERT INTO investors."ActivityLog" (user_id, action, category, description, ip_address)
        VALUES (${user.id}, 'register', 'auth', 'Usuario registrado via magic link', ${getClientIP(request)})
      `
    } else {
      // Obtener usuario existente
      const existingUser = await sql`
        SELECT * FROM investors."User" WHERE id = ${verification.userId}
      `
      user = existingUser[0] as InvestorUser

      // Si es verificación de email
      if (verification.purpose === "verify_email") {
        await sql`
          UPDATE investors."User" 
          SET email_verified = TRUE, status = 'active'
          WHERE id = ${user.id}
        `
        user.email_verified = true
        user.status = "active"
      }
    }

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404, headers: corsHeaders })
    }

    // Verificar que el usuario esté activo
    if (user.status !== "active" && user.status !== "pending_verification") {
      return NextResponse.json(
        {
          error: "Tu cuenta está suspendida. Contacta con soporte.",
        },
        { status: 403, headers: corsHeaders },
      )
    }

    // Crear sesión
    const { accessToken, refreshToken, expiresAt } = await createSession(user, request, device_fingerprint, device_name)

    // Registrar login exitoso
    const ip = getClientIP(request)
    await sql`
      INSERT INTO investors."LoginAttempt" (
        email, user_id, auth_method, success, ip_address, 
        user_agent, device_fingerprint
      ) VALUES (
        ${user.email}, ${user.id}, 'magic_link', TRUE, ${ip},
        ${request.headers.get("user-agent")}, ${device_fingerprint}
      )
    `

    // Log de actividad
    await sql`
      INSERT INTO investors."ActivityLog" (user_id, action, category, description, ip_address)
      VALUES (${user.id}, 'login', 'auth', 'Login via magic link', ${ip})
    `

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          display_name: user.display_name,
          avatar_url: user.avatar_url,
          email_verified: user.email_verified,
          two_factor_enabled: user.two_factor_enabled,
          kyc_status: user.kyc_status,
          kyc_level: user.kyc_level,
        },
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt.toISOString(),
      },
      { headers: corsHeaders },
    )
  } catch (error) {
    console.error("Error verificando magic link:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500, headers: corsHeaders })
  }
}
