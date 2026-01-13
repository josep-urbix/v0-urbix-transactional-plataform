import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { createMagicLink, sendMagicLinkEmail } from "@/lib/investor-auth/magic-link"
import { getClientIP } from "@/lib/investor-auth/utils"
import type { MagicLinkRequest } from "@/lib/types/investor"
import { getCorsHeaders, corsResponse } from "@/lib/investor-auth/cors"

export async function OPTIONS(request: Request) {
  return corsResponse(request.headers.get("origin"))
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin")
  const corsHeaders = getCorsHeaders(origin)

  try {
    const body: MagicLinkRequest = await request.json()
    const { email, purpose = "login" } = body

    if (!email) {
      return NextResponse.json({ error: "Email requerido" }, { status: 400, headers: corsHeaders })
    }

    // Verificar si el usuario existe
    const existingUser = await sql`
      SELECT id, status FROM investors."User"
      WHERE email = ${email.toLowerCase()} AND deleted_at IS NULL
    `

    const user = existingUser[0]

    // Si es login y no existe el usuario
    if (purpose === "login" && !user) {
      // No revelamos si el email existe o no por seguridad
      return NextResponse.json(
        {
          success: true,
          message: "Si existe una cuenta con este email, recibirás un enlace de acceso.",
        },
        { headers: corsHeaders },
      )
    }

    // Si el usuario está bloqueado o suspendido
    if (user && (user.status === "blocked" || user.status === "suspended")) {
      return NextResponse.json(
        {
          error: "Tu cuenta está suspendida. Contacta con soporte.",
        },
        { status: 403, headers: corsHeaders },
      )
    }

    // Verificar rate limiting (máximo 3 magic links por email en 15 minutos)
    const ip = getClientIP(request)
    const recentAttempts = await sql`
      SELECT COUNT(*) as count FROM investors."MagicLink"
      WHERE (email = ${email.toLowerCase()} OR ip_address = ${ip})
        AND created_at > NOW() - INTERVAL '15 minutes'
    `

    if (Number.parseInt(recentAttempts[0].count) >= 3) {
      return NextResponse.json(
        {
          error: "Demasiados intentos. Espera unos minutos antes de volver a intentarlo.",
        },
        { status: 429, headers: corsHeaders },
      )
    }

    // Determinar propósito real
    const actualPurpose = user ? purpose : "register"

    // Crear magic link
    const { token, expiresAt } = await createMagicLink(
      email.toLowerCase(),
      actualPurpose as "login" | "register",
      request,
      user?.id,
    )

    // Enviar email
    const sent = await sendMagicLinkEmail(email.toLowerCase(), token, actualPurpose as "login" | "register")

    if (!sent) {
      return NextResponse.json(
        {
          error: "Error enviando el email. Inténtalo de nuevo.",
        },
        { status: 500, headers: corsHeaders },
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: "Si existe una cuenta con este email, recibirás un enlace de acceso.",
        expires_at: expiresAt.toISOString(),
      },
      { headers: corsHeaders },
    )
  } catch (error) {
    console.error("Error en magic link:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500, headers: corsHeaders })
  }
}
