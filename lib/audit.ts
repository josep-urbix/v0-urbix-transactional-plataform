/**
 * Audit Logging - Sistema general de auditoría de acciones
 *
 * Registra acciones importantes del sistema para trazabilidad
 * y cumplimiento normativo.
 */

import { sql } from "@/lib/db"

export interface AuditLogEntry {
  userId: string
  action: string
  resource: string
  resourceId?: string
  details?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

/**
 * Registra una acción de auditoría en UserAuditLog
 */
export async function auditLog(entry: AuditLogEntry): Promise<void> {
  try {
    await sql`
      INSERT INTO "UserAuditLog" (
        "userId",
        "action",
        "changedBy",
        "changes",
        "ipAddress"
      ) VALUES (
        ${entry.resourceId ?? entry.userId},
        ${entry.action},
        ${entry.userId},
        ${entry.details ? JSON.stringify(entry.details) : null},
        ${entry.ipAddress ?? null}
      )
    `
  } catch (error) {
    // No fallar si el logging falla, solo registrar en consola
    console.error("Error logging audit:", error)
  }
}

/**
 * Alias para auditLog - Registra una acción de auditoría con información de la request
 */
export async function logAuditAction(
  userId: string,
  action: string,
  resource: string,
  resourceId: string | null,
  request: Request,
  details?: Record<string, any>,
): Promise<void> {
  const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined
  const userAgent = request.headers.get("user-agent") || undefined

  await auditLog({
    userId,
    action,
    resource,
    resourceId: resourceId ?? undefined,
    details,
    ipAddress,
    userAgent,
  })
}
