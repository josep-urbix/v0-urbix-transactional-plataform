import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth"

// GET - Listar sesiones de firma (admin)
export async function GET(request: NextRequest) {
  try {
    await requireRole(["admin", "superadmin"])

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const inversorId = searchParams.get("inversor_id")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    let sessions
    if (status && inversorId) {
      sessions = await sql`
        SELECT 
          ss.*,
          iu.email as inversor_email,
          iu.first_name as inversor_first_name,
          iu.last_name as inversor_last_name,
          dv.version_number,
          dt.display_name as document_type_name
        FROM documentos.signature_session ss
        JOIN investors."User" iu ON ss.inversor_id = iu.id
        JOIN documentos.document_version dv ON ss.document_version_id = dv.id
        JOIN documentos.document_type dt ON dv.document_type_id = dt.id
        WHERE ss.estado = ${status} AND ss.inversor_id = ${inversorId}
        ORDER BY ss.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (status) {
      sessions = await sql`
        SELECT 
          ss.*,
          iu.email as inversor_email,
          iu.first_name as inversor_first_name,
          iu.last_name as inversor_last_name,
          dv.version_number,
          dt.display_name as document_type_name
        FROM documentos.signature_session ss
        JOIN investors."User" iu ON ss.inversor_id = iu.id
        JOIN documentos.document_version dv ON ss.document_version_id = dv.id
        JOIN documentos.document_type dt ON dv.document_type_id = dt.id
        WHERE ss.estado = ${status}
        ORDER BY ss.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (inversorId) {
      sessions = await sql`
        SELECT 
          ss.*,
          iu.email as inversor_email,
          iu.first_name as inversor_first_name,
          iu.last_name as inversor_last_name,
          dv.version_number,
          dt.display_name as document_type_name
        FROM documentos.signature_session ss
        JOIN investors."User" iu ON ss.inversor_id = iu.id
        JOIN documentos.document_version dv ON ss.document_version_id = dv.id
        JOIN documentos.document_type dt ON dv.document_type_id = dt.id
        WHERE ss.inversor_id = ${inversorId}
        ORDER BY ss.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else {
      sessions = await sql`
        SELECT 
          ss.*,
          iu.email as inversor_email,
          iu.first_name as inversor_first_name,
          iu.last_name as inversor_last_name,
          dv.version_number,
          dt.display_name as document_type_name
        FROM documentos.signature_session ss
        JOIN investors."User" iu ON ss.inversor_id = iu.id
        JOIN documentos.document_version dv ON ss.document_version_id = dv.id
        JOIN documentos.document_type dt ON dv.document_type_id = dt.id
        ORDER BY ss.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    }

    const countResult =
      status && inversorId
        ? await sql`
          SELECT COUNT(*) as total
          FROM documentos.signature_session ss
          WHERE ss.estado = ${status} AND ss.inversor_id = ${inversorId}
        `
        : status
          ? await sql`
            SELECT COUNT(*) as total
            FROM documentos.signature_session ss
            WHERE ss.estado = ${status}
          `
          : inversorId
            ? await sql`
              SELECT COUNT(*) as total
              FROM documentos.signature_session ss
              WHERE ss.inversor_id = ${inversorId}
            `
            : await sql`SELECT COUNT(*) as total FROM documentos.signature_session`

    return NextResponse.json({
      sessions,
      total: Number.parseInt(countResult[0].total),
      limit,
      offset,
    })
  } catch (error: any) {
    console.error("[Documents] Error listing signatures:", error)
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }
    return NextResponse.json({ error: "Error al listar sesiones de firma" }, { status: 500 })
  }
}
