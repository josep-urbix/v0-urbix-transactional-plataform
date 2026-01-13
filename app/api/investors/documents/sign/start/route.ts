import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"
import { getInvestorSession } from "@/lib/investor-auth/session"
import { createSignatureSession, generateQRToken } from "@/lib/document-signing"

// POST - Iniciar sesión de firma
export async function POST(request: NextRequest) {
  try {
    const session = await getInvestorSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { document_version_id, channel = "desktop" } = body

    if (!document_version_id) {
      return NextResponse.json({ error: "document_version_id es requerido" }, { status: 400 })
    }

    // Verificar que la versión existe y está publicada
    const versionResult = await sql`
      SELECT dv.*, dt.display_name as type_name
      FROM documentos.document_version dv
      JOIN documentos.document_type dt ON dv.document_type_id = dt.id
      WHERE dv.id = ${document_version_id} AND dv.status = 'publicado'
    `

    if (versionResult.length === 0) {
      return NextResponse.json({ error: "Versión de documento no disponible" }, { status: 404 })
    }

    // Cancelar sesiones pendientes anteriores para el mismo documento
    await sql`
      UPDATE documentos.signature_session
      SET status = 'cancelado'
      WHERE inversor_id = ${session.user.id}
        AND document_version_id = ${document_version_id}
        AND status IN ('pendiente', 'otp_enviado')
    `

    // Crear nueva sesión
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || ""
    const userAgent = request.headers.get("user-agent") || ""

    const signatureSession = await createSignatureSession(session.user.id, document_version_id, {
      channel: channel as "desktop" | "mobile",
      ip,
      userAgent,
    })

    // Generar QR token si es desktop
    let qrData = null
    if (channel === "desktop") {
      const qr = await generateQRToken(signatureSession.id)
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ""
      qrData = {
        token: qr.qrToken,
        url: `${baseUrl}/investor-portal/sign/${qr.qrToken}`,
        expiresAt: qr.expiresAt,
      }
    }

    return NextResponse.json({
      session: {
        id: signatureSession.id,
        token_firma: signatureSession.token_firma,
        expires_at: signatureSession.expires_at,
        document_name: versionResult[0].type_name,
        version: versionResult[0].version_number,
      },
      qr: qrData,
    })
  } catch (error) {
    console.error("[Investor Sign Start] Error:", error)
    return NextResponse.json({ error: "Error al iniciar firma" }, { status: 500 })
  }
}
