import { sql } from "@/lib/db"
import { generateToken, hashToken, parseUserAgent, getClientIP } from "./utils"
import { registerOrUpdateDevice } from "@/lib/device-tracking"
import type { InvestorUser, InvestorSession } from "@/lib/types/investor"

// Crear nueva sesión
export async function createSession(
  user: InvestorUser,
  request: Request,
  deviceFingerprint?: string,
  deviceName?: string,
): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
  const accessToken = generateToken(32)
  const refreshToken = generateToken(48)

  const userAgent = request.headers.get("user-agent") || ""
  const { browser, os, device_type } = parseUserAgent(userAgent)
  const ip = getClientIP(request)

  // Calcular fecha de expiración
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas

  const deviceInfo = {
    fingerprint: deviceFingerprint || null,
    name: deviceName || `${browser} on ${os}`,
    type: device_type,
    browser,
    os,
  }

  await sql`
    INSERT INTO investors."Session" (
      user_id, token, token_hash, refresh_token, refresh_token_hash, 
      expires_at, is_active, ip_address, user_agent, device_info, 
      last_activity, last_activity_at
    ) VALUES (
      ${user.id}, ${accessToken}, ${hashToken(accessToken)}, 
      ${refreshToken}, ${hashToken(refreshToken)},
      ${expiresAt.toISOString()}, TRUE, ${ip}, ${userAgent}, 
      ${JSON.stringify(deviceInfo)}, NOW(), NOW()
    )
  `

  // Actualizar último login del usuario
  await sql`
    UPDATE investors."User"
    SET last_login_at = NOW()
    WHERE id = ${user.id}
  `

  // Registrar dispositivo si hay fingerprint
  if (deviceFingerprint) {
    try {
      await registerOrUpdateDevice(user.id, deviceFingerprint, request, user.two_factor_enabled || false)
    } catch (error) {
      // No fallar la sesión si falla el registro de dispositivo
      console.error("Failed to register device:", error)
    }
  }

  return { accessToken, refreshToken, expiresAt }
}

// Validar sesión por token
export async function validateSession(accessToken: string): Promise<InvestorUser | null> {
  const tokenHash = hashToken(accessToken)

  const result = await sql`
    SELECT u.* FROM investors."User" u
    INNER JOIN investors."Session" s ON s.user_id = u.id
    WHERE s.token_hash = ${tokenHash}
      AND s.is_active = TRUE
      AND s.expires_at > NOW()
      AND u.status = 'active'
  `

  if (result.length === 0) {
    return null
  }

  // Actualizar última actividad de la sesión
  await sql`
    UPDATE investors."Session"
    SET last_activity_at = NOW(), last_activity = NOW()
    WHERE token_hash = ${tokenHash}
  `

  return result[0] as InvestorUser
}

// Refrescar sesión
export async function refreshSession(
  refreshToken: string,
  request: Request,
): Promise<{ accessToken: string; expiresAt: Date } | null> {
  const tokenHash = hashToken(refreshToken)

  const result = await sql`
    SELECT s.*, u.status as user_status FROM investors."Session" s
    INNER JOIN investors."User" u ON u.id = s.user_id
    WHERE s.refresh_token_hash = ${tokenHash}
      AND s.is_active = TRUE
      AND u.status = 'active'
  `

  if (result.length === 0) {
    return null
  }

  const session = result[0]

  // Generar nuevo access token
  const newAccessToken = generateToken(32)
  const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const ip = getClientIP(request)

  await sql`
    UPDATE investors."Session"
    SET token = ${newAccessToken},
        token_hash = ${hashToken(newAccessToken)},
        expires_at = ${newExpiresAt.toISOString()},
        last_activity_at = NOW(),
        last_activity = NOW(),
        ip_address = ${ip}
    WHERE id = ${session.id}
  `

  return { accessToken: newAccessToken, expiresAt: newExpiresAt }
}

// Revocar sesión
export async function revokeSession(accessToken: string, reason?: string): Promise<boolean> {
  const tokenHash = hashToken(accessToken)

  const result = await sql`
    UPDATE investors."Session"
    SET is_active = FALSE
    WHERE token_hash = ${tokenHash}
    RETURNING id
  `

  return result.length > 0
}

// Revocar todas las sesiones de un usuario
export async function revokeAllSessions(userId: string, exceptSessionId?: string): Promise<number> {
  if (exceptSessionId) {
    const result = await sql`
      UPDATE investors."Session"
      SET is_active = FALSE
      WHERE user_id = ${userId} AND id != ${exceptSessionId} AND is_active = TRUE
    `
    return result.length
  }

  const result = await sql`
    UPDATE investors."Session"
    SET is_active = FALSE
    WHERE user_id = ${userId} AND is_active = TRUE
  `
  return result.length
}

// Obtener sesiones activas de un usuario
export async function getUserSessions(userId: string): Promise<InvestorSession[]> {
  const result = await sql`
    SELECT * FROM investors."Session"
    WHERE user_id = ${userId} AND is_active = TRUE
    ORDER BY last_activity_at DESC
  `
  return result as InvestorSession[]
}

export async function getInvestorSession(request: Request): Promise<InvestorUser | null> {
  // Obtener token de cookies o header Authorization
  const cookieHeader = request.headers.get("cookie") || ""
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [key, ...val] = c.trim().split("=")
      return [key, val.join("=")]
    }),
  )

  const accessToken = cookies["investor_token"] || request.headers.get("authorization")?.replace("Bearer ", "")

  if (!accessToken) {
    return null
  }

  return validateSession(accessToken)
}
