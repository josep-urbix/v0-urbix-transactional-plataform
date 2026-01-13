import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAuth, checkPermission } from "@/lib/auth"

// GET - Obtener configuración actual
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    if (!checkPermission(session.user.role, "settings", "read")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const config = await sql`
      SELECT * FROM "LemonwayConfig" 
      ORDER BY "id" DESC 
      LIMIT 1
    `

    return NextResponse.json({ config: config[0] || null })
  } catch (error: any) {
    console.error("[Lemonway Config API] Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Crear o actualizar configuración
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    if (!checkPermission(session.user.role, "settings", "update")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const body = await request.json()

    const {
      environment,
      apiToken,
      environmentName,
      walletId,
      maxConcurrentRequests,
      minDelayBetweenRequestsMs,
      oauthUrl,
      accountsRetrieveUrl,
      accountsBalancesUrl,
      accountsKycstatusUrl,
      transactionsListUrl,
    } = body

    await sql`DELETE FROM "LemonwayConfig"`

    const result = await sql`
      INSERT INTO "LemonwayConfig" (
        "environment", "api_token", "environment_name", "wallet_id",
        "max_concurrent_requests", "min_delay_between_requests_ms",
        "oauth_url", "accounts_retrieve_url", "accounts_balances_url",
        "accounts_kycstatus_url", "transactions_list_url"
      )
      VALUES (
        ${environment}, ${apiToken}, ${environmentName || "urbix"}, ${walletId},
        ${maxConcurrentRequests || 3}, ${minDelayBetweenRequestsMs || 1000},
        ${oauthUrl || null}, ${accountsRetrieveUrl || null}, ${accountsBalancesUrl || null},
        ${accountsKycstatusUrl || null}, ${transactionsListUrl || null}
      )
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      config: result[0],
      message: "Configuración de Lemonway guardada correctamente",
    })
  } catch (error: any) {
    console.error("[Lemonway Config API] Error saving:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
