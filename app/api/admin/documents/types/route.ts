import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth"

// GET - Listar tipos de documentos
export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(["admin", "superadmin"])

    const { searchParams } = new URL(request.url)
    const activo = searchParams.get("activo")

    let types
    if (activo !== null) {
      const activoBool = activo === "true"
      types = await sql`
        SELECT 
          dt.*,
          u.email as created_by_email,
          (SELECT COUNT(*) FROM documentos.document_version dv WHERE dv.document_type_id = dt.id) as total_versions,
          (SELECT COUNT(*) FROM documentos.document_version dv WHERE dv.document_type_id = dt.id AND dv.status = 'publicado') as published_versions
        FROM documentos.document_type dt
        LEFT JOIN public."User" u ON dt.created_by_admin_id = u.id
        WHERE dt.activo = ${activoBool}
        ORDER BY dt.orden ASC, dt.created_at DESC
      `
    } else {
      types = await sql`
        SELECT 
          dt.*,
          u.email as created_by_email,
          (SELECT COUNT(*) FROM documentos.document_version dv WHERE dv.document_type_id = dt.id) as total_versions,
          (SELECT COUNT(*) FROM documentos.document_version dv WHERE dv.document_type_id = dt.id AND dv.status = 'publicado') as published_versions
        FROM documentos.document_type dt
        LEFT JOIN public."User" u ON dt.created_by_admin_id = u.id
        ORDER BY dt.orden ASC, dt.created_at DESC
      `
    }

    return NextResponse.json({ types })
  } catch (error: any) {
    console.error("[Documents] Error listing types:", error)
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }
    return NextResponse.json({ error: "Error al listar tipos de documentos" }, { status: 500 })
  }
}

// POST - Crear tipo de documento
export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(["admin", "superadmin"])

    const body = await request.json()
    const {
      name,
      display_name,
      description,
      requiere_firma = true,
      obligatorio_antes_de_invertir = false,
      aplica_a_proyecto = false,
      dias_validez,
      orden = 0,
    } = body

    if (!name || !display_name) {
      return NextResponse.json({ error: "name y display_name son requeridos" }, { status: 400 })
    }

    // Validar formato snake_case para name
    if (!/^[a-z][a-z0-9_]*$/.test(name)) {
      return NextResponse.json(
        { error: "name debe estar en formato snake_case (minúsculas y guiones bajos)" },
        { status: 400 },
      )
    }

    const result = await sql`
      INSERT INTO documentos.document_type (
        name, display_name, description, requiere_firma,
        obligatorio_antes_de_invertir, aplica_a_proyecto,
        dias_validez, orden, created_by_admin_id
      ) VALUES (
        ${name}, ${display_name}, ${description || null}, ${requiere_firma},
        ${obligatorio_antes_de_invertir}, ${aplica_a_proyecto},
        ${dias_validez || null}, ${orden}, ${session.user.id}
      )
      RETURNING *
    `

    return NextResponse.json({ type: result[0] }, { status: 201 })
  } catch (error: any) {
    console.error("[Documents] Error creating type:", error)
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }
    if (error.code === "23505") {
      return NextResponse.json({ error: "Ya existe un tipo de documento con ese nombre" }, { status: 409 })
    }
    return NextResponse.json({ error: "Error al crear tipo de documento" }, { status: 500 })
  }
}
