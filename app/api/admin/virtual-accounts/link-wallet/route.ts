import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { logSqlQuery } from "@/lib/sql-logger"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { paymentAccountId, cuentaVirtualId } = body

    if (!paymentAccountId) {
      return NextResponse.json({ error: "paymentAccountId requerido" }, { status: 400 })
    }

    // Obtener datos del payment account
    const paymentAccount = await sql`
      SELECT id, account_id, internal_id, email, status, balance
      FROM payments.payment_accounts
      WHERE id = ${paymentAccountId}
    `

    if (paymentAccount.length === 0) {
      return NextResponse.json({ error: "Wallet no encontrado" }, { status: 404 })
    }

    const wallet = paymentAccount[0]

    // Verificar que el wallet esté en status 6
    if (wallet.status !== "6") {
      return NextResponse.json(
        {
          error: "El wallet debe estar en status 6 (Activo) para vincularse",
        },
        { status: 400 },
      )
    }

    let cuentaVirtual

    if (cuentaVirtualId) {
      // Vincular con cuenta virtual existente
      const existing = await sql`
        SELECT id FROM virtual_accounts.cuentas_virtuales
        WHERE id = ${cuentaVirtualId}
      `

      if (existing.length === 0) {
        return NextResponse.json({ error: "Cuenta virtual no encontrada" }, { status: 404 })
      }

      // Actualizar cuenta virtual con datos del wallet
      await sql`
        UPDATE virtual_accounts.cuentas_virtuales
        SET 
          lemonway_account_id = ${wallet.account_id},
          lemonway_internal_id = ${wallet.internal_id},
          email = ${wallet.email},
          vinculacion_timestamp = NOW(),
          vinculacion_bloqueada = false
        WHERE id = ${cuentaVirtualId}
      `

      cuentaVirtual = { id: cuentaVirtualId }
    } else {
      // Crear nueva cuenta virtual
      const newCuenta = await sql`
        INSERT INTO virtual_accounts.cuentas_virtuales (
          nombre,
          descripcion,
          tipo_moneda,
          saldo_disponible,
          saldo_bloqueado,
          estado,
          referencia_externa_tipo,
          referencia_externa_id,
          lemonway_account_id,
          lemonway_internal_id,
          email,
          vinculacion_timestamp,
          vinculacion_bloqueada
        ) VALUES (
          ${`Cuenta Virtual - ${wallet.account_id}`},
          ${`Vinculada automáticamente desde wallet ${wallet.account_id}`},
          'EUR',
          0,
          0,
          'ACTIVA',
          'lemonway_wallet',
          ${wallet.account_id},
          ${wallet.account_id},
          ${wallet.internal_id},
          ${wallet.email},
          NOW(),
          false
        )
        RETURNING id
      `

      cuentaVirtual = newCuenta[0]
    }

    // Actualizar payment_account con referencia a cuenta virtual
    await sql`
      UPDATE payments.payment_accounts
      SET cuenta_virtual_id = ${cuentaVirtual.id}
      WHERE id = ${paymentAccountId}
    `

    // Registrar en LemonwayTransaction
    await sql`
      INSERT INTO lemonway_transactions (
        tipo_transaccion,
        metodo,
        url,
        payload,
        respuesta,
        estado,
        notas
      ) VALUES (
        'VINCULACION_WALLET',
        'POST',
        '/api/admin/virtual-accounts/link-wallet',
        ${JSON.stringify({ paymentAccountId, cuentaVirtualId: cuentaVirtual.id })},
        ${JSON.stringify({ success: true, wallet: wallet.account_id })},
        'SUCCESS',
        ${`Wallet ${wallet.account_id} vinculado a cuenta virtual ${cuentaVirtual.id} por ${session.user.email}`}
      )
    `

    await logSqlQuery(
      "INSERT",
      "virtual_accounts.cuentas_virtuales",
      { paymentAccountId, cuentaVirtualId: cuentaVirtual.id },
      session.user.email,
    )

    return NextResponse.json({
      success: true,
      cuentaVirtualId: cuentaVirtual.id,
      message: "Vinculación exitosa",
    })
  } catch (error: any) {
    console.error("Error vinculando wallet:", error)
    return NextResponse.json(
      {
        error: "Error al vincular wallet",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
