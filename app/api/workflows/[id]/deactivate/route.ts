// =====================================================
// WORKFLOW DEACTIVATE API
// =====================================================

import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    await sql`
      UPDATE workflows."Workflow"
      SET status = 'INACTIVE', updated_at = NOW()
      WHERE id = ${id}
    `

    return NextResponse.json({ success: true, status: "INACTIVE" })
  } catch (error) {
    console.error("Error deactivating workflow:", error)
    return NextResponse.json({ error: "Error deactivating workflow" }, { status: 500 })
  }
}
