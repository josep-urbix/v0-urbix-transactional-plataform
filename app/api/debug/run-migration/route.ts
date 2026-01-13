import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    await sql`
      ALTER TABLE payments.payment_accounts 
      ALTER COLUMN country TYPE VARCHAR(3)
    `

    return NextResponse.json({
      success: true,
      message: "✅ Migración ejecutada correctamente - columna country ahora es VARCHAR(3)",
    })
  } catch (error: any) {
    console.error("Migration error:", error)
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
