import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth"

// GET - Listar versiones de documentos
export async function GET(request: NextRequest) {
  try {
    await requireRole(["admin", "superadmin"])

    const { searchParams } = new URL(request.url)
    const typeId = searchParams.get("type_id")
    const status = searchParams.get("status")

    let versions
    if (typeId && status) {
      versions = await sql`
        SELECT 
          dv.*,
          dt.name as type_name,
          dt.display_name as type_display_name,
          uc.name as created_by_name,
          up.name as published_by_name,
          (SELECT COUNT(*) FROM documentos.signed_document sd WHERE sd.document_version_id = dv.id) as signed_count
        FROM documentos.document_version dv
        JOIN documentos.document_type dt ON dv.document_type_id = dt.id
        LEFT JOIN public."User" uc ON dv.created_by_admin_id = uc.id
        LEFT JOIN public."User" up ON dv.published_by_admin_id = up.id
        WHERE dv.document_type_id = ${typeId} AND dv.status = ${status}
        ORDER BY dv.created_at DESC
      `
    } else if (typeId) {
      versions = await sql`
        SELECT 
          dv.*,
          dt.name as type_name,
          dt.display_name as type_display_name,
          uc.name as created_by_name,
          up.name as published_by_name,
          (SELECT COUNT(*) FROM documentos.signed_document sd WHERE sd.document_version_id = dv.id) as signed_count
        FROM documentos.document_version dv
        JOIN documentos.document_type dt ON dv.document_type_id = dt.id
        LEFT JOIN public."User" uc ON dv.created_by_admin_id = uc.id
        LEFT JOIN public."User" up ON dv.published_by_admin_id = up.id
        WHERE dv.document_type_id = ${typeId}
        ORDER BY dv.created_at DESC
      `
    } else if (status) {
      versions = await sql`
        SELECT 
          dv.*,
          dt.name as type_name,
          dt.display_name as type_display_name,
          uc.name as created_by_name,
          up.name as published_by_name,
          (SELECT COUNT(*) FROM documentos.signed_document sd WHERE sd.document_version_id = dv.id) as signed_count
        FROM documentos.document_version dv
        JOIN documentos.document_type dt ON dv.document_type_id = dt.id
        LEFT JOIN public."User" uc ON dv.created_by_admin_id = uc.id
        LEFT JOIN public."User" up ON dv.published_by_admin_id = up.id
        WHERE dv.status = ${status}
        ORDER BY dv.created_at DESC
      `
    } else {
      versions = await sql`
        SELECT 
          dv.*,
          dt.name as type_name,
          dt.display_name as type_display_name,
          uc.name as created_by_name,
          up.name as published_by_name,
          (SELECT COUNT(*) FROM documentos.signed_document sd WHERE sd.document_version_id = dv.id) as signed_count
        FROM documentos.document_version dv
        JOIN documentos.document_type dt ON dv.document_type_id = dt.id
        LEFT JOIN public."User" uc ON dv.created_by_admin_id = uc.id
        LEFT JOIN public."User" up ON dv.published_by_admin_id = up.id
        ORDER BY dv.created_at DESC
      `
    }

    return NextResponse.json({ versions })
  } catch (error: any) {
    console.error("[Documents] Error listing versions:", error)
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }
    return NextResponse.json({ error: "Error al listar versiones" }, { status: 500 })
  }
}

// POST - Crear versión de documento
export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(["admin", "superadmin"])

    const body = await request.json()
    const { document_type_id, version_number, contenido_html, variables_disponibles = [], notas_version } = body

    if (!document_type_id || !version_number || !contenido_html) {
      return NextResponse.json(
        { error: "document_type_id, version_number y contenido_html son requeridos" },
        { status: 400 },
      )
    }

    const result = await sql`
      INSERT INTO documentos.document_version (
        document_type_id, version_number, contenido_html,
        variables_disponibles, notas_version, created_by_admin_id
      ) VALUES (
        ${document_type_id}, ${version_number}, ${contenido_html},
        ${JSON.stringify(variables_disponibles)}::jsonb, ${notas_version || null},
        ${session.user.id}
      )
      RETURNING *
    `

    return NextResponse.json({ version: result[0] }, { status: 201 })
  } catch (error: any) {
    console.error("[Documents] Error creating version:", error)
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Ya existe una versión con ese número para este tipo de documento" },
        { status: 409 },
      )
    }
    return NextResponse.json({ error: "Error al crear versión" }, { status: 500 })
  }
}
