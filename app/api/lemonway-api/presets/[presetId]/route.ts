import { NextResponse } from "next/server"
import { getSession, hasPermission } from "@/lib/auth"
import { sql } from "@/lib/db"

// DELETE /api/lemonway-api/presets/[presetId] - Delete preset
export async function DELETE(request: Request, { params }: { params: { presetId: string } }) {
  try {
    const session = await getSession()
    if (!session || !hasPermission(session.user, "lemonway_api", "manage_presets")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { presetId } = params

    // Verify ownership
    const checkResult = await sql`
      SELECT user_id FROM lemonway_api_presets
      WHERE id = ${presetId}
    `

    if (checkResult.length === 0) {
      return NextResponse.json({ error: "Preset not found" }, { status: 404 })
    }

    if (checkResult[0].user_id !== session.user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 })
    }

    await sql`
      DELETE FROM lemonway_api_presets
      WHERE id = ${presetId}
    `

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting preset:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
