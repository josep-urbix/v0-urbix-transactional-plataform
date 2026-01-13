import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

// POST /api/lemonway/test-transaction-insert
export async function POST(request: Request) {
  try {
    await requireAuth()

    const body = await request.json()
    const { transactionId = "TEST-TRANS-" + Date.now() } = body

    console.log("[v0] Testing direct insert to LemonwayTransaction")

    // Insert test transaction
    const result = await sql`
      INSERT INTO "LemonwayTransaction" (
        transaction_id, wallet_id, type, amount, currency, status, direction
      ) VALUES (
        ${transactionId},
        'TEST_WALLET',
        'payment',
        50.00,
        'EUR',
        'completed',
        'incoming'
      )
      RETURNING *
    `

    console.log("[v0] Insert result:", result)

    // Verify insert
    const verify = await sql`
      SELECT * FROM "LemonwayTransaction" WHERE transaction_id = ${transactionId}
    `

    console.log("[v0] Verification query result:", verify)

    return NextResponse.json({
      success: true,
      inserted: result[0],
      verified: verify[0],
    })
  } catch (error: any) {
    console.error("Error in test-transaction-insert:", error)
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 })
  }
}
