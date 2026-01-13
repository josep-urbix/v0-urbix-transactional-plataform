import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { validateSession } from "@/lib/investor-auth/session"
import { verifyTOTP, getClientIP } from "@/lib/investor-auth/utils"

// Verificar código 2FA y activar
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.replace("Bearer ", "")

    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const user = await validateSession(token)
    if (!user) {
      return NextResponse.json({ error: "Sesión inválida" }, { status: 401 })
    }

    const body = await request.json()
    const { code } = body

    if (!code) {
      return NextResponse.json({ error: "Código requerido" }, { status: 400 })
    }

    // Obtener secret temporal
    const userResult = await sql`
      SELECT two_factor_secret FROM investors."User" WHERE id = ${user.id}
    `

    const secret = userResult[0]?.two_factor_secret
    if (!secret) {
      return NextResponse.json({ error: "No hay configuración 2FA pendiente" }, { status: 400 })
    }

    // Verificar código
    const isValid = verifyTOTP(secret, code)

    if (!isValid) {
      return NextResponse.json({ error: "Código inválido" }, { status: 400 })
    }

    // Activar 2FA
    await sql`
      UPDATE investors."User"
      SET two_factor_enabled = TRUE
      WHERE id = ${user.id}
    `

    // Log de actividad
    const ip = getClientIP(request)
    await sql`
      INSERT INTO investors."ActivityLog" (user_id, action, category, description, ip_address)
      VALUES (${user.id}, 'enable_2fa', 'security', 'Autenticación de dos factores activada', ${ip})
    `

    return NextResponse.json({ success: true, message: "2FA activado correctamente" })
  } catch (error) {
    console.error("Error verificando 2FA:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
