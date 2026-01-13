import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { verify } from "otplib"

export async function POST(request: NextRequest) {
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
    const { method, code } = await request.json()

    // Get pending 2FA setup
    const pendingSetup = await sql`
      SELECT value FROM investors."Settings"
      WHERE key = ${"2fa_pending_" + userId}
    `

    if (pendingSetup.length === 0) {
      return NextResponse.json({ error: "No hay configuración pendiente" }, { status: 400 })
    }

    const setup = JSON.parse(pendingSetup[0].value)

    if (setup.method !== method) {
      return NextResponse.json({ error: "Método no coincide" }, { status: 400 })
    }

    // Verify code
    let isValid = false

    if (method === "totp") {
      isValid = verify({ token: code, secret: setup.secret })
    } else {
      // SMS or Email
      if (new Date(setup.expires_at) < new Date()) {
        return NextResponse.json({ error: "Código expirado" }, { status: 400 })
      }
      isValid = setup.code === code
    }

    if (!isValid) {
      return NextResponse.json({ error: "Código inválido" }, { status: 400 })
    }

    // Enable 2FA for user
    await sql`
      UPDATE investors."User"
      SET 
        two_factor_enabled = true,
        two_factor_method = ${method},
        two_factor_secret = ${method === "totp" ? setup.secret : null},
        updated_at = NOW()
      WHERE id = ${userId}
    `

    // Clean up pending setup
    await sql`
      DELETE FROM investors."Settings"
      WHERE key = ${"2fa_pending_" + userId}
    `

    return NextResponse.json({
      success: true,
      method,
    })
  } catch (error) {
    console.error("[2FA Verify] Error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
