/**
 * Endpoint: GET /api/admin/lemonway/accounts/{requestId}/kyc-status
 * Propósito: Obtener estado actual de verificación KYC
 * Response incluye:
 *   - status: PENDING, VERIFIED, REJECTED, ADDITIONAL_INFO_REQUIRED
 *   - completedAt: fecha de finalización (si aplica)
 *   - rejectionReason: motivo del rechazo (si aplica)
 *   - requiredFields: campos adicionales solicitados (si aplica)
 *   - events: lista de eventos KYC en orden cronológico
 * Permisos: lemonway:accounts:view
 * Trazabilidad: Especificación Sección 3 - FASE 2
 */

import { getSession, requirePermission } from "@/lib/auth"
import { LemonwayKYCStatus } from "@/lib/lemonway-kyc-status"
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

    const kycStatus = await LemonwayKYCStatus.getKYCStatus(requestId)

    if (!kycStatus) {
      return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 })
    }

    const events = await LemonwayKYCStatus.getKYCEvents(requestId)

    return NextResponse.json(
      {
        success: true,
        data: {
          ...kycStatus,
          events,
        },
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("[v0] Get KYC status error:", error)
    return NextResponse.json({ error: "Failed to get KYC status" }, { status: 500 })
  }
}
