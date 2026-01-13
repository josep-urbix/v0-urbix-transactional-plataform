import { sql } from "@/lib/db"

// Tiempo máximo que una petición puede estar "bloqueada" antes de considerarse abandonada
const LOCK_TIMEOUT_MS = 60000 // 60 segundos

// Variable para cachear si la columna existe
let columnExists: boolean | null = null

export interface DeduplicationResult {
  canProceed: boolean
  reason?: string
  existingRequestId?: string
  existingLogId?: number
}

/**
 * Verifica si la columna processing_lock_at existe en la tabla
 */
async function checkColumnExists(): Promise<boolean> {
  if (columnExists !== null) return columnExists

  try {
    const result = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'LemonwayApiCallLog' 
        AND column_name = 'processing_lock_at'
    `
    columnExists = result.length > 0
    return columnExists
  } catch {
    columnExists = false
    return false
  }
}

/**
 * Verifica si se puede procesar una petición para un accountId específico
 * Evita duplicaciones verificando:
 * 1. Si hay una petición en proceso (processing_lock_at activo) - solo si la columna existe
 * 2. Si hay una petición pendiente para el mismo account
 * 3. Si hay una petición exitosa reciente (últimos 30 segundos)
 */
export async function canProcessRequest(accountId: string, endpoint: string): Promise<DeduplicationResult> {
  try {
    const hasLockColumn = await checkColumnExists()

    // 1. Verificar si hay una petición actualmente en proceso (lock activo y no expirado)
    // Solo si la columna existe
    if (hasLockColumn) {
      try {
        const inProgress = await sql`
          SELECT id, request_id, processing_lock_at
          FROM "LemonwayApiCallLog"
          WHERE endpoint = ${endpoint}
            AND request_payload::text LIKE ${`%"accountid":"${accountId}"%`}
            AND processing_lock_at IS NOT NULL
            AND processing_lock_at > NOW() - INTERVAL '60 seconds'
          ORDER BY processing_lock_at DESC
          LIMIT 1
        `

        if (inProgress.length > 0) {
          return {
            canProceed: false,
            reason: `Petición en proceso (lock activo desde ${inProgress[0].processing_lock_at})`,
            existingRequestId: inProgress[0].request_id,
            existingLogId: inProgress[0].id,
          }
        }
      } catch (e) {
        // Si falla, ignoramos el check de lock
        console.log("Error checking processing lock, skipping:", e)
      }
    }

    // 2. Verificar si hay una petición pendiente o limit_pending para el mismo account
    try {
      const pending = await sql`
        SELECT id, request_id, retry_status, next_retry_at
        FROM "LemonwayApiCallLog"
        WHERE endpoint = ${endpoint}
          AND request_payload::text LIKE ${`%"accountid":"${accountId}"%`}
          AND (retry_status = 'pending' OR retry_status = 'limit_pending')
          AND final_failure = false
        ORDER BY created_at DESC
        LIMIT 1
      `

      if (pending.length > 0) {
        return {
          canProceed: false,
          reason: `Ya existe una petición pendiente (${pending[0].retry_status}, próximo intento: ${pending[0].next_retry_at})`,
          existingRequestId: pending[0].request_id,
          existingLogId: pending[0].id,
        }
      }
    } catch (e) {
      console.log("Error checking pending requests, allowing:", e)
      // Si falla, permitir el procesamiento
    }

    // 3. Verificar si hay una petición exitosa muy reciente (últimos 30 segundos) para evitar duplicados accidentales
    try {
      const recentSuccess = await sql`
        SELECT id, request_id, created_at
        FROM "LemonwayApiCallLog"
        WHERE endpoint = ${endpoint}
          AND request_payload::text LIKE ${`%"accountid":"${accountId}"%`}
          AND success = true
          AND created_at > NOW() - INTERVAL '30 seconds'
        ORDER BY created_at DESC
        LIMIT 1
      `

      if (recentSuccess.length > 0) {
        return {
          canProceed: false,
          reason: `Petición exitosa muy reciente (hace menos de 30 segundos)`,
          existingRequestId: recentSuccess[0].request_id,
          existingLogId: recentSuccess[0].id,
        }
      }
    } catch (e) {
      console.log("Error checking recent success, allowing:", e)
      // Si falla, permitir el procesamiento
    }

    return { canProceed: true }
  } catch (error) {
    console.log("Unexpected error in canProcessRequest, allowing:", error)
    return { canProceed: true }
  }
}

/**
 * Adquiere un lock para procesar una petición
 * Retorna true si se pudo adquirir, false si no
 */
export async function acquireProcessingLock(logId: number): Promise<boolean> {
  const hasLockColumn = await checkColumnExists()
  if (!hasLockColumn) return true // Si no hay columna, siempre permitir

  try {
    // Intentar adquirir el lock solo si no hay otro activo
    const result = await sql`
      UPDATE "LemonwayApiCallLog"
      SET processing_lock_at = NOW()
      WHERE id = ${logId}
        AND (processing_lock_at IS NULL OR processing_lock_at < NOW() - INTERVAL '60 seconds')
      RETURNING id
    `
    return result.length > 0
  } catch (e) {
    console.log("Error acquiring lock, allowing:", e)
    return true // Si falla, permitir el procesamiento
  }
}

/**
 * Libera el lock de procesamiento de una petición
 */
export async function releaseProcessingLock(logId: number): Promise<void> {
  const hasLockColumn = await checkColumnExists()
  if (!hasLockColumn) return // Si no hay columna, no hacer nada

  try {
    await sql`
      UPDATE "LemonwayApiCallLog"
      SET processing_lock_at = NULL
      WHERE id = ${logId}
    `
  } catch (e) {
    console.log("Error releasing lock:", e)
  }
}

/**
 * Limpia locks abandonados (más de 60 segundos)
 */
export async function cleanupAbandonedLocks(): Promise<number> {
  const hasLockColumn = await checkColumnExists()
  if (!hasLockColumn) return 0 // Si no hay columna, no hacer nada

  try {
    const result = await sql`
      UPDATE "LemonwayApiCallLog"
      SET processing_lock_at = NULL
      WHERE processing_lock_at IS NOT NULL
        AND processing_lock_at < NOW() - INTERVAL '60 seconds'
      RETURNING id
    `
    return result.length
  } catch (e) {
    console.log("Error cleaning up locks:", e)
    return 0
  }
}

/**
 * Extrae el accountId del request_payload
 */
export function extractAccountId(requestPayload: any): string | null {
  try {
    if (typeof requestPayload === "string") {
      requestPayload = JSON.parse(requestPayload)
    }
    return requestPayload?.accounts?.[0]?.accountid || null
  } catch {
    return null
  }
}
