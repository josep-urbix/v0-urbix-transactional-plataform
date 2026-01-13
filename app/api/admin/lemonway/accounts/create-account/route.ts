/**
 * Endpoint: POST /api/admin/lemonway/accounts/create-account
 * Propósito: Validar solicitud DRAFT completamente y crear cuenta en Lemonway (Fase 1)
 * Flujo:
 *   1. Validar campos obligatorios
 *   2. Validar duplicados (3 niveles)
 *   3. Enviar a Lemonway via Online Onboarding API
 *   4. Sincronizar response a BD local (payment_accounts, virtual_accounts)
 *   5. Disparar workflow "lemonway_account_created"
 * Permisos: lemonway:accounts:create
 * Trazabilidad: Especificación Sección 2.3 + Sección 4 + Sección 2.1
 */

import { getSession, requirePermission } from "@/lib/auth"
import { sql } from "@neon/serverless"
import { LemonwayClient } from "@/lib/lemonway-client"
import { LemonwayDuplicateChecker } from "@/lib/lemonway-duplicate-checker"
import { type NextRequest, NextResponse } from "next/server"

interface CreateAccountRequest {
  requestId: string // UUID de solicitud DRAFT en lemonway_account_requests
}

export async function POST(request: NextRequest) {
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
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { requestId } = (await request.json()) as CreateAccountRequest

    if (!requestId) {
      return NextResponse.json({ error: "requestId requerido" }, { status: 400 })
    }

    // PASO 1: Recuperar solicitud DRAFT
    console.log("[v0] [CreateAccount] Recuperando solicitud DRAFT:", requestId)
    const drafts = await sql`
      SELECT *
      FROM investors.lemonway_account_requests
      WHERE id = ${requestId} AND status = 'DRAFT' AND created_by_user_id = ${userId}
    `

    if (drafts.length === 0) {
      return NextResponse.json({ error: "Solicitud DRAFT no encontrada" }, { status: 404 })
    }

    const draft = drafts[0]

    // PASO 2: Validar campos obligatorios (Fase 1)
    const requiredFields = ["first_name", "last_name", "birth_date", "email", "birth_country_id", "profile_type"]
    const missingFields = requiredFields.filter((f) => !draft[f])

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          success: false,
          status: "INVALID",
          validation_errors: {
            missing: missingFields,
          },
          message: `Campos faltantes: ${missingFields.join(", ")}`,
        },
        { status: 400 },
      )
    }

    // PASO 3: Validar duplicados (3 niveles)
    console.log("[v0] [CreateAccount] Validando duplicados...")
    const duplicateResult = await LemonwayDuplicateChecker.checkDuplicates(
      draft.first_name,
      draft.last_name,
      draft.birth_date,
      draft.birth_country_id,
    )

    if (!duplicateResult.canCreate) {
      await sql`
        UPDATE investors.lemonway_account_requests
        SET 
          status = 'INVALID',
          validation_status = 'INVALID',
          validation_errors = ${JSON.stringify({
            duplicate_check: duplicateResult.message,
            matched_accounts: duplicateResult.matchedAccounts,
          })}
        WHERE id = ${requestId}
      `

      return NextResponse.json(
        {
          success: false,
          status: "INVALID",
          validation_status: "INVALID",
          duplicates: duplicateResult,
          message: duplicateResult.message,
        },
        { status: 409 },
      )
    }

    // PASO 4: Obtener país de nacimiento (ISO2 code)
    console.log("[v0] [CreateAccount] Obteniendo código ISO2 del país...")
    const countries = await sql`
      SELECT code_iso2 FROM investors.countries WHERE id = ${draft.birth_country_id}
    `

    if (countries.length === 0) {
      return NextResponse.json({ error: "País de nacimiento no encontrado" }, { status: 400 })
    }

    const birthCountryIso2 = countries[0].code_iso2

    // PASO 5: Preparar payload para Lemonway Online Onboarding API
    console.log("[v0] [CreateAccount] Preparando payload para Lemonway...")
    const lemonwayPayload = {
      firstName: draft.first_name,
      lastName: draft.last_name,
      birthDate: draft.birth_date, // Format: YYYY-MM-DD
      email: draft.email,
      birthCountry: birthCountryIso2,
      phone: draft.phone_number || undefined,
      // Dirección (opcional en Fase 1)
      street: draft.street || undefined,
      city: draft.city || undefined,
      postalCode: draft.postal_code || undefined,
      country: draft.country_id ? countries[0].code_iso2 : undefined,
      // Profile type
      profileType: draft.profile_type,
    }

    // PASO 6: Crear cuenta en Lemonway
    console.log("[v0] [CreateAccount] Enviando a Lemonway...")
    const config = await LemonwayClient.getConfig()
    if (!config) {
      return NextResponse.json({ error: "Configuración de Lemonway no disponible" }, { status: 500 })
    }

    const client = new LemonwayClient(config)
    const bearerToken = await client.getBearerToken()

    // Llamar endpoint: POST /accounts/create-onboarding-session
    const lemonwayResponse = await fetch(`${client.getApiBaseUrl()}/accounts/create-onboarding-session`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(lemonwayPayload),
    })

    const lemonwayData = await lemonwayResponse.json()

    if (!lemonwayResponse.ok) {
      console.error("[v0] [CreateAccount] Lemonway error:", lemonwayData)

      await sql`
        UPDATE investors.lemonway_account_requests
        SET 
          status = 'INVALID',
          validation_status = 'INVALID',
          lemonway_error_message = ${lemonwayData.error?.message || JSON.stringify(lemonwayData)},
          last_error_at = NOW(),
          retry_count = retry_count + 1
        WHERE id = ${requestId}
      `

      return NextResponse.json(
        {
          success: false,
          status: "INVALID",
          lemonway_error: lemonwayData.error?.message || "Error al crear cuenta en Lemonway",
          message: "Fallo en creación de cuenta",
        },
        { status: 400 },
      )
    }

    // PASO 7: Sincronizar respuesta de Lemonway a BD local
    console.log("[v0] [CreateAccount] Sincronizando con BD local...")
    const walletId = lemonwayData.walletId
    const resumptionUrl = lemonwayData.resumptionUrl

    // Actualizar solicitud con datos de Lemonway
    await sql`
      UPDATE investors.lemonway_account_requests
      SET 
        status = 'SUBMITTED',
        validation_status = 'VALID',
        lemonway_wallet_id = ${walletId},
        lemonway_resumption_url = ${resumptionUrl},
        submitted_at = NOW(),
        kyc_1_completed_at = NOW(),
        retry_count = 0,
        lemonway_error_message = NULL
      WHERE id = ${requestId}
    `

    // PASO 8: Crear payment_account sincronizado
    console.log("[v0] [CreateAccount] Creando payment_account...")
    const paymentAccountResult = await sql`
      INSERT INTO payments.payment_accounts (
        user_id,
        account_type,
        status,
        lemonway_wallet_id,
        account_number,
        created_at,
        updated_at
      ) VALUES (
        ${userId},
        'LEMONWAY',
        'KYC-1 Completo',
        ${walletId},
        ${walletId},
        NOW(),
        NOW()
      )
      RETURNING id
    `

    const paymentAccountId = paymentAccountResult[0].id

    // Actualizar solicitud con payment_account_id
    await sql`
      UPDATE investors.lemonway_account_requests
      SET payment_account_id = ${paymentAccountId}
      WHERE id = ${requestId}
    `

    // PASO 9: Disparar workflow "lemonway_account_created"
    console.log("[v0] [CreateAccount] Disparando workflow...")
    try {
      // TODO: Integrar con workflow engine cuando esté disponible
      // await workflowEngine.trigger('lemonway_account_created', {
      //   requestId,
      //   walletId,
      //   userId,
      //   email: draft.email
      // })
    } catch (error) {
      console.error("[v0] [CreateAccount] Error disparando workflow:", error)
      // No fallar completamente si workflow falla
    }

    return NextResponse.json(
      {
        success: true,
        status: "SUBMITTED",
        requestId,
        walletId,
        paymentAccountId,
        resumptionUrl,
        message: "Cuenta creada exitosamente en Lemonway",
        nextStep: "Completa la verificación de identidad (KYC) en el siguiente enlace",
        kyc_link: resumptionUrl,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("[v0] Create account error:", error)
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 })
  }
}
