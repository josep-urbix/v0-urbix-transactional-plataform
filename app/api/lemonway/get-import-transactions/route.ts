import { neon } from "@neondatabase/serverless"
import { LemonwayClient } from "@/lib/lemonway-client"

const sql = neon(process.env.DATABASE_URL!)

/**
 * This endpoint is called by the retry queue to fetch transactions from Lemonway
 * It gets the import run details and fetches transactions from Lemonway
 * Then it enqueues each transaction as a separate log for processing
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { importRunId, accountId, startDate, endDate } = body

    if (!importRunId || !accountId || !startDate || !endDate) {
      return Response.json(
        { error: "Missing required fields: importRunId, accountId, startDate, endDate" },
        { status: 400 },
      )
    }

    console.log(`[v0] Getting transactions for import ${importRunId}`)

    // Get Lemonway config
    const config = await LemonwayClient.getConfig()
    if (!config) {
      return Response.json({ error: "Lemonway configuration not found" }, { status: 500 })
    }

    const client = new LemonwayClient(config)

    const startTimestamp = new Date(startDate).getTime() / 1000
    const endTimestamp = new Date(endDate).getTime() / 1000

    // Get transactions from Lemonway
    console.log(`[v0] Fetching from Lemonway for account ${accountId} from ${startTimestamp} to ${endTimestamp}`)
    const response = await client.getAccountTransactions(accountId, startTimestamp, endTimestamp)

    if (!response || typeof response !== "object") {
      console.error(`[v0] Invalid response from Lemonway: ${JSON.stringify(response)}`)
      return Response.json({ error: "Invalid response from Lemonway API" }, { status: 500 })
    }

    const transactions = response.transactions?.value || response.transactions || []
    console.log(`[v0] Got ${transactions.length} transactions from Lemonway for account ${accountId}`)

    let enqueuedCount = 0

    // Enqueue each transaction
    for (const transaction of transactions) {
      try {
        const transactionId = transaction.transactionIn?.id || transaction.id
        if (!transactionId) {
          console.warn(`[v0] Skipping transaction without ID`)
          continue
        }

        await sql`
          INSERT INTO "LemonwayApiCallLog" (
            endpoint,
            method,
            request_payload,
            success,
            created_at
          ) VALUES (
            '/import-transactions',
            'POST',
            ${JSON.stringify({
              importRunId,
              accountId,
              transaction,
            })},
            false,
            NOW()
          )
        `

        enqueuedCount++
        console.log(`[v0] Enqueued transaction ${transactionId}`)
      } catch (error: any) {
        console.error(`[v0] Error enqueueing transaction:`, error.message)
      }
    }

    console.log(`[v0] Successfully enqueued ${enqueuedCount} transactions`)

    return Response.json({
      success: true,
      totalTransactions: transactions.length,
      enqueuedTransactions: enqueuedCount,
    })
  } catch (error: any) {
    console.error(`[v0] Error in get-import-transactions endpoint:`, error)
    return Response.json(
      {
        error: "Failed to get transactions from Lemonway",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
