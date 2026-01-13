import { sql } from "@/lib/db"
import { validatePasswordResetToken, markTokenAsUsed } from "@/lib/password-reset"
import { rateLimit } from "@/lib/rate-limiter"
import { isStrongPassword } from "@/lib/security"
import * as bcrypt from "bcryptjs"

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return Response.json({ error: "Token y contraseña son requeridos" }, { status: 400 })
    }

    const rateLimitResult = rateLimit(`reset-password:${token}`, {
      maxRequests: 5,
      windowMs: 15 * 60 * 1000, // 15 minutes
    })

    if (!rateLimitResult.allowed) {
      return Response.json({ error: "Demasiados intentos. Por favor, intenta más tarde." }, { status: 429 })
    }

    const passwordValidation = isStrongPassword(password)
    if (!passwordValidation.valid) {
      return Response.json({ error: passwordValidation.message }, { status: 400 })
    }

    // Validate token
    const validation = await validatePasswordResetToken(token)

    if (!validation.valid || !validation.userId) {
      return Response.json({ error: "Token inválido o expirado" }, { status: 400 })
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 10)

    // Update user password
    await sql`
      UPDATE "User"
      SET "passwordHash" = ${passwordHash}
      WHERE id = ${validation.userId}
    `

    // Mark token as used
    await markTokenAsUsed(token)

    // Log audit
    await sql`
      INSERT INTO "UserAuditLog" ("userId", action, "changedBy", changes)
      VALUES (${validation.userId}, 'PASSWORD_RESET', ${validation.userId}, ${JSON.stringify({ timestamp: new Date().toISOString(), method: "reset_token" })})
    `

    return Response.json({
      success: true,
      message: "Contraseña restablecida exitosamente",
    })
  } catch (error) {
    return Response.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
