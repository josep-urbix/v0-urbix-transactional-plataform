import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"
import { getInvestorSession } from "@/lib/investor-auth/session"

// GET - Obtener documentos firmados por el inversor
export async function GET(request: NextRequest) {
  try {
    const session = await getInvestorSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const signedDocs = await sql`
      SELECT 
        sd.id,
        sd.csv,
        sd.status,
        sd.pdf_url,
        sd.firma_completed_at,
        sd.fecha_caducidad,
        sd.metodo_otp_usado,
        dv.version_number,
        dt.display_name as document_type_name,
        dt.name as document_type_code
      FROM documentos.signed_document sd
      JOIN documentos.document_version dv ON sd.document_version_id = dv.id
      JOIN documentos.document_type dt ON dv.document_type_id = dt.id
      WHERE sd.inversor_id = ${session.user.id}
      ORDER BY sd.firma_completed_at DESC
    `

    return NextResponse.json({ documents: signedDocs })
  } catch (error) {
    console.error("[Investor Documents] Error:", error)
    return NextResponse.json({ error: "Error al obtener documentos" }, { status: 500 })
  }
}
