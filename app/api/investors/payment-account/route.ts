import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

async function logSqlAccess(params: {
  query: string
  queryParams?: unknown[]
  executionTimeMs: number
  rowsAffected: number
  status: "success" | "error"
  errorMessage?: string
  apiEndpoint: string
  userEmail?: string
  ipAddress?: string
}) {
  try {
    await sql`
      INSERT INTO "SQLLog" (
        query,
        params,
        execution_time_ms,
        rows_affected,
        status,
        error_message,
        api_endpoint,
        user_email,
        ip_address,
        "createdAt"
      ) VALUES (
        ${params.query},
        ${JSON.stringify(params.queryParams || [])},
        ${params.executionTimeMs},
        ${params.rowsAffected},
        ${params.status},
        ${params.errorMessage || null},
        ${params.apiEndpoint},
        ${params.userEmail || null},
        ${params.ipAddress || null},
        NOW()
      )
    `
  } catch (error) {
    console.error("Error logging SQL access:", error)
  }
}

// GET - Consultar cuenta de pago por email
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"

  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const email = request.nextUrl.searchParams.get("email")

    if (!email) {
      return NextResponse.json({ error: "Email requerido" }, { status: 400 })
    }

    const queryStartTime = Date.now()
    const queryText = `SELECT id, account_id, email, status, balance, is_blocked, first_name, last_name, kyc_status, account_type, currency, created_at, last_sync_at FROM payments.payment_accounts WHERE LOWER(email) = LOWER($1) LIMIT 1`

    const result = await sql`
      SELECT 
        id,
        account_id,
        email,
        status,
        balance,
        is_blocked,
        first_name,
        last_name,
        kyc_status,
        account_type,
        currency,
        created_at,
        last_sync_at
      FROM payments.payment_accounts 
      WHERE LOWER(email) = LOWER(${email})
      LIMIT 1
    `

    const executionTimeMs = Date.now() - queryStartTime

    await logSqlAccess({
      query: queryText,
      queryParams: [email],
      executionTimeMs,
      rowsAffected: result.length,
      status: "success",
      apiEndpoint: "/api/investors/payment-account",
      userEmail: email,
      ipAddress,
    })

    if (result.length === 0) {
      return NextResponse.json({
        exists: false,
        message: "No se encontró cuenta de pago asociada a este email",
        _debug: {
          query: queryText,
          executionTimeMs,
          timestamp: new Date().toISOString(),
        },
      })
    }

    const account = result[0]

    return NextResponse.json({
      exists: true,
      account: {
        id: account.id,
        accountId: account.account_id,
        email: account.email,
        status: account.status,
        balance: Number.parseFloat(account.balance) || 0,
        isBlocked: account.is_blocked,
        firstName: account.first_name,
        lastName: account.last_name,
        kycStatus: account.kyc_status,
        accountType: account.account_type,
        currency: account.currency || "EUR",
        createdAt: account.created_at,
        lastSyncAt: account.last_sync_at,
      },
      _debug: {
        query: queryText,
        executionTimeMs,
        timestamp: new Date().toISOString(),
        source: "payments.payment_accounts",
      },
    })
  } catch (error) {
    const executionTimeMs = Date.now() - startTime
    console.error("Error fetching payment account:", error)

    await logSqlAccess({
      query: "SELECT FROM payments.payment_accounts",
      executionTimeMs,
      rowsAffected: 0,
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      apiEndpoint: "/api/investors/payment-account",
      ipAddress,
    })

    return NextResponse.json({ error: "Error al consultar cuenta de pago" }, { status: 500 })
  }
}
