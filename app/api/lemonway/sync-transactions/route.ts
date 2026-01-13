import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth"
import { LemonwayClient } from "@/lib/lemonway-client"

export async function POST(request: NextRequest) {
  try {
    await requireAuth()

    const body = await request.json()
    const { walletId, startDate, endDate } = body

    // Get Lemonway config
    const config = await LemonwayClient.getConfig()
    if (!config) {
      return NextResponse.json({ error: "Lemonway no está configurado" }, { status: 400 })
    }

    const client = new LemonwayClient(config)

    // Get transactions from Lemonway
    const response = await client.getTransactions(walletId, startDate, endDate)

    let transactions = []

    if (response.transactions && Array.isArray(response.transactions)) {
      transactions = response.transactions
    } else if (response.data && Array.isArray(response.data)) {
      transactions = response.data
    } else if (response.TRANS && Array.isArray(response.TRANS)) {
      transactions = response.TRANS
    } else if (response.operations && Array.isArray(response.operations)) {
      transactions = response.operations
    } else if (Array.isArray(response)) {
      transactions = response
    }

    if (transactions.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        message: "No se encontraron nuevas transacciones",
        responseStructure: Object.keys(response),
        fullResponse: response,
      })
    }

    let synced = 0
    let errors = 0

    // Save transactions to database
    for (const transaction of transactions) {
      try {
        const transactionId = transaction.id || transaction.ID || transaction.TRANS_ID || transaction.transactionId
        const amount = Number.parseFloat(
          transaction.amount || transaction.AMT || transaction.CRED || transaction.DEB || 0,
        )
        const walletIdFromTrans = transaction.walletId || transaction.WALLET || transaction.INT_WALLET || walletId

        if (!transactionId) {
          errors++
          continue
        }

        await sql`
          INSERT INTO "LemonwayTransaction" (
            "transaction_id",
            "wallet_id",
            "type",
            "amount",
            "currency",
            "status",
            "direction",
            "debit_wallet",
            "credit_wallet",
            "comment",
            "metadata",
            "created_at"
          ) VALUES (
            ${transactionId},
            ${walletIdFromTrans},
            ${transaction.type || transaction.TYPE || "unknown"},
            ${amount},
            ${transaction.currency || transaction.CUR || "EUR"},
            ${transaction.status || transaction.STATUS || "completed"},
            ${transaction.direction || (amount > 0 ? "incoming" : "outgoing")},
            ${transaction.debitWallet || transaction.DEB},
            ${transaction.creditWallet || transaction.CRED_WALLET || transaction.CRED},
            ${transaction.comment || transaction.COM},
            ${JSON.stringify(transaction)},
            ${transaction.date || transaction.DATE || transaction.createdAt || new Date().toISOString()}
          )
          ON CONFLICT ("transaction_id") DO UPDATE SET
            "status" = EXCLUDED."status",
            "metadata" = EXCLUDED."metadata",
            "updated_at" = NOW()
        `

        synced++
      } catch (error: any) {
        console.error("Lemonway Sync Transactions Error:", error)
        errors++
      }
    }

    return NextResponse.json({
      success: true,
      synced,
      errors,
      total: transactions.length,
      message: `Sincronizadas ${synced} transacciones correctamente${errors > 0 ? ` (${errors} errores)` : ""}`,
    })
  } catch (error: any) {
    console.error("Lemonway Sync Transactions Error:", error)
    return NextResponse.json({ error: error.message || "Error al sincronizar transacciones" }, { status: 500 })
  }
}
