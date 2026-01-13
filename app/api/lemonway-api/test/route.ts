import { NextResponse } from "next/server"
import { getSession, hasPermission } from "@/lib/auth"
import { sql } from "@/lib/db"
import { LemonwayClient } from "@/lib/lemonway-client"

// POST /api/lemonway-api/test - Execute API method test
export async function POST(request: Request) {
  const startTime = Date.now()

  try {
    const session = await getSession()
    if (!session || !hasPermission(session.user, "lemonway_api", "test")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const { method_id, parameters } = body

    // Get method details
    const methodResult = await sql`
      SELECT * FROM lemonway_api_methods
      WHERE id = ${method_id}
    `

    if (methodResult.length === 0) {
      return NextResponse.json({ error: "Method not found" }, { status: 404 })
    }

    const method = methodResult[0]

    if (!method.is_enabled) {
      return NextResponse.json({ error: "Method is disabled" }, { status: 403 })
    }

    // Get Lemonway config
    const config = await LemonwayClient.getConfig()
    if (!config) {
      return NextResponse.json({ error: "Lemonway not configured" }, { status: 400 })
    }

    const client = new LemonwayClient(config)
    let response: any
    let success = true
    let errorMessage: string | null = null

    try {
      // Execute the method based on name
      switch (method.name) {
        case "getBearerToken":
          response = await client.getBearerToken()
          break
        case "getAccountDetails":
          response = await client.getAccountDetails(parameters?.accountId || "", parameters?.email || "")
          break
        case "getAccountsByIds":
          response = await client.getAccountsByIds(parameters?.accountIds || [])
          break
        case "getAccountTransactions":
          response = await client.getAccountTransactions(
            parameters?.accountId || "",
            parameters?.startDate,
            parameters?.endDate,
          )
          break
        case "getKycStatus":
          response = await client.getKycStatus(parameters?.walletId || "")
          break
        case "getAccountBalances":
          response = await client.getAccountBalances(parameters?.walletIds || [])
          break
        case "getTransactions":
          response = await client.getTransactions(parameters?.walletId, parameters?.startDate, parameters?.endDate)
          break
        default:
          return NextResponse.json({ error: "Method not implemented" }, { status: 501 })
      }
    } catch (error: any) {
      success = false
      errorMessage = error.message
      response = { error: error.message }
    }

    const duration = Date.now() - startTime

    // Save to history
    await sql`
      INSERT INTO lemonway_api_call_history (
        method_id, user_id, request_payload, response_payload,
        status_code, duration_ms, success, error_message
      ) VALUES (
        ${method_id},
        ${session.user.id},
        ${JSON.stringify(parameters)},
        ${JSON.stringify(response)},
        ${success ? 200 : 500},
        ${duration},
        ${success},
        ${errorMessage}
      )
    `

    return NextResponse.json({
      success,
      response,
      duration_ms: duration,
      error: errorMessage,
    })
  } catch (error: any) {
    const duration = Date.now() - startTime
    console.error("Error executing API test:", error)

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        duration_ms: duration,
      },
      { status: 500 },
    )
  }
}
