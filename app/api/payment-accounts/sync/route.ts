import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { PaymentAccountRepository } from "@/lib/repositories/payment-account-repository"
import { LemonwayClient } from "@/lib/lemonway-client"

// POST /api/payment-accounts/sync - Sync payment accounts from Lemonway
export async function POST(request: Request) {
  try {
    console.log("[v0] [Payment Accounts Sync] Starting sync process")
    await requireAuth()

    const body = await request.json()
    const { email, accountId, syncAll } = body

    console.log("[v0] [Payment Accounts Sync] Request body:", { email, accountId, syncAll })

    if (!email && !accountId && !syncAll) {
      return NextResponse.json({ error: "Email, accountId, or syncAll flag is required" }, { status: 400 })
    }

    console.log("[v0] [Payment Accounts Sync] Getting Lemonway config")
    const lemonwayConfig = await LemonwayClient.getConfig()
    if (!lemonwayConfig) {
      console.error("[v0] [Payment Accounts Sync] Lemonway not configured")
      return NextResponse.json({ error: "Lemonway not configured" }, { status: 400 })
    }

    console.log("[v0] [Payment Accounts Sync] Creating Lemonway client")
    const lemonwayClient = new LemonwayClient(lemonwayConfig)

    if (syncAll) {
      console.log("[v0] [Payment Accounts Sync] Syncing all accounts from Lemonway")

      try {
        const response = await lemonwayClient.getAllAccounts()
        console.log("[v0] [Payment Accounts Sync] Lemonway response structure:", Object.keys(response))
        console.log("[v0] [Payment Accounts Sync] Full response:", JSON.stringify(response, null, 2))

        let lemonwayAccounts = []

        // Try different possible response structures
        if (response.accounts && Array.isArray(response.accounts)) {
          lemonwayAccounts = response.accounts
        } else if (response.data && Array.isArray(response.data)) {
          lemonwayAccounts = response.data
        } else if (response.WALLETS && Array.isArray(response.WALLETS)) {
          lemonwayAccounts = response.WALLETS
        } else if (Array.isArray(response)) {
          lemonwayAccounts = response
        } else {
          console.error("[v0] [Payment Accounts Sync] Unexpected response structure:", Object.keys(response))
          return NextResponse.json(
            {
              success: false,
              error: "Formato de respuesta de Lemonway no reconocido",
              responseStructure: Object.keys(response),
            },
            { status: 500 },
          )
        }

        console.log("[v0] [Payment Accounts Sync] Found", lemonwayAccounts.length, "accounts in Lemonway")

        if (lemonwayAccounts.length === 0) {
          console.log("[v0] [Payment Accounts Sync] No accounts found in Lemonway response")
          return NextResponse.json({
            success: true,
            synced: 0,
            errors: 0,
            accounts: [],
            message: "No accounts found in Lemonway",
          })
        }

        const savedAccounts = []
        let errorCount = 0

        for (const lemonwayAccount of lemonwayAccounts) {
          try {
            console.log("[v0] [Payment Accounts Sync] Processing account:", lemonwayAccount.ID || lemonwayAccount.id)
            const account = PaymentAccountRepository.mapLemonwayToPaymentAccount(lemonwayAccount)
            console.log("[v0] [Payment Accounts Sync] Mapped account:", account.accountId)
            const saved = await PaymentAccountRepository.upsert(account)
            console.log("[v0] [Payment Accounts Sync] Saved account:", saved.accountId)
            savedAccounts.push(saved)
          } catch (error: any) {
            console.error(
              "[v0] [Payment Accounts Sync] Error syncing account:",
              lemonwayAccount.ID || lemonwayAccount.id,
              error,
            )
            console.error("[v0] [Payment Accounts Sync] Error details:", error.message, error.stack)
            errorCount++
          }
        }

        console.log("[v0] [Payment Accounts Sync] Sync complete. Saved:", savedAccounts.length, "Errors:", errorCount)

        return NextResponse.json({
          success: true,
          synced: savedAccounts.length,
          errors: errorCount,
          accounts: savedAccounts,
        })
      } catch (error: any) {
        console.error("[v0] [Payment Accounts Sync] Error calling getAllAccounts:", error)
        console.error("[v0] [Payment Accounts Sync] Error details:", error.message, error.stack)
        throw error
      }
    }

    // Get single account details from Lemonway
    console.log("[v0] [Payment Accounts Sync] Getting single account details")
    const lemonwayAccount = await lemonwayClient.getAccountDetails(accountId || "", email || "")

    if (!lemonwayAccount) {
      console.log("[v0] [Payment Accounts Sync] Account not found in Lemonway")
      return NextResponse.json({ error: "Account not found in Lemonway" }, { status: 404 })
    }

    console.log("[v0] [Payment Accounts Sync] Lemonway account retrieved:", JSON.stringify(lemonwayAccount, null, 2))

    // Map and save to database
    const account = PaymentAccountRepository.mapLemonwayToPaymentAccount(lemonwayAccount)
    const saved = await PaymentAccountRepository.upsert(account)

    console.log("[v0] [Payment Accounts Sync] Account synced successfully:", saved.accountId)

    return NextResponse.json({ account: saved })
  } catch (error: any) {
    console.error("[v0] [Payment Accounts Sync] Sync error:", error)
    console.error("[v0] [Payment Accounts Sync] Error details:", error.message, error.stack)
    return NextResponse.json({ error: error.message || "Failed to sync payment account" }, { status: 500 })
  }
}
