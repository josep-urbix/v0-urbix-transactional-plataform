import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { generateSecret } from "otplib"
import QRCode from "qrcode"

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const token = authHeader.split(" ")[1]

    // Validate session and get user
    const sessions = await sql`
      SELECT s.user_id, u.email, u.phone
      FROM investors."Session" s
      JOIN investors."User" u ON s.user_id = u.id
      WHERE s.token = ${token}
        AND s.is_active = true
        AND s.expires_at > NOW()
    `

    if (sessions.length === 0) {
      return NextResponse.json({ error: "Sesión inválida" }, { status: 401 })
    }

    const user = sessions[0]
    const { method } = await request.json()

    if (!["totp", "sms", "email"].includes(method)) {
      return NextResponse.json({ error: "Método no válido" }, { status: 400 })
    }

    // Generate secret for TOTP
    if (method === "totp") {
      const secret = generateSecret()

      // Store pending 2FA setup
      await sql`
        INSERT INTO investors."Settings" (key, value, updated_at)
        VALUES (
          ${"2fa_pending_" + user.user_id}, 
          ${JSON.stringify({ method, secret, created_at: new Date().toISOString() })},
          NOW()
        )
        ON CONFLICT (key) DO UPDATE SET 
          value = EXCLUDED.value,
          updated_at = NOW()
      `

      const otpauth = `otpauth://totp/Urbix%20Inversores:${encodeURIComponent(user.email)}?secret=${secret}&issuer=Urbix%20Inversores`
      const qrCode = await QRCode.toDataURL(otpauth)

      return NextResponse.json({
        method: "totp",
        secret,
        qr_code: qrCode,
      })
    }

    // Generate 6-digit code for SMS or Email
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Store pending 2FA setup
    await sql`
      INSERT INTO investors."Settings" (key, value, updated_at)
      VALUES (
        ${"2fa_pending_" + user.user_id}, 
        ${JSON.stringify({ method, code, expires_at: expiresAt.toISOString() })},
        NOW()
      )
      ON CONFLICT (key) DO UPDATE SET 
        value = EXCLUDED.value,
        updated_at = NOW()
    `

    if (method === "sms") {
      if (!user.phone) {
        return NextResponse.json({ error: "No tienes un teléfono configurado" }, { status: 400 })
      }
      // TODO: Send SMS with code
      console.log(`[2FA] SMS code for ${user.phone}: ${code}`)
    }

    if (method === "email") {
      // TODO: Send email with code and verification link
      const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://integrations.urbix.es"}/investor-portal/2fa/verify?code=${code}&user=${user.user_id}`
      console.log(`[2FA] Email code for ${user.email}: ${code}`)
      console.log(`[2FA] Email verify URL: ${verifyUrl}`)
    }

    return NextResponse.json({
      method,
      message: method === "sms" ? "Código enviado por SMS" : "Código enviado por email",
    })
  } catch (error) {
    console.error("[2FA Setup] Error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
