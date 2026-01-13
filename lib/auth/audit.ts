/**
 * Audit Logging - Sistema de auditoría de accesos
 *
 * Registra todos los intentos de acceso (permitidos y denegados)
 * para monitoreo de seguridad y cumplimiento.
 */

import { sql } from "@/lib/db"
import type { AccessLogEntry } from "./types"
import { headers } from "next/headers"

/**
 * Registra un intento de acceso en la tabla AccessLog
 */
export async function logAccess(entry: AccessLogEntry): Promise<void> {
  try {
    await sql`
      INSERT INTO "AccessLog" (
        "userId",
        "userEmail",
        "userRole",
        resource,
        action,
        allowed,
        "deniedReason",
        "ipAddress",
        "userAgent",
        "requestPath",
        "requestMethod",
        metadata
      ) VALUES (
        ${entry.userId ?? null},
        ${entry.userEmail ?? null},
        ${entry.userRole ?? null},
        ${entry.resource},
        ${entry.action},
        ${entry.allowed},
        ${entry.deniedReason ?? null},
        ${entry.ipAddress ?? null},
        ${entry.userAgent ?? null},
        ${entry.requestPath ?? null},
        ${entry.requestMethod ?? null},
        ${entry.metadata ? JSON.stringify(entry.metadata) : null}
      )
    `
  } catch (error) {
    // No fallar si el logging falla, solo registrar en consola
    console.error("Error logging access:", error)
  }
}

/**
 * Registra un acceso permitido
 */
export async function logAllowedAccess(
  userId: string,
  userEmail: string,
  userRole: string,
  resource: string,
  action: string,
  request?: Request,
): Promise<void> {
  const headersList = await headers()

  await logAccess({
    userId,
    userEmail,
    userRole,
    resource,
    action,
    allowed: true,
    ipAddress: headersList.get("x-forwarded-for") ?? headersList.get("x-real-ip") ?? undefined,
    userAgent: headersList.get("user-agent") ?? undefined,
    requestPath: request?.url,
    requestMethod: request?.method,
  })
}

/**
 * Registra un acceso denegado
 */
export async function logDeniedAccess(
  resource: string,
  action: string,
  reason: string,
  userId?: string,
  userEmail?: string,
  userRole?: string,
  request?: Request,
): Promise<void> {
  const headersList = await headers()

  await logAccess({
    userId,
    userEmail,
    userRole,
    resource,
    action,
    allowed: false,
    deniedReason: reason,
    ipAddress: headersList.get("x-forwarded-for") ?? headersList.get("x-real-ip") ?? undefined,
    userAgent: headersList.get("user-agent") ?? undefined,
    requestPath: request?.url,
    requestMethod: request?.method,
  })
}

/**
 * Obtiene el historial de accesos para un usuario
 */
export async function getAccessHistory(userId: string, limit = 100): Promise<AccessLogEntry[]> {
  const result = await sql`
    SELECT * FROM "AccessLog"
    WHERE "userId" = ${userId}
    ORDER BY "createdAt" DESC
    LIMIT ${limit}
  `
  return result as AccessLogEntry[]
}

/**
 * Obtiene los accesos denegados recientes
 */
export async function getDeniedAccesses(limit = 100): Promise<AccessLogEntry[]> {
  const result = await sql`
    SELECT * FROM "AccessLog"
    WHERE allowed = false
    ORDER BY "createdAt" DESC
    LIMIT ${limit}
  `
  return result as AccessLogEntry[]
}

/**
 * Obtiene estadísticas de accesos
 */
export async function getAccessStats(
  since: Date = new Date(Date.now() - 24 * 60 * 60 * 1000), // Últimas 24h por defecto
): Promise<{
  total: number
  allowed: number
  denied: number
  byResource: Record<string, number>
}> {
  const stats = await sql`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN allowed THEN 1 ELSE 0 END) as allowed,
      SUM(CASE WHEN NOT allowed THEN 1 ELSE 0 END) as denied
    FROM "AccessLog"
    WHERE "createdAt" >= ${since.toISOString()}
  `

  const byResource = await sql`
    SELECT resource, COUNT(*) as count
    FROM "AccessLog"
    WHERE "createdAt" >= ${since.toISOString()}
    GROUP BY resource
    ORDER BY count DESC
  `

  const resourceMap: Record<string, number> = {}
  for (const row of byResource) {
    resourceMap[row.resource] = Number(row.count)
  }

  return {
    total: Number(stats[0]?.total ?? 0),
    allowed: Number(stats[0]?.allowed ?? 0),
    denied: Number(stats[0]?.denied ?? 0),
    byResource: resourceMap,
  }
}
