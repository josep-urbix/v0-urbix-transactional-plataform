/**
 * Endpoint: DELETE /api/admin/lemonway/accounts/{requestId}
 * Propósito: Soft-delete de solicitud (solo DRAFT)
 * Behavior: Marca como deleted_at = NOW() y is_archived = true
 * Permisos: lemonway:accounts:edit (gestor)
 * Trazabilidad: Especificación Sección 8.1 (soft delete)
 */

import { getSession, requirePermission } from "@/lib/auth"
import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

export async function DELETE(request: NextRequest, { params }: { params: { requestId: string } }) {
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

    // Validar que la solicitud existe y es DRAFT
    const existing = await sql`
      SELECT id, status, created_by_user_id
      FROM investors.lemonway_account_requests
      WHERE id = ${requestId}
    `

    if (existing.length === 0) {
      return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 })
    }

    if (existing[0].status !== "DRAFT") {
      return NextResponse.json({ error: "Solo se pueden eliminar solicitudes en estado DRAFT" }, { status: 400 })
    }

    if (existing[0].created_by_user_id !== userId) {
      return NextResponse.json({ error: "No tienes permiso para eliminar esta solicitud" }, { status: 403 })
    }

    await sql`
      UPDATE investors.lemonway_account_requests
      SET 
        deleted_at = NOW(),
        is_archived = true
      WHERE id = ${requestId}
    `

    return NextResponse.json(
      {
        success: true,
        message: "Solicitud eliminada",
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("[v0] Delete account error:", error)
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 })
  }
}
