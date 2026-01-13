import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const token = authHeader.split(" ")[1]

    // Validate session and get user 2FA status
    const users = await sql`
      SELECT u.two_factor_enabled, u.two_factor_method
      FROM investors."Session" s
      JOIN investors."User" u ON s.user_id = u.id
      WHERE s.token = ${token}
        AND s.is_active = true
        AND s.expires_at > NOW()
    `

    if (users.length === 0) {
      return NextResponse.json({ error: "Sesión inválida" }, { status: 401 })
    }

    return NextResponse.json({
      enabled: users[0].two_factor_enabled || false,
      method: users[0].two_factor_method || null,
    })
  } catch (error) {
    console.error("[2FA Status] Error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
