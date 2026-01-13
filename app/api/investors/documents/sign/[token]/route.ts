import { type NextRequest, NextResponse } from "next/server"
import { validateQRToken } from "@/lib/document-signing"

// GET - Validar token QR y obtener datos de la sesión
export async function GET(request: NextRequest, { params }: { params: { token: string } }) {
  try {
    const { token } = params

    const result = await validateQRToken(token)

    if (!result.valid) {
      return NextResponse.json(
        {
          valid: false,
          error: result.error,
          expired: result.expired || false,
          // Si está expirado, devolver datos mínimos para mostrar UI de regeneración
          session: result.expired
            ? {
                inversor_email: result.session?.inversor_email,
                document_type_name: result.session?.document_type_name,
              }
            : null,
        },
        { status: result.expired ? 410 : 400 },
      )
    }

    // No devolver contenido HTML completo, solo metadata
    return NextResponse.json({
      valid: true,
      session: {
        id: result.session.id,
        status: result.session.status,
        document_type_name: result.session.document_type_name,
        inversor_name: result.session.inversor_name,
        inversor_email: result.session.inversor_email,
        expires_at: result.session.expires_at,
      },
    })
  } catch (error) {
    console.error("[Sign Token Validation] Error:", error)
    return NextResponse.json({ error: "Error al validar token" }, { status: 500 })
  }
}
