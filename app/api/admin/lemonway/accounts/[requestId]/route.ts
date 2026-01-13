/**
 * Endpoint: GET /api/admin/lemonway/accounts/{requestId}
 * Propósito: Recuperar detalles completos de una solicitud
 * Permisos: lemonway:accounts:view
 * Trazabilidad: Especificación Sección 8.2
 */

import { getSession, requirePermission } from "@/lib/auth"
import { sql } from "@neondatabase/serverless"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { requestId: string } }) {
  try {
    const session = await getSession()

    // Verificar permisos
    const authResult = await requirePermission(
      session?.user,
      "lemonway:accounts:view",
      "lemonway:accounts",
      "view",
      request,
    )
    if (!authResult.success) return authResult.error

    const { requestId } = params

    if (!requestId) {
      return NextResponse.json({ error: "requestId requerido" }, { status: 400 })
    }

    const results = await sql`
      SELECT *
      FROM investors.lemonway_account_requests
      WHERE id = ${requestId} AND deleted_at IS NULL
    `

    if (results.length === 0) {
      return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 })
    }

    const account = results[0]

    // Obtener nombre del país de nacimiento
    let birthCountryName = ""
    if (account.birth_country_id) {
      const countryResults = await sql`
        SELECT name_es FROM investors.countries WHERE id = ${account.birth_country_id}
      `
      birthCountryName = countryResults.length > 0 ? countryResults[0].name_es : ""
    }

    // Obtener país de residencia
    let residenceCountryName = ""
    if (account.country_id) {
      const countryResults = await sql`
        SELECT name_es FROM investors.countries WHERE id = ${account.country_id}
      `
      residenceCountryName = countryResults.length > 0 ? countryResults[0].name_es : ""
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          ...account,
          birth_country_name: birthCountryName,
          residence_country_name: residenceCountryName,
        },
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("[v0] Get account error:", error)
    return NextResponse.json({ error: "Failed to get account" }, { status: 500 })
  }
}
