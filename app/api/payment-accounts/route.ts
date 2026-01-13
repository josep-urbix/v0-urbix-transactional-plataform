import { NextResponse } from "next/server"
import { requireAuth, getSession } from "@/lib/auth"
import { PaymentAccountRepository } from "@/lib/repositories/payment-account-repository"
import type { PaymentAccountFilters } from "@/lib/types/payment-account"
import { createSQLLogger } from "@/lib/sql-logger"

// GET /api/payment-accounts - List all payment accounts with filters
export async function GET(request: Request) {
  try {
    console.log("[v0] [Payment Accounts API] Starting request")

    const session = await getSession()
    await requireAuth()

    console.log("[v0] [Payment Accounts API] Auth passed, parsing params")

    const { searchParams } = new URL(request.url)

    const filters: PaymentAccountFilters = {
      accountId: searchParams.get("accountId") || undefined,
      email: searchParams.get("email") || undefined,
      status: searchParams.get("status") || undefined,
      kycStatus: searchParams.get("kycStatus") || undefined,
      country: searchParams.get("country") || undefined,
      limit: searchParams.get("limit") ? Number.parseInt(searchParams.get("limit")!) : 100,
      offset: searchParams.get("offset") ? Number.parseInt(searchParams.get("offset")!) : 0,
    }

    console.log("[v0] [Payment Accounts API] Filters:", JSON.stringify(filters))

    const sql = createSQLLogger({
      apiEndpoint: "/api/payment-accounts",
      userEmail: session?.user?.email,
    })

    console.log("[v0] [Payment Accounts API] Fetching accounts...")
    const accounts = await PaymentAccountRepository.list(filters, sql)
    console.log("[v0] [Payment Accounts API] Accounts fetched:", accounts.length)

    console.log("[v0] [Payment Accounts API] Fetching stats...")
    const stats = await PaymentAccountRepository.getStats(sql)
    console.log("[v0] [Payment Accounts API] Stats fetched")

    console.log("[v0] [Payment Accounts API] Returning response")
    return NextResponse.json({ accounts, stats })
  } catch (error: any) {
    console.error("[v0] [Payment Accounts API] ERROR:", error)
    console.error("[v0] [Payment Accounts API] Error name:", error?.name)
    console.error("[v0] [Payment Accounts API] Error message:", error?.message)
    console.error("[v0] [Payment Accounts API] Error stack:", error?.stack)

    return NextResponse.json(
      {
        error: error?.message || "Failed to fetch payment accounts",
        details: error?.stack || "No stack trace available",
      },
      { status: 500 },
    )
  }
}

// POST /api/payment-accounts - Create a new payment account
export async function POST(request: Request) {
  try {
    await requireAuth()

    const body = await request.json()
    const account = await PaymentAccountRepository.upsert(body)

    return NextResponse.json({ account }, { status: 201 })
  } catch (error: any) {
    console.error("[v0] [Payment Accounts API] Create error:", error)
    return NextResponse.json({ error: error.message || "Failed to create payment account" }, { status: 500 })
  }
}
