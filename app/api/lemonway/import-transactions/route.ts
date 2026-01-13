import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const { importRunId, accountId, transaction } = body

    if (!importRunId || !transaction) {
      return Response.json({ error: "Missing required fields: importRunId, transaction" }, { status: 400 })
    }

    console.log("[v0] Processing transaction for import:", importRunId, "transaction:", transaction.id)

    const cuentaVirtualId =
      accountId ||
      (typeof transaction.accountId === "string" ? Number.parseInt(transaction.accountId) : transaction.accountId)

    // Guardar la transacción en movimientos_cuenta
    const result = await sql`
      INSERT INTO lemonway_temp.movimientos_cuenta (
        import_run_id,
        cuenta_virtual_id,
        lemonway_transaction_id,
        tipo,
        monto,
        fecha,
        estado,
        detalles,
        raw_data,
        created_at,
        updated_at
      )
      VALUES (
        ${importRunId},
        ${cuentaVirtualId},
        ${transaction.id || transaction.transactionIn?.id},
        ${transaction.type || "TRANSACTION"},
        ${transaction.creditAmount || 0},
        ${transaction.date ? new Date(transaction.date * 1000).toISOString() : new Date().toISOString()},
        'procesada',
        ${JSON.stringify(transaction)},
        ${JSON.stringify(transaction)},
        NOW(),
        NOW()
      )
      ON CONFLICT (lemonway_transaction_id) DO NOTHING
      RETURNING id;
    `

    console.log("[v0] Transaction saved successfully:", result[0]?.id)

    return Response.json({
      success: true,
      message: "Transaction saved successfully",
      id: result[0]?.id,
    })
  } catch (error) {
    console.error("[v0] Error in import-transactions endpoint:", error)
    return Response.json(
      {
        error: "Failed to process transaction",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
