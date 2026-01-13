import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params

    const result = await sql`
      SELECT * FROM "Transaction"
      WHERE id = ${id}
      LIMIT 1
    `

    const transaction = result[0]

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }

    return NextResponse.json(transaction)
  } catch (error) {
    console.error("[Transaction Detail API] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
