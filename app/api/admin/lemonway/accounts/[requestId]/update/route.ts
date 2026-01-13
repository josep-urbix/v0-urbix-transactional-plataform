/**
 * Endpoint: PUT /api/admin/lemonway/accounts/{requestId}/update
 * Propósito: Actualizar solicitud en estado DRAFT
 * Body: Campos a actualizar (parcial)
 * Permisos: lemonway:accounts:edit
 * Trazabilidad: Especificación Sección 8.2
 */

import { getSession, requirePermission } from "@/lib/auth"
import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

export async function PUT(request: NextRequest, { params }: { params: { requestId: string } }) {
  try {
    const session = await getSession()

    // Verificar permisos
    const authResult = await requirePermission(
      session?.user,
      "lemonway:accounts:edit",
      "lemonway:accounts",
      "edit",
      request,
    )
    if (!authResult.success) return authResult.error

    const userId = session?.user?.id
    const { requestId } = params
    const payload = await request.json()

    // Validar que la solicitud existe y es del usuario
    const existing = await sql`
      SELECT id, status, created_by_user_id
      FROM investors.lemonway_account_requests
      WHERE id = ${requestId}
    `

    if (existing.length === 0) {
      return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 })
    }

    if (existing[0].status !== "DRAFT") {
      return NextResponse.json({ error: "Solo se pueden editar solicitudes en estado DRAFT" }, { status: 400 })
    }

    if (existing[0].created_by_user_id !== userId) {
      return NextResponse.json({ error: "No tienes permiso para editar esta solicitud" }, { status: 403 })
    }

    // Filtrar campos que se pueden actualizar
    const allowedFields = [
      "first_name",
      "last_name",
      "birth_date",
      "email",
      "phone_number",
      "birth_country_id",
      "nationality_ids",
      "profile_type",
      "street",
      "city",
      "postal_code",
      "country_id",
      "province",
      "occupation",
      "annual_income",
      "estimated_wealth",
      "pep_status",
      "pep_position",
      "pep_start_date",
      "pep_end_date",
      "origin_of_funds",
      "has_ifi_tax",
    ]

    const fieldsToUpdate = Object.entries(payload)
      .filter(([key]) => allowedFields.includes(key))
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})

    if (Object.keys(fieldsToUpdate).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    // Construir UPDATE dinámico
    const updateParts: string[] = []
    const updateValues: any[] = []

    Object.entries(fieldsToUpdate).forEach(([key, value]) => {
      updateParts.push(`${key} = $${updateValues.length + 1}`)
      updateValues.push(value)
    })

    updateParts.push("updated_at = NOW()")
    updateParts.push("validation_status = 'PENDING'")

    const updateQuery = `
      UPDATE investors.lemonway_account_requests
      SET ${updateParts.join(", ")}
      WHERE id = $${updateValues.length + 1}
      RETURNING *
    `

    const result = await sql`
      UPDATE investors.lemonway_account_requests
      SET ${sql.raw(updateParts.join(", "))}
      WHERE id = ${requestId}
      RETURNING *
    `

    return NextResponse.json(
      {
        success: true,
        data: result[0],
        message: "Solicitud actualizada",
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("[v0] Update account error:", error)
    return NextResponse.json({ error: "Failed to update account" }, { status: 500 })
  }
}
