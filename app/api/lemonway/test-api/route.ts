import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { LemonwayClient } from "@/lib/lemonway-client"

// POST /api/lemonway/test-api - Test different Lemonway API endpoints
export async function POST(request: Request) {
  try {
    await requireAuth()

    const body = await request.json()
    const { endpoint, data } = body

    const config = await LemonwayClient.getConfig()
    if (!config) {
      return NextResponse.json({ error: "Lemonway not configured" }, { status: 400 })
    }

    const client = new LemonwayClient(config)

    let response
    switch (endpoint) {
      case "accounts/retrieve":
        response = await client.getAccountDetails(data?.accountId || "", data?.email || "")
        break
      case "accounts/list":
        response = await client.getAllAccounts()
        break
      case "transactions/list":
        response = await client.getTransactions(data?.walletId, data?.startDate, data?.endDate)
        break
      default:
        return NextResponse.json({ error: "Unknown endpoint" }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      endpoint,
      responseStructure: Object.keys(response),
      response,
    })
  } catch (error: any) {
    console.error("Error testing Lemonway API:", error)
    return NextResponse.json(
      {
        error: error.message,
        stack: error.stack,
      },
      { status: 500 },
    )
  }
}
