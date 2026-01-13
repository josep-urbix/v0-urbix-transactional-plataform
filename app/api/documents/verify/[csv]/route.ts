import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

// GET - Verificar documento por CSV (público)
export async function GET(request: NextRequest, { params }: { params: Promise<{ csv: string }> }) {
  try {
    const { csv } = await params

    if (!csv || csv.length !== 32) {
      return NextResponse.json({ error: "Código de verificación inválido" }, { status: 400 })
    }

    const result = await sql`
      SELECT 
        sd.csv,
        sd.status,
        sd.firma_completed_at,
        sd.fecha_caducidad,
        sd.pdf_hash,
        dv.version_number,
        dt.display_name as document_type_name,
        iu.name as inversor_name
      FROM documentos.signed_document sd
      JOIN documentos.document_version dv ON sd.document_version_id = dv.id
      JOIN documentos.document_type dt ON dv.document_type_id = dt.id
      JOIN investors."User" iu ON sd.inversor_id = iu.id
      WHERE sd.csv = ${csv.toUpperCase()}
    `

    if (result.length === 0) {
      return NextResponse.json(
        {
          valid: false,
          error: "Documento no encontrado",
        },
        { status: 404 },
      )
    }

    const doc = result[0]

    // Calcular estado de validez actual
    let estado_actual = doc.status
    if (doc.status === "vigente" && doc.fecha_caducidad && new Date(doc.fecha_caducidad) < new Date()) {
      estado_actual = "caducado"
    }

    return NextResponse.json({
      valid: true,
      documento: {
        csv: doc.csv,
        tipo_documento: doc.document_type_name,
        version: doc.version_number,
        firmante: doc.inversor_name,
        fecha_firma: doc.firma_completed_at,
        fecha_caducidad: doc.fecha_caducidad,
        estado: estado_actual,
        hash_pdf: doc.pdf_hash,
      },
    })
  } catch (error) {
    console.error("[Documents] Error verifying CSV:", error)
    return NextResponse.json({ error: "Error al verificar documento" }, { status: 500 })
  }
}
