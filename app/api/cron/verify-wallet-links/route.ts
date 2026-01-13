import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { startCronExecution, endCronExecution } from "@/lib/cron-logger"

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const executionId = await startCronExecution("verify-wallet-links")

  try {
    const issues: any[] = []

    // 1. Verificar wallets status=6 sin cuenta virtual
    const walletsWithoutVA = await sql`
      SELECT pa.id, pa.account_id, pa.internal_id, pa.email
      FROM payments.payment_accounts pa
      WHERE pa.status = '6'
      AND pa.cuenta_virtual_id IS NULL
    `

    for (const wallet of walletsWithoutVA) {
      // Crear tarea para vincular
      await sql`
        INSERT INTO tasks.tasks (
          tipo, prioridad, estado, titulo, descripcion, contexto,
          payment_account_id, fecha_vencimiento, creada_por
        )
        VALUES (
          'VINCULACION_PENDIENTE',
          'MEDIA',
          'PENDIENTE',
          ${`Vincular wallet ${wallet.account_id}`},
          ${`El wallet ${wallet.account_id} (status=6) no tiene cuenta virtual asociada`},
          ${JSON.stringify({ wallet_id: wallet.id, account_id: wallet.account_id })},
          ${wallet.id},
          NOW() + INTERVAL '3 days',
          'SISTEMA'
        )
        ON CONFLICT (payment_account_id, tipo, estado) 
        WHERE estado IN ('PENDIENTE', 'EN_PROGRESO')
        DO NOTHING
      `

      issues.push({
        type: "VINCULACION_PENDIENTE",
        wallet_id: wallet.id,
        account_id: wallet.account_id,
      })
    }

    // 2. Verificar integridad de vinculaciones existentes
    const linkedAccounts = await sql`
      SELECT 
        cv.id as cuenta_virtual_id,
        cv.lemonway_account_id,
        cv.lemonway_internal_id,
        cv.vinculacion_bloqueada,
        pa.id as payment_account_id,
        pa.account_id,
        pa.internal_id,
        pa.status
      FROM virtual_accounts.cuentas_virtuales cv
      INNER JOIN payments.payment_accounts pa ON pa.cuenta_virtual_id = cv.id
      WHERE cv.lemonway_account_id IS NOT NULL
    `

    for (const link of linkedAccounts) {
      // Verificar si los datos coinciden
      if (link.lemonway_account_id !== link.account_id || link.lemonway_internal_id !== link.internal_id) {
        // Vinculación rota - bloquear cuenta y crear tarea CRITICA
        await sql`
          UPDATE virtual_accounts.cuentas_virtuales
          SET vinculacion_bloqueada = true, updated_at = NOW()
          WHERE id = ${link.cuenta_virtual_id}
        `

        await sql`
          INSERT INTO tasks.tasks (
            tipo, prioridad, estado, titulo, descripcion, contexto,
            cuenta_virtual_id, payment_account_id, fecha_vencimiento, creada_por
          )
          VALUES (
            'VINCULACION_ROTA',
            'CRITICA',
            'PENDIENTE',
            ${`CRÍTICO: Vinculación rota - Cuenta ${link.lemonway_account_id}`},
            ${`Los datos de vinculación no coinciden entre cuenta virtual y wallet`},
            ${JSON.stringify({
              cuenta_virtual_id: link.cuenta_virtual_id,
              expected: { account_id: link.lemonway_account_id, internal_id: link.lemonway_internal_id },
              actual: { account_id: link.account_id, internal_id: link.internal_id },
            })},
            ${link.cuenta_virtual_id},
            ${link.payment_account_id},
            NOW() + INTERVAL '4 hours',
            'SISTEMA'
          )
          ON CONFLICT (cuenta_virtual_id, tipo, estado)
          WHERE estado IN ('PENDIENTE', 'EN_PROGRESO')
          DO NOTHING
        `

        issues.push({
          type: "VINCULACION_ROTA",
          cuenta_virtual_id: link.cuenta_virtual_id,
          payment_account_id: link.payment_account_id,
        })
      }

      // Verificar cambio de status
      if (link.status !== "6" && !link.vinculacion_bloqueada) {
        await sql`
          UPDATE virtual_accounts.cuentas_virtuales
          SET vinculacion_bloqueada = true, updated_at = NOW()
          WHERE id = ${link.cuenta_virtual_id}
        `

        await sql`
          INSERT INTO tasks.tasks (
            tipo, prioridad, estado, titulo, descripcion, contexto,
            cuenta_virtual_id, payment_account_id, fecha_vencimiento, creada_por
          )
          VALUES (
            'CAMBIO_STATUS_WALLET',
            'ALTA',
            'PENDIENTE',
            ${`Cambio de status - Wallet ${link.account_id}`},
            ${`El wallet cambió de status=6 a status=${link.status}`},
            ${JSON.stringify({
              cuenta_virtual_id: link.cuenta_virtual_id,
              old_status: "6",
              new_status: link.status,
            })},
            ${link.cuenta_virtual_id},
            ${link.payment_account_id},
            NOW() + INTERVAL '24 hours',
            'SISTEMA'
          )
          ON CONFLICT (payment_account_id, tipo, estado)
          WHERE estado IN ('PENDIENTE', 'EN_PROGRESO')
          DO NOTHING
        `

        issues.push({
          type: "CAMBIO_STATUS_WALLET",
          cuenta_virtual_id: link.cuenta_virtual_id,
          new_status: link.status,
        })
      }
    }

    await sql`
      INSERT INTO public."LemonwayTransaction" (
        transaction_id, type, status, amount, wallet_id, 
        direction, currency, created_at, metadata
      )
      VALUES (
        ${`WALLET_LINK_VERIFY_${Date.now()}`},
        'VERIFICACION_VINCULACION',
        'completed',
        0,
        'CRON_SYSTEM',
        'INTERNAL',
        'EUR',
        NOW(),
        ${JSON.stringify({
          cron: "verify-wallet-links",
          issues_found: issues.length,
          issues: issues,
          timestamp: new Date().toISOString(),
        })}
      )
    `

    await endCronExecution(executionId, "success", {
      issues_found: issues.length,
      wallets_without_va: walletsWithoutVA.length,
      broken_links: issues.filter((i) => i.type === "VINCULACION_ROTA").length,
      status_changes: issues.filter((i) => i.type === "CAMBIO_STATUS_WALLET").length,
    })

    return NextResponse.json({
      success: true,
      issues_found: issues.length,
      details: issues,
    })
  } catch (error: any) {
    console.error("Error in verify-wallet-links cron:", error)
    await endCronExecution(executionId, "failure", { error: error.message })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
