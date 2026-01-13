import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { LemonwayClient } from "@/lib/lemonway-client"
import { PaymentAccountRepository } from "@/lib/repositories/payment-account-repository"

// GET /api/payment-accounts/test-sync - Test sync without frontend
export async function GET() {
  try {
    console.log("[v0] [Test Sync] Starting test sync")
    await requireAuth()

    // Get Lemonway config
    console.log("[v0] [Test Sync] Getting Lemonway config")
    const lemonwayConfig = await LemonwayClient.getConfig()
    if (!lemonwayConfig) {
      return NextResponse.json({ error: "Lemonway not configured" }, { status: 400 })
    }

    // Create Lemonway client
    console.log("[v0] [Test Sync] Creating Lemonway client")
    const lemonwayClient = new LemonwayClient(lemonwayConfig)

    // Get all accounts
    console.log("[v0] [Test Sync] Calling getAllAccounts()")
    const response = await lemonwayClient.getAllAccounts()

    console.log("[v0] [Test Sync] Response type:", typeof response)
    console.log("[v0] [Test Sync] Response keys:", Object.keys(response))
    console.log("[v0] [Test Sync] Full response:", JSON.stringify(response, null, 2))

    // Try to extract accounts
    let lemonwayAccounts = []
    if (response.accounts && Array.isArray(response.accounts)) {
      lemonwayAccounts = response.accounts
      console.log("[v0] [Test Sync] Found accounts in response.accounts")
    } else if (response.data && Array.isArray(response.data)) {
      lemonwayAccounts = response.data
      console.log("[v0] [Test Sync] Found accounts in response.data")
    } else if (response.WALLETS && Array.isArray(response.WALLETS)) {
      lemonwayAccounts = response.WALLETS
      console.log("[v0] [Test Sync] Found accounts in response.WALLETS")
    } else if (Array.isArray(response)) {
      lemonwayAccounts = response
      console.log("[v0] [Test Sync] Response is array directly")
    }

    console.log("[v0] [Test Sync] Found", lemonwayAccounts.length, "accounts")

    lemonwayAccounts.forEach((acc: any, index: number) => {
      console.log(`[v0] [Test Sync] Account ${index}:`, JSON.stringify(acc, null, 2))
      console.log(`[v0] [Test Sync] Account ${index} id value:`, acc.id, "type:", typeof acc.id)
    })

    if (lemonwayAccounts.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No accounts found",
        responseStructure: Object.keys(response),
        response: response,
      })
    }

    const validAccounts = lemonwayAccounts.filter((acc: any) => acc.id !== null && acc.id !== undefined)
    console.log("[v0] [Test Sync] Valid accounts (with ID):", validAccounts.length)
    console.log("[v0] [Test Sync] Skipped accounts (null ID):", lemonwayAccounts.length - validAccounts.length)

    console.log("[v0] [Test Sync] Valid accounts:", JSON.stringify(validAccounts, null, 2))

    if (validAccounts.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No valid accounts (all have null ID)",
        totalAccounts: lemonwayAccounts.length,
        allAccounts: lemonwayAccounts, // Return all accounts to debug
      })
    }

    // Try to sync all valid accounts
    const results = []
    const errors = []
    for (const account of validAccounts) {
      try {
        console.log("[v0] [Test Sync] Mapping account:", account.id)
        const mapped = PaymentAccountRepository.mapLemonwayToPaymentAccount(account)
        if (mapped) {
          console.log("[v0] [Test Sync] Upserting account:", mapped.accountId)
          const saved = await PaymentAccountRepository.upsert(mapped)
          results.push(saved)
          console.log("[v0] [Test Sync] Successfully saved account:", saved.accountId)
        } else {
          console.log("[v0] [Test Sync] Mapper returned null for account:", account.id)
        }
      } catch (error: any) {
        console.error("[v0] [Test Sync] Error syncing account:", account.id, error)
        errors.push({ accountId: account.id, error: error.message })
      }
    }

    console.log("[v0] [Test Sync] Successfully synced", results.length, "accounts")
    if (errors.length > 0) {
      console.log("[v0] [Test Sync] Errors:", errors)
    }

    return NextResponse.json({
      success: true,
      totalAccounts: lemonwayAccounts.length,
      validAccounts: validAccounts.length,
      skippedAccounts: lemonwayAccounts.length - validAccounts.length,
      syncedAccounts: results.length,
      errors: errors.length > 0 ? errors : undefined,
      accounts: results,
    })
  } catch (error: any) {
    console.error("[v0] [Test Sync] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
      },
      { status: 500 },
    )
  }
}
