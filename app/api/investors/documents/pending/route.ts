import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"
import { getInvestorSession } from "@/lib/investor-auth/session"

// GET - Obtener documentos pendientes de firma para el inversor
export async function GET(request: NextRequest) {
  try {
    const session = await getInvestorSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Obtener tipos de documentos obligatorios que el inversor no ha firmado (o están caducados)
    const pendingDocs = await sql`
      SELECT 
        dt.id as type_id,
        dt.name,
        dt.display_name,
        dt.description,
        dt.dias_validez,
        dt.obligatorio_antes_de_invertir,
        dv.id as version_id,
        dv.version_number,
        dv.fecha_publicacion,
        sd.id as signed_id,
        sd.firma_completed_at,
        sd.fecha_caducidad,
        sd.status as signed_status
      FROM documentos.document_type dt
      JOIN documentos.document_version dv ON dv.document_type_id = dt.id AND dv.status = 'publicado'
      LEFT JOIN documentos.signed_document sd ON sd.document_version_id = dv.id 
        AND sd.inversor_id = ${session.user.id}
        AND sd.status = 'vigente'
      WHERE dt.activo = true
        AND dt.requiere_firma = true
        AND (sd.id IS NULL OR (sd.fecha_caducidad IS NOT NULL AND sd.fecha_caducidad < NOW()))
      ORDER BY dt.obligatorio_antes_de_invertir DESC, dt.orden ASC
    `

    return NextResponse.json({ documents: pendingDocs })
  } catch (error) {
    console.error("[Investor Documents] Error:", error)
    return NextResponse.json({ error: "Error al obtener documentos" }, { status: 500 })
  }
}
