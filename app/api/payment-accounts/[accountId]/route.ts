import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { PaymentAccountRepository } from "@/lib/repositories/payment-account-repository"

// GET /api/payment-accounts/:accountId - Get a single payment account
export async function GET(request: Request, { params }: { params: { accountId: string } }) {
  try {
    await requireAuth()

    const account = await PaymentAccountRepository.getByAccountId(params.accountId)

    if (!account) {
      return NextResponse.json({ error: "Payment account not found" }, { status: 404 })
    }

    return NextResponse.json({ account })
  } catch (error: any) {
    console.error("[Payment Accounts API] Get error:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch payment account" }, { status: 500 })
  }
}

// PATCH /api/payment-accounts/:accountId - Update a payment account
export async function PATCH(request: Request, { params }: { params: { accountId: string } }) {
  try {
    await requireAuth()

    const { accountId } = params

    const body = await request.json()

    // Get existing account
    const existing = await PaymentAccountRepository.getByAccountId(accountId)
    if (!existing) {
      return NextResponse.json({ error: "Payment account not found" }, { status: 404 })
    }

    // Merge updates
    const updated = await PaymentAccountRepository.upsert({
      ...existing,
      ...body,
      accountId: accountId, // Ensure account ID doesn't change
    })

    return NextResponse.json({ account: updated })
  } catch (error: any) {
    console.error("[Payment Accounts API] Update error:", error)
    return NextResponse.json({ error: error.message || "Failed to update payment account" }, { status: 500 })
  }
}
