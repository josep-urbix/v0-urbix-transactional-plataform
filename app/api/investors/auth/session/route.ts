import { NextResponse } from "next/server"
import { validateSession, revokeSession, refreshSession } from "@/lib/investor-auth/session"
import { getCorsHeaders, corsResponse } from "@/lib/investor-auth/cors"

export async function OPTIONS(request: Request) {
  return corsResponse(request.headers.get("origin"))
}

// Obtener sesión actual
export async function GET(request: Request) {
  const origin = request.headers.get("origin")
  const corsHeaders = getCorsHeaders(origin)

  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.replace("Bearer ", "")

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401, headers: corsHeaders })
    }

    const user = await validateSession(token)

    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401, headers: corsHeaders })
    }

    return NextResponse.json(
      {
        authenticated: true,
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
          google_id: user.google_id || null,
          apple_id: user.apple_id || null,
          has_password: !!user.password_hash,
        },
      },
      { headers: corsHeaders },
    )
  } catch (error) {
    console.error("Error validando sesión:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500, headers: corsHeaders })
  }
}

// Cerrar sesión
export async function DELETE(request: Request) {
  const origin = request.headers.get("origin")
  const corsHeaders = getCorsHeaders(origin)

  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.replace("Bearer ", "")

    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401, headers: corsHeaders })
    }

    await revokeSession(token, "manual_logout")

    return NextResponse.json({ success: true }, { headers: corsHeaders })
  } catch (error) {
    console.error("Error cerrando sesión:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500, headers: corsHeaders })
  }
}

// Refrescar token
export async function POST(request: Request) {
  const origin = request.headers.get("origin")
  const corsHeaders = getCorsHeaders(origin)

  try {
    const body = await request.json()
    const { refresh_token } = body

    if (!refresh_token) {
      return NextResponse.json({ error: "Refresh token requerido" }, { status: 400, headers: corsHeaders })
    }

    const result = await refreshSession(refresh_token, request)

    if (!result) {
      return NextResponse.json({ error: "Refresh token inválido o expirado" }, { status: 401, headers: corsHeaders })
    }

    return NextResponse.json(
      {
        success: true,
        access_token: result.accessToken,
        expires_at: result.expiresAt.toISOString(),
      },
      { headers: corsHeaders },
    )
  } catch (error) {
    console.error("Error refrescando sesión:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500, headers: corsHeaders })
  }
}
