export interface ApiLogEntry {
  userId?: string
  method: string
  endpoint: string
  statusCode: number
  requestBody?: any
  responseBody?: any
  duration?: number
  ipAddress?: string
  userAgent?: string
  error?: string
}

/**
 * Registra una llamada API
 * Nota: Usa la tabla LemonwayApiCallLog existente como almacenamiento general
 */
export async function logApiCall(entry: ApiLogEntry): Promise<void> {
  try {
    // Por ahora solo loguear en consola para no crear dependencias innecesarias
    console.log("[API Call]", {
      method: entry.method,
      endpoint: entry.endpoint,
      status: entry.statusCode,
      userId: entry.userId,
      duration: entry.duration,
    })

    // TODO: Si se necesita persistencia, crear tabla api_call_logs
    // await sql`INSERT INTO api_call_logs (...) VALUES (...)`
  } catch (error) {
    console.error("Error logging API call:", error)
  }
}
