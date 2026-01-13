import { type NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth"
import { sql } from "@/lib/db"
import { randomBytes } from "crypto"

export async function POST(request: NextRequest) {
  try {
    await requireRole(["admin", "superadmin"])

    const { documentVersionId, investorEmail } = await request.json()

    if (!documentVersionId || !investorEmail) {
      return NextResponse.json({ error: "Faltan parámetros requeridos" }, { status: 400 })
    }

    // Buscar inversor por email
    const investors = await sql`
      SELECT id, email, first_name, last_name
      FROM investors."User"
      WHERE email = ${investorEmail}
      LIMIT 1
    `

    if (investors.length === 0) {
      return NextResponse.json({ error: "Inversor no encontrado con ese email" }, { status: 404 })
    }

    const investor = investors[0]

    // Verificar que la versión existe y está publicada
    const versions = await sql`
      SELECT dv.id, dv.version_number, dt.display_name as document_type_name
      FROM documentos.document_version dv
      JOIN documentos.document_type dt ON dv.document_type_id = dt.id
      WHERE dv.id = ${documentVersionId}
      AND dv.status = 'publicado'
      LIMIT 1
    `

    if (versions.length === 0) {
      return NextResponse.json({ error: "Versión de documento no encontrada o no está publicada" }, { status: 404 })
    }

    const version = versions[0]

    // Generar token de firma
    const tokenFirma = randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutos

    // Crear sesión de firma
    const sessions = await sql`
      INSERT INTO documentos.signature_session (
        inversor_id,
        document_version_id,
        status,
        token_firma,
        expires_at,
        canal_origen
      ) VALUES (
        ${investor.id},
        ${documentVersionId},
        'pendiente',
        ${tokenFirma},
        ${expiresAt.toISOString()},
        'desktop'
      )
      RETURNING *
    `

    const session = sessions[0]

    return NextResponse.json({
      id: session.id,
      inversor_email: investor.email,
      document_type: version.document_type_name,
      version: version.version_number,
      status: session.status,
      token_firma: session.token_firma,
      expires_at: session.expires_at,
      created_at: session.created_at,
    })
  } catch (error: any) {
    console.error("[Testing] Error creating session:", error)
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json({ error: "Error al crear sesión de prueba" }, { status: 500 })
  }
}
