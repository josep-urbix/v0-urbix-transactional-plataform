import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { rateLimit } from "@/lib/rate-limiter"
import { isStrongPassword } from "@/lib/security"
import * as bcrypt from "bcryptjs"

export async function POST(request: Request) {
  try {
    const session = await getSession()

    if (!session) {
      return Response.json({ error: "No autorizado. Por favor, inicia sesión." }, { status: 401 })
    }

    const { currentPassword, newPassword, confirmPassword } = await request.json()

    const rateLimitResult = rateLimit(`change-password:${session.user.id}`, {
      maxRequests: 5,
      windowMs: 15 * 60 * 1000, // 15 minutes
    })

    if (!rateLimitResult.allowed) {
      return Response.json({ error: "Demasiados intentos. Por favor, intenta más tarde." }, { status: 429 })
    }

    // Validate input
    if (!currentPassword || !newPassword || !confirmPassword) {
      return Response.json({ error: "Todos los campos son requeridos" }, { status: 400 })
    }

    if (newPassword !== confirmPassword) {
      return Response.json({ error: "Las contraseñas nuevas no coinciden" }, { status: 400 })
    }

    const passwordValidation = isStrongPassword(newPassword)
    if (!passwordValidation.valid) {
      return Response.json({ error: passwordValidation.message }, { status: 400 })
    }

    // Get user's current password hash
    const users = await sql`
      SELECT id, "passwordHash"
      FROM "User"
      WHERE id = ${session.user.id}
    `

    if (users.length === 0) {
      return Response.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    const user = users[0]

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash)

    if (!isCurrentPasswordValid) {
      return Response.json({ error: "La contraseña actual es incorrecta" }, { status: 401 })
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10)

    // Update password
    await sql`
      UPDATE "User"
      SET "passwordHash" = ${newPasswordHash}
      WHERE id = ${session.user.id}
    `

    // Log audit
    await sql`
      INSERT INTO "UserAuditLog" ("userId", action, "changedBy", changes)
      VALUES (${session.user.id}, 'PASSWORD_CHANGED', ${session.user.id}, ${JSON.stringify({ timestamp: new Date().toISOString() })})
    `

    return Response.json({ success: true, message: "Contraseña actualizada exitosamente" })
  } catch (error: any) {
    console.error("[API] Change password error:", error)
    return Response.json(
      {
        error: error.message || "Error interno del servidor",
      },
      { status: 500 },
    )
  }
}
