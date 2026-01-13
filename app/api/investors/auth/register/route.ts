import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { hashPassword, generateSecureToken } from "@/lib/investor-auth/utils"
import { corsHeaders, handleCors } from "@/lib/investor-auth/cors"

export async function OPTIONS(request: NextRequest) {
  return handleCors(request)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { first_name, last_name, email, phone, password } = body

    // Validaciones
    if (!first_name || !last_name || !email || !password) {
      return NextResponse.json(
        { error: "Todos los campos obligatorios son requeridos" },
        { status: 400, headers: corsHeaders(request) },
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres" },
        { status: 400, headers: corsHeaders(request) },
      )
    }

    // Verificar si el email ya existe
    const existingUser = await sql`
      SELECT id FROM investors."User" WHERE email = ${email.toLowerCase()}
    `

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: "Este email ya está registrado" },
        { status: 400, headers: corsHeaders(request) },
      )
    }

    // Hash de la contraseña
    const passwordHash = await hashPassword(password)

    // Generar token de verificación
    const verificationToken = generateSecureToken()
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas

    // Crear usuario
    const result = await sql`
      INSERT INTO investors."User" (
        email,
        password_hash,
        first_name,
        last_name,
        phone,
        status,
        email_verified,
        verification_token,
        verification_token_expires
      ) VALUES (
        ${email.toLowerCase()},
        ${passwordHash},
        ${first_name},
        ${last_name},
        ${phone || null},
        'pending_verification',
        false,
        ${verificationToken},
        ${verificationExpires.toISOString()}
      )
      RETURNING id, email
    `

    const user = result[0]

    // Log de actividad
    await sql`
      INSERT INTO investors."ActivityLog" (user_id, action, details)
      VALUES (${user.id}, 'REGISTER', ${JSON.stringify({ email: user.email })}::jsonb)
    `

    // TODO: Enviar email de verificación con el token
    // Por ahora, logueamos el token para testing
    console.log(`[REGISTER] Verification token for ${email}: ${verificationToken}`)

    return NextResponse.json(
      {
        success: true,
        message: "Usuario registrado. Por favor, verifica tu email.",
      },
      { status: 201, headers: corsHeaders(request) },
    )
  } catch (error) {
    console.error("Error en registro:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500, headers: corsHeaders(request) })
  }
}
