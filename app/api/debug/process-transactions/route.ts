import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { logId } = await request.json()

    console.log("[v0] Debug: Procesando log ID:", logId)

    // 1. Obtener el log
    const log = await sql`
      SELECT id, endpoint, response_payload, request_payload 
      FROM "LemonwayApiCallLog" 
      WHERE id = ${logId}
    `

    if (log.length === 0) {
      return NextResponse.json({ error: "Log no encontrado" }, { status: 404 })
    }

    const logData = log[0]
    console.log("[v0] Debug: Log encontrado:", logData.id)
    console.log("[v0] Debug: Endpoint:", logData.endpoint)
    console.log("[v0] Debug: Response payload type:", typeof logData.response_payload)

    // 2. Verificar que tenga transacciones
    const responsePayload = logData.response_payload
    const transactions = responsePayload?.transactions?.value

    console.log("[v0] Debug: Transacciones encontradas:", transactions?.length || 0)

    if (!transactions || transactions.length === 0) {
      return NextResponse.json(
        {
          error: "No hay transacciones en el response_payload",
          payload: responsePayload,
        },
        { status: 400 },
      )
    }

    // 3. Obtener importRunId
    const importRunId = logData.request_payload?.importRunId
    console.log("[v0] Debug: Import run ID:", importRunId)

    if (!importRunId) {
      return NextResponse.json({ error: "No se encontró importRunId en request_payload" }, { status: 400 })
    }

    // 4. Extraer accountId del endpoint
    const accountIdMatch = logData.endpoint.match(/\/accounts\/(\d+)\//)
    const accountId = accountIdMatch?.[1]
    console.log("[v0] Debug: Account ID extraído:", accountId)

    // 5. Procesar cada transacción
    let insertadas = 0
    let duplicadas = 0
    let errores = 0

    for (const tx of transactions) {
      try {
        console.log("[v0] Debug: Procesando transacción Lemonway ID:", tx.id)

        const lemonwayTxId = String(tx.id)

        // Verificar duplicado
        const exists = await sql`
          SELECT id FROM lemonway_temp.movimientos_cuenta 
          WHERE lemonway_transaction_id = ${lemonwayTxId}
        `

        if (exists.length > 0) {
          console.log("[v0] Debug: Transacción duplicada:", lemonwayTxId)
          duplicadas++
          continue
        }

        // Determinar tipo y monto
        const isTransactionIn = "creditAmount" in tx && !("senderAccountId" in tx)
        let monto: number
        let sender: string | null = null
        let receiver: string | null = null

        if (isTransactionIn) {
          monto = tx.creditAmount / 100
          receiver = tx.receiverAccountId
        } else {
          // P2P
          sender = tx.senderAccountId
          receiver = tx.receiverAccountId

          if (tx.senderAccountId === accountId) {
            monto = -(tx.debitAmount / 100) // Egreso
          } else {
            monto = tx.creditAmount / 100 // Ingreso
          }
        }

        const commission = (tx.lemonWayCommission?.amount || tx.commissionAmount || 0) / 100
        const fechaOperacion = new Date(tx.date * 1000)

        console.log("[v0] Debug: Insertando monto:", monto, "sender:", sender, "receiver:", receiver)

        // Insertar
        await sql`
          INSERT INTO lemonway_temp.movimientos_cuenta (
            id,
            lemonway_transaction_id,
            import_run_id,
            cuenta_virtual_id,
            monto,
            commission,
            tipo_transaccion,
            tipo_operacion_id,
            status,
            descripcion,
            comentario,
            referencia_externa,
            moneda,
            sender,
            receiver,
            payment_method,
            fecha_operacion,
            procesado,
            procesado_at,
            estado_importacion,
            lemonway_raw_data,
            created_at,
            updated_at
          ) VALUES (
            gen_random_uuid(),
            ${lemonwayTxId},
            ${importRunId},
            ${receiver || sender},
            ${monto},
            ${commission},
            ${isTransactionIn ? "transactionIn" : "transactionP2P"},
            ${String(tx.method)},
            ${tx.status},
            ${tx.comment || ""},
            ${tx.comment || ""},
            ${tx.reference || ""},
            'EUR',
            ${sender},
            ${receiver},
            ${String(tx.method)},
            ${fechaOperacion},
            true,
            NOW(),
            'importado',
            ${JSON.stringify(tx)},
            NOW(),
            NOW()
          )
        `

        console.log("[v0] Debug: Transacción insertada exitosamente")
        insertadas++
      } catch (error) {
        console.error("[v0] Debug: Error procesando transacción:", error)
        errores++
      }
    }

    return NextResponse.json({
      success: true,
      logId,
      totalTransacciones: transactions.length,
      insertadas,
      duplicadas,
      errores,
    })
  } catch (error) {
    console.error("[v0] Debug: Error general:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Error desconocido",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
