import { sql } from "@/lib/db"
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { validateSession } from "@/lib/investor-auth/session"

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.replace("Bearer ", "")

    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const session = await validateSession(token)
    if (!session) {
      return NextResponse.json({ error: "Sesión inválida" }, { status: 401 })
    }

    const { new_password, unlink_provider } = await request.json()

    if (!new_password || new_password.length < 8) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 })
    }

    // Hash the new password
    const password_hash = await bcrypt.hash(new_password, 12)

    // Update user: set password and optionally unlink OAuth provider
    let updateQuery = `
      UPDATE investors."User"
      SET 
        password_hash = $1,
        updated_at = NOW()
    `
    const params: (string | null)[] = [password_hash]

    if (unlink_provider === "google") {
      updateQuery += `, google_id = NULL`
    } else if (unlink_provider === "apple") {
      updateQuery += `, apple_id = NULL`
    }

    updateQuery += ` WHERE id = $2 RETURNING id, email, first_name, last_name`
    params.push(session.user_id)

    const result = await sql(updateQuery, params)

    if (result.length === 0) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Log the activity
    try {
      await sql`
        INSERT INTO investors."ActivityLog" (id, user_id, action, details, ip_address, created_at)
        VALUES (
          gen_random_uuid(),
          ${session.user_id},
          'auth_method_changed',
          ${JSON.stringify({
            from: unlink_provider,
            to: "password",
            unlinked_provider: unlink_provider,
          })}::jsonb,
          ${request.headers.get("x-forwarded-for") || "unknown"},
          NOW()
        )
      `
    } catch {
      // Don't fail if activity log fails
    }

    return NextResponse.json({
      success: true,
      message: `Cuenta actualizada. Ahora puedes iniciar sesión con tu email y contraseña.`,
    })
  } catch (error) {
    console.error("Error switching to password:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
