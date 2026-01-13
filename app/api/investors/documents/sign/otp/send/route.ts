import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"
import { sendOTP } from "@/lib/document-signing"

// POST - Enviar OTP para firma
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { session_id, method, destination } = body

    if (!session_id || !method || !destination) {
      return NextResponse.json({ error: "session_id, method y destination son requeridos" }, { status: 400 })
    }

    // Verificar que la sesión existe y está en estado válido
    const sessionResult = await sql`
      SELECT * FROM documentos.signature_session
      WHERE id = ${session_id} AND status IN ('pendiente', 'otp_enviado')
        AND expires_at > NOW()
    `

    if (sessionResult.length === 0) {
      return NextResponse.json({ error: "Sesión no válida o expirada" }, { status: 400 })
    }

    const result = await sendOTP(session_id, method, destination)

    return NextResponse.json({
      sent: result.sent,
      maskedDestination: result.maskedDestination,
    })
  } catch (error) {
    console.error("[OTP Send] Error:", error)
    return NextResponse.json({ error: "Error al enviar OTP" }, { status: 500 })
  }
}
