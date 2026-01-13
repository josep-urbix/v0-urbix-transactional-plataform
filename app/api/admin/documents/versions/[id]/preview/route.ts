import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireRole } from "@/lib/auth"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(["admin", "superadmin"])

    const { id } = await params
    const { inversor_email } = await request.json()

    if (!inversor_email) {
      return NextResponse.json({ error: "Email del inversor requerido" }, { status: 400 })
    }

    // Buscar la versión del documento
    const versionResult = await sql`
      SELECT contenido_html, variables_disponibles 
      FROM documentos.document_version 
      WHERE id = ${id}
    `

    if (versionResult.length === 0) {
      return NextResponse.json({ error: "Versión no encontrada" }, { status: 404 })
    }

    const version = versionResult[0]

    const investorResult = await sql`
      SELECT 
        id, first_name, last_name, email, phone, display_name,
        avatar_url, status, kyc_status, email_verified,
        created_at, updated_at, last_login_at
      FROM investors."User"
      WHERE email = ${inversor_email}
      LIMIT 1
    `

    if (investorResult.length === 0) {
      return NextResponse.json({ error: "Inversor no encontrado" }, { status: 404 })
    }

    const investor = investorResult[0]

    const variables: Record<string, string> = {
      // Notación simple
      nombre_inversor: `${investor.first_name} ${investor.last_name}`,
      nombre_completo: investor.display_name || `${investor.first_name} ${investor.last_name}`,
      email_inversor: investor.email,
      telefono_inversor: investor.phone || "",
      primer_nombre: investor.first_name,
      apellido: investor.last_name,
      estado_inversor: investor.status || "",
      kyc_estado: investor.kyc_status || "",

      // Notación tabla.columna para todas las columnas
      "investors.User.id": investor.id,
      "investors.User.first_name": investor.first_name,
      "investors.User.last_name": investor.last_name,
      "investors.User.email": investor.email,
      "investors.User.phone": investor.phone || "",
      "investors.User.display_name": investor.display_name || `${investor.first_name} ${investor.last_name}`,
      "investors.User.avatar_url": investor.avatar_url || "",
      "investors.User.status": investor.status || "",
      "investors.User.kyc_status": investor.kyc_status || "",
      "investors.User.email_verified": investor.email_verified ? "Sí" : "No",

      // Fechas
      fecha_registro: new Date(investor.created_at).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      fecha_ultimo_acceso: investor.last_login_at
        ? new Date(investor.last_login_at).toLocaleDateString("es-ES", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "",
      fecha_actual: new Date().toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      año_actual: new Date().getFullYear().toString(),
    }

    // Reemplazar variables en el contenido HTML
    let previewHtml = version.contenido_html

    // Replace all variables in the format {{variable_name}} or {{table.column}}
    previewHtml = previewHtml.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (match: string, variableName: string) => {
      // Check if we have a value for this variable
      if (variables[variableName] !== undefined) {
        return variables[variableName]
      }
      // If not found, return the original placeholder
      return match
    })

    return NextResponse.json({
      preview_html: previewHtml,
      investor: {
        nombre: variables.nombre_inversor,
        email: investor.email,
      },
      variables_used: version.variables_disponibles,
    })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }
    console.error("[Documents] Error generating preview:", error)
    return NextResponse.json({ error: "Error al generar vista previa" }, { status: 500 })
  }
}
