/**
 * Helper para obtener y actualizar estado de KYC
 * Trazabilidad: Especificación Sección 3 - FASE 2
 */

import { sql } from "@neondatabase/serverless"

export interface KYCStatus {
  requestId: string
  walletId: string
  status: "PENDING" | "VERIFIED" | "REJECTED" | "ADDITIONAL_INFO_REQUIRED"
  completedAt?: string
  rejectionReason?: string
  requiredFields?: string[]
}

export class LemonwayKYCStatus {
  /**
   * Obtener status de KYC para una solicitud
   */
  static async getKYCStatus(requestId: string): Promise<KYCStatus | null> {
    const results = await sql`
      SELECT 
        id,
        status,
        lemonway_wallet_id,
        kyc_2_completed_at,
        rejection_reason
      FROM investors.lemonway_account_requests
      WHERE id = ${requestId} AND deleted_at IS NULL
    `

    if (results.length === 0) return null

    const request = results[0]

    // Determinar status de KYC
    let kycStatus: "PENDING" | "VERIFIED" | "REJECTED" | "ADDITIONAL_INFO_REQUIRED" = "PENDING"

    if (request.status === "KYC-2 Completo") {
      kycStatus = "VERIFIED"
    } else if (request.status === "REJECTED") {
      kycStatus = "REJECTED"
    }

    // Buscar si hay información adicional requerida
    const additionalInfoEvents = await sql`
      SELECT event_data
      FROM lemonway_kyc_events
      WHERE wallet_id = ${request.lemonway_wallet_id}
        AND event_type = 'ADDITIONAL_INFO_REQUIRED'
      ORDER BY processed_at DESC
      LIMIT 1
    `

    const requiredFields =
      additionalInfoEvents.length > 0 ? additionalInfoEvents[0].event_data?.required_fields || [] : []

    if (requiredFields.length > 0) {
      kycStatus = "ADDITIONAL_INFO_REQUIRED"
    }

    return {
      requestId,
      walletId: request.lemonway_wallet_id,
      status: kycStatus,
      completedAt: request.kyc_2_completed_at,
      rejectionReason: request.rejection_reason,
      requiredFields,
    }
  }

  /**
   * Obtener status de KYC por wallet_id
   */
  static async getKYCStatusByWallet(walletId: string): Promise<KYCStatus | null> {
    const results = await sql`
      SELECT id
      FROM investors.lemonway_account_requests
      WHERE lemonway_wallet_id = ${walletId} AND deleted_at IS NULL
      LIMIT 1
    `

    if (results.length === 0) return null

    return this.getKYCStatus(results[0].id)
  }

  /**
   * Listar todos los eventos de KYC para una solicitud
   */
  static async getKYCEvents(requestId: string) {
    const requests = await sql`
      SELECT lemonway_wallet_id FROM investors.lemonway_account_requests WHERE id = ${requestId}
    `

    if (requests.length === 0) return []

    const walletId = requests[0].lemonway_wallet_id

    return await sql`
      SELECT *
      FROM lemonway_kyc_events
      WHERE wallet_id = ${walletId}
      ORDER BY processed_at DESC
    `
  }
}
