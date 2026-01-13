import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const token = authHeader.split(" ")[1]

    // Validate session and get user
    const sessions = await sql`
      SELECT s.user_id
      FROM investors."Session" s
      WHERE s.token = ${token}
        AND s.is_active = true
        AND s.expires_at > NOW()
    `

    if (sessions.length === 0) {
      return NextResponse.json({ error: "Sesión inválida" }, { status: 401 })
    }

    const userId = sessions[0].user_id

    // Disable 2FA
    await sql`
      UPDATE investors."User"
      SET 
        two_factor_enabled = false,
        two_factor_method = null,
        two_factor_secret = null,
        updated_at = NOW()
      WHERE id = ${userId}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[2FA Disable] Error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
