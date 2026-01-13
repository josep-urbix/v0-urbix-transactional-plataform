import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth"

// GET - Listar documentos firmados (admin)
export async function GET(request: NextRequest) {
  try {
    await requireRole(["admin", "superadmin"])

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const inversorId = searchParams.get("inversor_id")
    const typeId = searchParams.get("type_id")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    let documents
    const allFilters = status && inversorId && typeId
    const statusAndInversor = status && inversorId && !typeId
    const statusAndType = status && typeId && !inversorId
    const inversorAndType = inversorId && typeId && !status
    const onlyStatus = status && !inversorId && !typeId
    const onlyInversor = inversorId && !status && !typeId
    const onlyType = typeId && !status && !inversorId

    if (allFilters) {
      documents = await sql`
        SELECT 
          sd.*,
          iu.email as inversor_email,
          iu.first_name as inversor_first_name,
          iu.last_name as inversor_last_name,
          dv.version_number,
          dt.display_name as document_type_name,
          dt.name as document_type_code
        FROM documentos.signed_document sd
        JOIN investors."User" iu ON sd.inversor_id = iu.id
        JOIN documentos.document_version dv ON sd.document_version_id = dv.id
        JOIN documentos.document_type dt ON dv.document_type_id = dt.id
        WHERE sd.status = ${status} AND sd.inversor_id = ${inversorId} AND dt.id = ${typeId}
        ORDER BY sd.firma_completed_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (statusAndInversor) {
      documents = await sql`
        SELECT 
          sd.*,
          iu.email as inversor_email,
          iu.first_name as inversor_first_name,
          iu.last_name as inversor_last_name,
          dv.version_number,
          dt.display_name as document_type_name,
          dt.name as document_type_code
        FROM documentos.signed_document sd
        JOIN investors."User" iu ON sd.inversor_id = iu.id
        JOIN documentos.document_version dv ON sd.document_version_id = dv.id
        JOIN documentos.document_type dt ON dv.document_type_id = dt.id
        WHERE sd.status = ${status} AND sd.inversor_id = ${inversorId}
        ORDER BY sd.firma_completed_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (statusAndType) {
      documents = await sql`
        SELECT 
          sd.*,
          iu.email as inversor_email,
          iu.first_name as inversor_first_name,
          iu.last_name as inversor_last_name,
          dv.version_number,
          dt.display_name as document_type_name,
          dt.name as document_type_code
        FROM documentos.signed_document sd
        JOIN investors."User" iu ON sd.inversor_id = iu.id
        JOIN documentos.document_version dv ON sd.document_version_id = dv.id
        JOIN documentos.document_type dt ON dv.document_type_id = dt.id
        WHERE sd.status = ${status} AND dt.id = ${typeId}
        ORDER BY sd.firma_completed_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (inversorAndType) {
      documents = await sql`
        SELECT 
          sd.*,
          iu.email as inversor_email,
          iu.first_name as inversor_first_name,
          iu.last_name as inversor_last_name,
          dv.version_number,
          dt.display_name as document_type_name,
          dt.name as document_type_code
        FROM documentos.signed_document sd
        JOIN investors."User" iu ON sd.inversor_id = iu.id
        JOIN documentos.document_version dv ON sd.document_version_id = dv.id
        JOIN documentos.document_type dt ON dv.document_type_id = dt.id
        WHERE sd.inversor_id = ${inversorId} AND dt.id = ${typeId}
        ORDER BY sd.firma_completed_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (onlyStatus) {
      documents = await sql`
        SELECT 
          sd.*,
          iu.email as inversor_email,
          iu.first_name as inversor_first_name,
          iu.last_name as inversor_last_name,
          dv.version_number,
          dt.display_name as document_type_name,
          dt.name as document_type_code
        FROM documentos.signed_document sd
        JOIN investors."User" iu ON sd.inversor_id = iu.id
        JOIN documentos.document_version dv ON sd.document_version_id = dv.id
        JOIN documentos.document_type dt ON dv.document_type_id = dt.id
        WHERE sd.status = ${status}
        ORDER BY sd.firma_completed_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (onlyInversor) {
      documents = await sql`
        SELECT 
          sd.*,
          iu.email as inversor_email,
          iu.first_name as inversor_first_name,
          iu.last_name as inversor_last_name,
          dv.version_number,
          dt.display_name as document_type_name,
          dt.name as document_type_code
        FROM documentos.signed_document sd
        JOIN investors."User" iu ON sd.inversor_id = iu.id
        JOIN documentos.document_version dv ON sd.document_version_id = dv.id
        JOIN documentos.document_type dt ON dv.document_type_id = dt.id
        WHERE sd.inversor_id = ${inversorId}
        ORDER BY sd.firma_completed_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (onlyType) {
      documents = await sql`
        SELECT 
          sd.*,
          iu.email as inversor_email,
          iu.first_name as inversor_first_name,
          iu.last_name as inversor_last_name,
          dv.version_number,
          dt.display_name as document_type_name,
          dt.name as document_type_code
        FROM documentos.signed_document sd
        JOIN investors."User" iu ON sd.inversor_id = iu.id
        JOIN documentos.document_version dv ON sd.document_version_id = dv.id
        JOIN documentos.document_type dt ON dv.document_type_id = dt.id
        WHERE dt.id = ${typeId}
        ORDER BY sd.firma_completed_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else {
      documents = await sql`
        SELECT 
          sd.*,
          iu.email as inversor_email,
          iu.first_name as inversor_first_name,
          iu.last_name as inversor_last_name,
          dv.version_number,
          dt.display_name as document_type_name,
          dt.name as document_type_code
        FROM documentos.signed_document sd
        JOIN investors."User" iu ON sd.inversor_id = iu.id
        JOIN documentos.document_version dv ON sd.document_version_id = dv.id
        JOIN documentos.document_type dt ON dv.document_type_id = dt.id
        ORDER BY sd.firma_completed_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    }

    // Count query with same filters
    let countResult
    if (allFilters) {
      countResult = await sql`
        SELECT COUNT(*) as total
        FROM documentos.signed_document sd
        JOIN documentos.document_version dv ON sd.document_version_id = dv.id
        JOIN documentos.document_type dt ON dv.document_type_id = dt.id
        WHERE sd.status = ${status} AND sd.inversor_id = ${inversorId} AND dt.id = ${typeId}
      `
    } else if (statusAndInversor) {
      countResult = await sql`
        SELECT COUNT(*) as total
        FROM documentos.signed_document sd
        WHERE sd.status = ${status} AND sd.inversor_id = ${inversorId}
      `
    } else if (statusAndType) {
      countResult = await sql`
        SELECT COUNT(*) as total
        FROM documentos.signed_document sd
        JOIN documentos.document_version dv ON sd.document_version_id = dv.id
        WHERE sd.status = ${status} AND dv.document_type_id = ${typeId}
      `
    } else if (inversorAndType) {
      countResult = await sql`
        SELECT COUNT(*) as total
        FROM documentos.signed_document sd
        JOIN documentos.document_version dv ON sd.document_version_id = dv.id
        WHERE sd.inversor_id = ${inversorId} AND dv.document_type_id = ${typeId}
      `
    } else if (onlyStatus) {
      countResult = await sql`SELECT COUNT(*) as total FROM documentos.signed_document WHERE status = ${status}`
    } else if (onlyInversor) {
      countResult =
        await sql`SELECT COUNT(*) as total FROM documentos.signed_document WHERE inversor_id = ${inversorId}`
    } else if (onlyType) {
      countResult = await sql`
        SELECT COUNT(*) as total
        FROM documentos.signed_document sd
        JOIN documentos.document_version dv ON sd.document_version_id = dv.id
        WHERE dv.document_type_id = ${typeId}
      `
    } else {
      countResult = await sql`SELECT COUNT(*) as total FROM documentos.signed_document`
    }

    return NextResponse.json({
      documents,
      total: Number.parseInt(countResult[0].total),
      limit,
      offset,
    })
  } catch (error: any) {
    console.error("[Documents] Error listing signed documents:", error)
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }
    return NextResponse.json({ error: "Error al listar documentos firmados" }, { status: 500 })
  }
}
