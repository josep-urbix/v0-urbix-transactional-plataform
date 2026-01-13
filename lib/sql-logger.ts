import { sql } from "@/lib/db"

interface SQLLogOptions {
  apiEndpoint?: string
  userEmail?: string
  ipAddress?: string
}

export async function logSQL(query: string, params: any[] = [], options: SQLLogOptions = {}) {
  const startTime = performance.now()
  let status = "success"
  let errorMessage: string | null = null
  let rowsAffected = 0
  let result: any = null

  try {
    // Execute the query
    result = await sql.query(query, params)
    rowsAffected = result.length || 0
  } catch (error: any) {
    status = "error"
    errorMessage = error.message || String(error)
    throw error // Re-throw to maintain original behavior
  } finally {
    const executionTime = performance.now() - startTime

    // Log to database asynchronously (don't wait)
    sql
      .query(
        `INSERT INTO "SQLLog" 
        (query, params, execution_time_ms, rows_affected, status, error_message, api_endpoint, user_email, ip_address) 
       VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          query,
          JSON.stringify(params),
          executionTime.toFixed(3),
          rowsAffected,
          status,
          errorMessage,
          options.apiEndpoint || null,
          options.userEmail || null,
          options.ipAddress || null,
        ],
      )
      .catch((err) => {
        // Silently fail SQL logging to avoid breaking main queries
        console.error("[SQL Logger] Failed to log query:", err)
      })
  }

  return result
}

export function createSQLLogger(options: SQLLogOptions = {}) {
  return {
    query: async (query: string, params: any[] = []) => {
      return logSQL(query, params, options)
    },
  }
}

export async function logSqlQuery(
  query: string,
  tableName: string,
  operation: string,
  userEmail: string,
  context?: any,
) {
  try {
    await sql.query(
      `INSERT INTO public."SQLLog" 
        (query, params, execution_time_ms, rows_affected, status, api_endpoint, user_email) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        query.substring(0, 5000), // Limit query length
        JSON.stringify(context || {}),
        0, // execution_time_ms - not tracked in this version
        0, // rows_affected - not tracked in this version
        "success",
        `${operation} ${tableName}`,
        userEmail,
      ],
    )
  } catch (error) {
    console.error("[SQL Logger] Failed to log query:", error)
  }
}

export async function logSqlExecution(options: {
  query: string
  params: any[]
  result: any
  duration: number
  user_email: string
  success: boolean
  error?: string
}) {
  try {
    await sql.query(
      `INSERT INTO public."SQLLog" 
        (query, params, execution_time_ms, rows_affected, status, error_message, user_email) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        options.query.substring(0, 5000),
        JSON.stringify(options.params),
        options.duration.toFixed(3),
        Array.isArray(options.result) ? options.result.length : 0,
        options.success ? "success" : "error",
        options.error || null,
        options.user_email,
      ],
    )
  } catch (error) {
    console.error("[SQL Logger] Failed to log query:", error)
  }
}
