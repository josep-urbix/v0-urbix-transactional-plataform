import { type NextRequest, NextResponse } from "next/server"
import { verifyOTP, completeSignature } from "@/lib/document-signing"

// POST - Verificar OTP y completar firma
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { session_id, code, signature_data_url } = body

    if (!session_id || !code) {
      return NextResponse.json({ error: "session_id y code son requeridos" }, { status: 400 })
    }

    const verifyResult = await verifyOTP(session_id, code)

    if (!verifyResult.valid) {
      return NextResponse.json(
        {
          valid: false,
          error: verifyResult.error,
          remainingAttempts: verifyResult.remainingAttempts,
        },
        { status: 400 },
      )
    }

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || ""
    const userAgent = request.headers.get("user-agent") || ""

    const signedDocument = await completeSignature(session_id, ip, userAgent, signature_data_url)

    return NextResponse.json({
      success: true,
      document: {
        id: signedDocument.id,
        csv: signedDocument.csv,
        pdf_url: signedDocument.pdf_url,
        firma_manuscrita_url: signedDocument.firma_manuscrita_url,
      },
    })
  } catch (error) {
    console.error("[OTP Verify] Error:", error)
    return NextResponse.json({ error: "Error al verificar OTP" }, { status: 500 })
  }
}
