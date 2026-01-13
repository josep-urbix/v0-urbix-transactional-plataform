import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    await sql`
      UPDATE investors."Session"
      SET is_active = false
      WHERE id = ${id}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error revoking session:", error)
    return NextResponse.json({ error: "Error al revocar sesión" }, { status: 500 })
  }
}
