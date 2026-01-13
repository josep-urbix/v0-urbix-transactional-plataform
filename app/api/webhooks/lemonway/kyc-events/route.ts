/**
 * Endpoint: POST /api/webhooks/lemonway/kyc-events
 * Propósito: Recibir webhooks de eventos KYC desde Lemonway
 * Eventos soportados:
 *   - KYC_VALIDATED: Identidad verificada ✓
 *   - KYC_REJECTED: Documentos rechazados ✗
 *   - ADDITIONAL_INFORMATION_REQUIRED: Solicitud de más datos
 * Flujo:
 *   1. Validar signature del webhook (HMAC-SHA256)
 *   2. Procesar evento según tipo
 *   3. Actualizar status en BD
 *   4. Disparar workflows según resultado
 *   5. Notificar usuario
 * Trazabilidad: Especificación Sección 3 - FASE 2
 */

import { sql } from "@neondatabase/serverless"
import { type NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { getLemonwayWebhookSecret } from "@/lib/lemonway-config-manager"

interface LemonwayWebhookEvent {
  event_id: string
  event_type: string
  timestamp: string
  wallet_id: string
  status: string
  data?: Record<string, any>
  signature?: string
}

// Validar firma del webhook
function validateWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto.createHmac("sha256", secret).update(payload).digest("hex")
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text()
    const event: LemonwayWebhookEvent = JSON.parse(payload)

    console.log("[v0] [WebhookKYC] Recibido evento:", event.event_type, "wallet:", event.wallet_id)

    let webhookSecret: string | null = null
    try {
      webhookSecret = await getLemonwayWebhookSecret()
    } catch (error) {
      console.warn("[v0] [WebhookKYC] No se pudo obtener webhook secret de BD, webhook no validado", error)
    }

    if (webhookSecret && event.signature) {
      try {
        if (!validateWebhookSignature(payload, event.signature, webhookSecret)) {
          console.error("[v0] [WebhookKYC] Firma inválida")
          return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
        }
      } catch (error) {
        console.error("[v0] [WebhookKYC] Error validando firma:", error)
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
      }
    }

    // PASO 2: Recuperar solicitud por wallet_id
    const requests = await sql`
      SELECT 
        id,
        request_reference,
        status,
        email,
        first_name,
        last_name,
        created_by_user_id
      FROM investors.lemonway_account_requests
      WHERE lemonway_wallet_id = ${event.wallet_id} AND deleted_at IS NULL
    `

    if (requests.length === 0) {
      console.warn("[v0] [WebhookKYC] Wallet no encontrado:", event.wallet_id)
      return NextResponse.json(
        {
          success: true,
          message: "Evento procesado pero wallet no encontrado en URBIX",
        },
        { status: 200 },
      )
    }

    const accountRequest = requests[0]
    console.log("[v0] [WebhookKYC] Solicitud encontrada:", accountRequest.request_reference)

    // PASO 3: Procesar según tipo de evento
    switch (event.event_type) {
      case "KYC_VALIDATED": {
        console.log("[v0] [WebhookKYC] KYC VALIDADO")

        // Actualizar status a KYC-2 Completo
        await sql`
          UPDATE investors.lemonway_account_requests
          SET 
            status = 'KYC-2 Completo',
            kyc_2_completed_at = NOW(),
            updated_at = NOW()
          WHERE id = ${accountRequest.id}
        `

        // Actualizar payment_account
        await sql`
          UPDATE payments.payment_accounts
          SET 
            status = 'KYC-2 Completo',
            kyc_status = 'VERIFIED',
            account_can_transact = true,
            updated_at = NOW()
          WHERE lemonway_wallet_id = ${event.wallet_id}
        `

        // Activar virtual_accounts asociadas
        await sql`
          UPDATE virtual_accounts.cuentas_virtuales
          SET 
            status = 'ACTIVE',
            kyc_status = 'VERIFIED',
            updated_at = NOW()
          WHERE payment_account_id IN (
            SELECT id FROM payments.payment_accounts 
            WHERE lemonway_wallet_id = ${event.wallet_id}
          )
        `

        // TODO: Disparar workflow 'lemonway_kyc_approved'
        // TODO: Enviar email de confirmación al usuario

        break
      }

      case "KYC_REJECTED": {
        console.log("[v0] [WebhookKYC] KYC RECHAZADO")

        const rejectionReason = event.data?.reason || "Documentos rechazados por Lemonway"

        await sql`
          UPDATE investors.lemonway_account_requests
          SET 
            status = 'REJECTED',
            rejected_at = NOW(),
            rejection_reason = ${rejectionReason},
            updated_at = NOW()
          WHERE id = ${accountRequest.id}
        `

        // Deshabilitar virtual_accounts
        await sql`
          UPDATE virtual_accounts.cuentas_virtuales
          SET 
            status = 'INACTIVE',
            kyc_status = 'REJECTED',
            updated_at = NOW()
          WHERE payment_account_id IN (
            SELECT id FROM payments.payment_accounts 
            WHERE lemonway_wallet_id = ${event.wallet_id}
          )
        `

        // TODO: Disparar workflow 'lemonway_kyc_rejected'
        // TODO: Enviar email explicando motivos y opciones

        break
      }

      case "ADDITIONAL_INFORMATION_REQUIRED": {
        console.log("[v0] [WebhookKYC] INFORMACIÓN ADICIONAL REQUERIDA")

        const requiredInfo = event.data?.required_fields || []

        // Mantener status pero registrar que se necesita más información
        await sql`
          INSERT INTO lemonway_kyc_events (
            id,
            wallet_id,
            event_type,
            event_data,
            processed_at,
            processed
          ) VALUES (
            ${crypto.randomUUID()},
            ${event.wallet_id},
            'ADDITIONAL_INFO_REQUIRED',
            ${JSON.stringify({
              required_fields: requiredInfo,
              requested_at: new Date().toISOString(),
            })},
            NOW(),
            true
          )
        `

        // TODO: Disparar workflow para solicitar información
        // TODO: Enviar email al usuario con detalles de qué información falta

        break
      }

      default:
        console.warn("[v0] [WebhookKYC] Evento desconocido:", event.event_type)
    }

    // PASO 4: Registrar evento procesado
    await sql`
      INSERT INTO lemonway_kyc_events (
        id,
        wallet_id,
        event_type,
        event_data,
        processed_at,
        processed
      ) VALUES (
        ${event.event_id || crypto.randomUUID()},
        ${event.wallet_id},
        ${event.event_type},
        ${JSON.stringify(event.data || {})},
        NOW(),
        true
      )
    `

    return NextResponse.json(
      {
        success: true,
        event_id: event.event_id,
        processed_at: new Date().toISOString(),
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("[v0] Webhook KYC error:", error)

    // Log del error para debugging
    try {
      await sql`
        INSERT INTO lemonway_kyc_events (
          id,
          wallet_id,
          event_type,
          event_data,
          processed_at,
          processed
        ) VALUES (
          ${crypto.randomUUID()},
          'unknown',
          'WEBHOOK_ERROR',
          ${JSON.stringify({ error: String(error) })},
          NOW(),
          false
        )
      `
    } catch {
      // Silenciar error de logging
    }

    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 })
  }
}
