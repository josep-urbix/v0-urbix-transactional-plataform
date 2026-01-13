import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const accounts = await sql`
      SELECT * FROM payments.payment_accounts 
      ORDER BY created_at DESC
    `

    return NextResponse.json({
      success: true,
      count: accounts.length,
      accounts: accounts,
    })
  } catch (error: any) {
    console.error("Error listing accounts:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
      },
      { status: 500 },
    )
  }
}
