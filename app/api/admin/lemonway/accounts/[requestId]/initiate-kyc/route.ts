/**
 * Endpoint: POST /api/admin/lemonway/accounts/{requestId}/initiate-kyc
 * Propósito: Iniciar proceso de verificación KYC/AML (Fase 2)
 * Flujo:
 *   1. Validar que solicitud esté en status SUBMITTED (completó Fase 1)
 *   2. Obtener resumption_url guardada en BD
 *   3. Disponer usuario a completar KYC en Lemonway
 *   4. Registrar initiación en BD (kyc_initiated_at)
 *   5. Disparar evento de workflow
 * Permisos: lemonway:accounts:create
 * Trazabilidad: Especificación Sección 3 - FASE 2
 */

import { getSession, requirePermission } from "@/lib/auth"
import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest, { params }: { params: { requestId: string } }) {
  try {
    const session = await getSession()

    // Verificar permisos
    const authResult = await requirePermission(
      session?.user,
      "lemonway:accounts:create",
      "lemonway:accounts",
      "create",
      request,
    )
    if (!authResult.success) return authResult.error

    const userId = session?.user?.id
    const { requestId } = params

    if (!requestId) {
      return NextResponse.json({ error: "requestId requerido" }, { status: 400 })
    }

    // PASO 1: Validar que solicitud existe y está en SUBMITTED
    console.log("[v0] [InitiateKYC] Recuperando solicitud:", requestId)
    const requests = await sql`
      SELECT 
        id,
        request_reference,
        status,
        lemonway_wallet_id,
        lemonway_resumption_url,
        email,
        first_name,
        last_name,
        created_by_user_id
      FROM investors.lemonway_account_requests
      WHERE id = ${requestId} AND deleted_at IS NULL
    `

    if (requests.length === 0) {
      return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 })
    }

    const accountRequest = requests[0]

    // Validar status
    if (accountRequest.status !== "SUBMITTED") {
      return NextResponse.json(
        {
          error: `Solicitud debe estar en estado SUBMITTED. Estado actual: ${accountRequest.status}`,
        },
        { status: 400 },
      )
    }

    if (!accountRequest.lemonway_wallet_id) {
      return NextResponse.json(
        {
          error: "No hay wallet de Lemonway asociado. Completar Fase 1 primero.",
        },
        { status: 400 },
      )
    }

    // PASO 2: Validar que hay resumption_url
    if (!accountRequest.lemonway_resumption_url) {
      return NextResponse.json(
        {
          error: "No se encontró URL de reanudación. Contactar administrador.",
        },
        { status: 400 },
      )
    }

    // PASO 3: Registrar initiación de KYC en BD
    console.log("[v0] [InitiateKYC] Registrando iniciación de KYC...")
    await sql`
      UPDATE investors.lemonway_account_requests
      SET 
        status = 'KYC-1 Completo',
        kyc_1_completed_at = CASE WHEN kyc_1_completed_at IS NULL THEN NOW() ELSE kyc_1_completed_at END,
        updated_at = NOW()
      WHERE id = ${requestId}
    `

    // PASO 4: Crear entrada en tabla de eventos KYC (para webhook tracking)
    const eventId = crypto.randomUUID()
    await sql`
      INSERT INTO lemonway_kyc_events (
        id,
        wallet_id,
        event_type,
        event_data,
        processed_at,
        processed
      ) VALUES (
        ${eventId},
        ${accountRequest.lemonway_wallet_id},
        'KYC_INITIATED',
        ${JSON.stringify({
          request_id: requestId,
          request_reference: accountRequest.request_reference,
          initiated_by: userId,
          initiated_at: new Date().toISOString(),
        })},
        NOW(),
        true
      )
    `

    // PASO 5: Disparar workflow (cuando esté disponible)
    // TODO: await workflowEngine.trigger('lemonway_kyc_initiated', {
    //   requestId,
    //   walletId: accountRequest.lemonway_wallet_id,
    //   email: accountRequest.email,
    //   name: `${accountRequest.first_name} ${accountRequest.last_name}`
    // })

    return NextResponse.json(
      {
        success: true,
        status: "KYC-1 Completo",
        requestId,
        walletId: accountRequest.lemonway_wallet_id,
        resumptionUrl: accountRequest.lemonway_resumption_url,
        message: "Proceso KYC iniciado. Usuario debe completar verificación en Lemonway.",
        nextStep: "Usuario debe acceder a la URL de reanudación y completar verificación de identidad",
        kyc_link: accountRequest.lemonway_resumption_url,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("[v0] Initiate KYC error:", error)
    return NextResponse.json({ error: "Failed to initiate KYC" }, { status: 500 })
  }
}
