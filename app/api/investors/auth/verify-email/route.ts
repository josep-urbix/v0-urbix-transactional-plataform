import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { corsHeaders, handleCors } from "@/lib/investor-auth/cors"

export async function OPTIONS(request: NextRequest) {
  return handleCors(request)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json({ error: "Token requerido" }, { status: 400, headers: corsHeaders(request) })
    }

    // Buscar usuario con este token
    const users = await sql`
      SELECT id, email, verification_token_expires
      FROM investors."User"
      WHERE verification_token = ${token}
        AND email_verified = false
    `

    if (users.length === 0) {
      return NextResponse.json(
        { error: "Token inválido o ya utilizado" },
        { status: 400, headers: corsHeaders(request) },
      )
    }

    const user = users[0]

    // Verificar que el token no haya expirado
    if (new Date(user.verification_token_expires) < new Date()) {
      return NextResponse.json(
        { error: "El token ha expirado. Por favor, solicita uno nuevo." },
        { status: 400, headers: corsHeaders(request) },
      )
    }

    // Activar el usuario
    await sql`
      UPDATE investors."User"
      SET 
        email_verified = true,
        status = 'active',
        verification_token = NULL,
        verification_token_expires = NULL,
        updated_at = NOW()
      WHERE id = ${user.id}
    `

    // Log de actividad
    await sql`
      INSERT INTO investors."ActivityLog" (user_id, action, details)
      VALUES (${user.id}, 'EMAIL_VERIFIED', ${JSON.stringify({ email: user.email })}::jsonb)
    `

    return NextResponse.json(
      {
        success: true,
        message: "Email verificado correctamente. Ya puedes iniciar sesión.",
      },
      { headers: corsHeaders(request) },
    )
  } catch (error) {
    console.error("Error en verificación de email:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500, headers: corsHeaders(request) })
  }
}
