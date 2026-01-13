import { sql } from "@/lib/db"
import * as crypto from "crypto"

export async function generatePasswordResetToken(email: string): Promise<string | null> {
  // Find user by email
  const users = await sql`
    SELECT id FROM "User" WHERE email = ${email} AND "isActive" = true
  `

  if (users.length === 0) {
    // Don't reveal if email exists or not for security
    return null
  }

  const userId = users[0].id

  // Generate secure random token
  const token = crypto.randomBytes(32).toString("hex")

  // Token expires in 1 hour
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

  // Invalidate any existing tokens for this user
  await sql`
    DELETE FROM "PasswordResetToken"
    WHERE "userId" = ${userId} AND "usedAt" IS NULL
  `

  // Create new token
  await sql`
    INSERT INTO "PasswordResetToken" ("userId", token, "expiresAt")
    VALUES (${userId}, ${token}, ${expiresAt})
  `

  return token
}

export async function validatePasswordResetToken(token: string): Promise<{ valid: boolean; userId?: string }> {
  const tokens = await sql`
    SELECT "userId", "expiresAt", "usedAt"
    FROM "PasswordResetToken"
    WHERE token = ${token}
  `

  if (tokens.length === 0) {
    return { valid: false }
  }

  const resetToken = tokens[0]

  // Check if already used
  if (resetToken.usedAt) {
    return { valid: false }
  }

  // Check if expired
  if (new Date() > new Date(resetToken.expiresAt)) {
    return { valid: false }
  }

  return { valid: true, userId: resetToken.userId }
}

export async function markTokenAsUsed(token: string): Promise<void> {
  await sql`
    UPDATE "PasswordResetToken"
    SET "usedAt" = NOW()
    WHERE token = ${token}
  `
}

export async function cleanupExpiredTokens(): Promise<void> {
  await sql`
    DELETE FROM "PasswordResetToken"
    WHERE "expiresAt" < NOW() OR "usedAt" IS NOT NULL
  `
}
