import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

// POST /api/payment-accounts/test-insert
export async function POST(request: Request) {
  try {
    await requireAuth()

    const body = await request.json()
    const { accountId = "TEST-" + Date.now() } = body

    console.log("Testing direct insert to payment_accounts")

    // Insert test record
    const result = await sql`
      INSERT INTO payments.payment_accounts (
        account_id, email, first_name, last_name, status, account_type, 
        balance, currency, kyc_status, kyc_level
      ) VALUES (
        ${accountId},
        'test@example.com',
        'Test',
        'User',
        'active',
        'personal',
        100.00,
        'EUR',
        'pending',
        0
      )
      RETURNING *
    `

    console.log("Insert result:", result)

    // Verify insert
    const verify = await sql`
      SELECT * FROM payments.payment_accounts WHERE account_id = ${accountId}
    `

    console.log("Verification query result:", verify)

    return NextResponse.json({
      success: true,
      inserted: result[0],
      verified: verify[0],
    })
  } catch (error: any) {
    console.error("Error in test-insert:", error)
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 })
  }
}
