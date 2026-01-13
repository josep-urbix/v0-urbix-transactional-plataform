import { getServerSession } from "next-auth/next"
import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { requestId } = await request.json()

    if (!requestId) {
      return NextResponse.json({ error: "Missing requestId" }, { status: 400 })
    }

    await sql`
      UPDATE investors.lemonway_account_requests
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE id = ${requestId} AND created_by = ${session.user.id}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Delete account error:", error)
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 })
  }
}
