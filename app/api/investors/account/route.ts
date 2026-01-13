import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const token = authHeader.split(" ")[1]

    // Validate session and get user
    const sessions = await sql`
      SELECT s.user_id, u.email
      FROM investors."Session" s
      JOIN investors."User" u ON s.user_id = u.id
      WHERE s.token = ${token}
        AND s.is_active = true
        AND s.expires_at > NOW()
    `

    if (sessions.length === 0) {
      return NextResponse.json({ error: "Sesión inválida" }, { status: 401 })
    }

    const userId = sessions[0].user_id
    const userEmail = sessions[0].email

    // Soft delete: mark as deleted and anonymize data
    const deletedAt = new Date()
    const anonymizedEmail = `deleted_${userId}@deleted.local`

    await sql`
      UPDATE investors."User"
      SET 
        status = 'deleted',
        deleted_at = ${deletedAt.toISOString()},
        email = ${anonymizedEmail},
        first_name = 'Usuario',
        last_name = 'Eliminado',
        display_name = 'Usuario Eliminado',
        phone = null,
        avatar_url = null,
        google_id = null,
        apple_id = null,
        two_factor_enabled = false,
        two_factor_method = null,
        two_factor_secret = null,
        updated_at = NOW()
      WHERE id = ${userId}
    `

    // Invalidate all sessions
    await sql`
      UPDATE investors."Session"
      SET is_active = false
      WHERE user_id = ${userId}
    `

    // Log the deletion
    await sql`
      INSERT INTO investors."ActivityLog" (user_id, action, details, ip_address, created_at)
      VALUES (
        ${userId},
        'account_deleted',
        ${JSON.stringify({ original_email: userEmail, deleted_at: deletedAt.toISOString() })},
        ${request.headers.get("x-forwarded-for") || "unknown"},
        NOW()
      )
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Account Delete] Error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
