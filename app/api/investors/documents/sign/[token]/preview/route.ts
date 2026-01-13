import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

// GET - Obtener contenido renderizado del documento para vista previa
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params

    // Buscar sesión con el token
    const result = await sql`
      SELECT ss.*, dv.contenido_html, dv.variables_disponibles,
             dt.display_name as document_type_name,
             iu.id as inversor_id, iu.email, iu.first_name, iu.last_name,
             iu.phone, iu.display_name, iu.status, iu.kyc_status
      FROM documentos.signature_session ss
      JOIN documentos.document_version dv ON ss.document_version_id = dv.id
      JOIN documentos.document_type dt ON dv.document_type_id = dt.id
      JOIN investors."User" iu ON ss.inversor_id = iu.id
      WHERE (ss.qr_token = ${token} OR ss.token_firma = ${token})
        AND ss.status IN ('pendiente', 'otp_enviado')
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 })
    }

    const session = result[0]

    // Construir variables para reemplazo
    const variables: Record<string, string> = {
      // Variables simples
      nombre_inversor: `${session.first_name || ""} ${session.last_name || ""}`.trim(),
      email_inversor: session.email || "",
      telefono_inversor: session.phone || "",
      nombre_completo: `${session.first_name || ""} ${session.last_name || ""}`.trim(),
      first_name: session.first_name || "",
      last_name: session.last_name || "",
      email: session.email || "",
      phone: session.phone || "",
      display_name: session.display_name || "",
      status: session.status || "",
      kyc_status: session.kyc_status || "",
      fecha_firma: new Date().toLocaleDateString("es-ES"),
      hora_firma: new Date().toLocaleTimeString("es-ES"),

      // Variables con notación tabla.columna
      "investors.User.first_name": session.first_name || "",
      "investors.User.last_name": session.last_name || "",
      "investors.User.email": session.email || "",
      "investors.User.phone": session.phone || "",
      "investors.User.display_name": session.display_name || "",
      "investors.User.status": session.status || "",
      "investors.User.kyc_status": session.kyc_status || "",
    }

    // Reemplazar variables en el contenido HTML
    let content = session.contenido_html || ""

    // Reemplazar todas las variables {{variable}}
    content = content.replace(/\{\{([^}]+)\}\}/g, (match: string, varName: string) => {
      const trimmedName = varName.trim()
      return variables[trimmedName] !== undefined ? variables[trimmedName] : match
    })

    return NextResponse.json({
      content,
      documentType: session.document_type_name,
      investorName: variables.nombre_completo,
      investorEmail: session.email,
    })
  } catch (error) {
    console.error("[Document Preview] Error:", error)
    return NextResponse.json({ error: "Error al cargar vista previa" }, { status: 500 })
  }
}
