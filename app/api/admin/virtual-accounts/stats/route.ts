import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const schemaCheck = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.schemata 
        WHERE schema_name = 'virtual_accounts'
      ) as exists
    `

    if (!schemaCheck[0]?.exists) {
      return NextResponse.json({
        accounts: { total: 0, active: 0, inactive: 0, total_balance: 0 },
        movements24h: {
          total: 0,
          credits: 0,
          debits: 0,
          total_credits_amount: 0,
          total_debits_amount: 0,
        },
        movements30d: { total: 0, total_credits: 0, total_debits: 0 },
        operationTypes: { total_types: 0, used_types: 0, credit_types: 0, debit_types: 0 },
        topOperations: [],
        topAccounts: [],
        recentMovements: [],
        alerts: { negative_balance: 0, inactive_with_balance: 0, stale_accounts: 0 },
        lemonwaySync: { successful: 0, failed: 0, pending: 0, last_sync: null },
        balanceTrend: [],
        timestamp: new Date().toISOString(),
      })
    }

    const now = new Date()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const accountsStats = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE estado = 'ACTIVA') as active,
        COUNT(*) FILTER (WHERE estado != 'ACTIVA') as inactive,
        COALESCE(SUM(saldo_disponible + saldo_bloqueado), 0) as total_balance
      FROM virtual_accounts.cuentas_virtuales
    `

    const movements24h = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE importe > 0) as credits,
        COUNT(*) FILTER (WHERE importe < 0) as debits,
        COALESCE(SUM(importe) FILTER (WHERE importe > 0), 0) as total_credits_amount,
        COALESCE(ABS(SUM(importe) FILTER (WHERE importe < 0)), 0) as total_debits_amount
      FROM virtual_accounts.movimientos_cuenta
      WHERE fecha >= ${last24h.toISOString()}
    `

    const movements30d = await sql`
      SELECT 
        COUNT(*) as total,
        COALESCE(SUM(importe) FILTER (WHERE importe > 0), 0) as total_credits,
        COALESCE(ABS(SUM(importe) FILTER (WHERE importe < 0)), 0) as total_debits
      FROM virtual_accounts.movimientos_cuenta
      WHERE fecha >= ${last30d.toISOString()}
    `

    const operationTypes = await sql`
      SELECT 
        COUNT(*) as total_types,
        COUNT(DISTINCT m.tipo_operacion_id) FILTER (WHERE m.fecha >= ${last24h.toISOString()}) as used_types,
        COUNT(*) FILTER (WHERE toc.signo_saldo_disponible = '+') as credit_types,
        COUNT(*) FILTER (WHERE toc.signo_saldo_disponible = '-') as debit_types
      FROM virtual_accounts.tipos_operacion_contable toc
      LEFT JOIN virtual_accounts.movimientos_cuenta m ON m.tipo_operacion_id = toc.id
    `

    const topOperations = await sql`
      SELECT 
        toc.codigo,
        toc.descripcion,
        CASE 
          WHEN toc.signo_saldo_disponible = '+' THEN 'CREDITO'
          WHEN toc.signo_saldo_disponible = '-' THEN 'DEBITO'
          ELSE 'OTRO'
        END as tipo,
        COUNT(m.id) as count,
        COALESCE(SUM(ABS(m.importe)), 0) as total_amount
      FROM virtual_accounts.tipos_operacion_contable toc
      LEFT JOIN virtual_accounts.movimientos_cuenta m ON m.tipo_operacion_id = toc.id
        AND m.fecha >= ${last24h.toISOString()}
      WHERE toc.activo = true
      GROUP BY toc.id, toc.codigo, toc.descripcion, toc.signo_saldo_disponible
      ORDER BY count DESC
      LIMIT 5
    `

    const topAccounts = await sql`
      SELECT 
        cv.id,
        cv.lemonway_account_id as numero_cuenta,
        cv.tipo::text as nombre_cuenta,
        COALESCE(cv.saldo_disponible, 0) + COALESCE(cv.saldo_bloqueado, 0) as saldo_actual,
        COUNT(m.id) as movement_count,
        COALESCE(SUM(m.importe) FILTER (WHERE m.importe > 0), 0) as total_credits,
        COALESCE(ABS(SUM(m.importe) FILTER (WHERE m.importe < 0)), 0) as total_debits
      FROM virtual_accounts.cuentas_virtuales cv
      LEFT JOIN virtual_accounts.movimientos_cuenta m ON m.cuenta_id = cv.id
        AND m.fecha >= ${last24h.toISOString()}
      GROUP BY cv.id, cv.lemonway_account_id, cv.tipo, cv.saldo_disponible, cv.saldo_bloqueado
      ORDER BY movement_count DESC, saldo_actual DESC
      LIMIT 10
    `

    const recentMovements = await sql`
      SELECT 
        m.id,
        m.fecha as fecha_movimiento,
        CASE WHEN m.importe > 0 THEN 'CREDITO' ELSE 'DEBITO' END as tipo,
        ABS(m.importe) as importe,
        COALESCE(m.saldo_disponible_resultante, 0) + COALESCE(m.saldo_bloqueado_resultante, 0) - m.importe as saldo_anterior,
        COALESCE(m.saldo_disponible_resultante, 0) + COALESCE(m.saldo_bloqueado_resultante, 0) as saldo_nuevo,
        m.lemonway_transaction_id as referencia_lemonway,
        'SINCRONIZADO' as estado_sincronizacion,
        cv.lemonway_account_id as numero_cuenta,
        cv.tipo::text as nombre_cuenta,
        COALESCE(toc.codigo, 'N/A') as operation_code,
        COALESCE(toc.descripcion, 'Sin descripción') as operation_description
      FROM virtual_accounts.movimientos_cuenta m
      JOIN virtual_accounts.cuentas_virtuales cv ON m.cuenta_id = cv.id
      LEFT JOIN virtual_accounts.tipos_operacion_contable toc ON m.tipo_operacion_id = toc.id
      ORDER BY m.fecha DESC
      LIMIT 20
    `

    const alerts = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE COALESCE(saldo_disponible, 0) + COALESCE(saldo_bloqueado, 0) < 0) as negative_balance,
        COUNT(*) FILTER (WHERE estado != 'ACTIVA' AND COALESCE(saldo_disponible, 0) + COALESCE(saldo_bloqueado, 0) > 0) as inactive_with_balance,
        COUNT(*) FILTER (WHERE updated_at < NOW() - INTERVAL '30 days' AND COALESCE(saldo_disponible, 0) + COALESCE(saldo_bloqueado, 0) > 0) as stale_accounts
      FROM virtual_accounts.cuentas_virtuales
    `

    const balanceTrend = await sql`
      SELECT 
        DATE(fecha) as date,
        SUM(importe) as net_change
      FROM virtual_accounts.movimientos_cuenta
      WHERE fecha >= ${last30d.toISOString()}
      GROUP BY DATE(fecha)
      ORDER BY date ASC
    `

    // In the future, this should query actual sync status from relevant tables
    const lemonwaySync = {
      successful: movements24h[0].total || 0,
      failed: 0,
      pending: 0,
      last_sync: new Date().toISOString(),
    }

    return NextResponse.json({
      accounts: accountsStats[0],
      movements24h: movements24h[0],
      movements30d: movements30d[0],
      operationTypes: operationTypes[0],
      topOperations,
      topAccounts,
      recentMovements,
      alerts: alerts[0],
      lemonwaySync,
      balanceTrend,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[VirtualAccountsStats] Error:", error)
    return NextResponse.json(
      {
        error: "Error al obtener estadísticas",
        details: error instanceof Error ? error.message : "Error desconocido",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
