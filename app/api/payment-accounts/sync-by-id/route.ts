import { NextResponse } from "next/server"
import { requireAuth, getSession } from "@/lib/auth"
import { LemonwayClient } from "@/lib/lemonway-client"
import { createSQLLogger } from "@/lib/sql-logger"

// POST /api/payment-accounts/sync-by-id
export async function POST(request: Request) {
  try {
    const session = await getSession()
    await requireAuth()

    const body = await request.json()
    const { accountId, email } = body

    const sql = createSQLLogger({
      apiEndpoint: "/api/payment-accounts/sync-by-id",
      userEmail: session?.user?.email,
    })

    console.log("[v0] Syncing account by ID:", accountId, "or email:", email)

    if (!accountId && !email) {
      return NextResponse.json({ error: "Either accountId or email is required" }, { status: 400 })
    }

    const config = await LemonwayClient.getConfig()
    if (!config) {
      return NextResponse.json({ error: "Lemonway not configured" }, { status: 400 })
    }

    const client = new LemonwayClient(config)

    const response = await client.getAccountDetails(accountId || "", email || "")

    console.log("[v0] Lemonway response:", JSON.stringify(response, null, 2))

    if (!response.accounts || !Array.isArray(response.accounts)) {
      return NextResponse.json({ error: "Invalid response from Lemonway", response }, { status: 500 })
    }

    const validAccounts = response.accounts.filter((acc: any) => acc.id !== null && acc.id !== undefined)

    if (validAccounts.length === 0) {
      return NextResponse.json(
        { error: "No valid accounts found", totalAccounts: response.accounts.length },
        { status: 404 },
      )
    }

    const synced = []
    const errors = []

    for (const account of validAccounts) {
      try {
        console.log("[v0] Processing account:", account.id)

        await sql.query(
          `INSERT INTO payments.payment_accounts (
            account_id,
            email,
            first_name,
            last_name,
            company_name,
            balance,
            currency,
            status,
            kyc_status,
            kyc_level,
            account_type,
            phone_number,
            mobile_number,
            address,
            city,
            postal_code,
            country,
            is_debtor,
            is_payer,
            can_receive_money,
            can_send_money,
            nationality,
            client_title,
            birth_date,
            birth_city,
            birth_country,
            internal_id,
            is_blocked,
            payer_or_beneficiary,
            company_description,
            company_website,
            company_identification_number,
            raw_data,
            last_sync_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34
          )
          ON CONFLICT (account_id) DO UPDATE SET
            email = EXCLUDED.email,
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            company_name = EXCLUDED.company_name,
            balance = EXCLUDED.balance,
            status = EXCLUDED.status,
            kyc_status = EXCLUDED.kyc_status,
            kyc_level = EXCLUDED.kyc_level,
            phone_number = EXCLUDED.phone_number,
            mobile_number = EXCLUDED.mobile_number,
            address = EXCLUDED.address,
            city = EXCLUDED.city,
            postal_code = EXCLUDED.postal_code,
            country = EXCLUDED.country,
            can_receive_money = EXCLUDED.can_receive_money,
            can_send_money = EXCLUDED.can_send_money,
            nationality = EXCLUDED.nationality,
            client_title = EXCLUDED.client_title,
            birth_date = EXCLUDED.birth_date,
            birth_city = EXCLUDED.birth_city,
            birth_country = EXCLUDED.birth_country,
            internal_id = EXCLUDED.internal_id,
            is_blocked = EXCLUDED.is_blocked,
            payer_or_beneficiary = EXCLUDED.payer_or_beneficiary,
            company_description = EXCLUDED.company_description,
            company_website = EXCLUDED.company_website,
            company_identification_number = EXCLUDED.company_identification_number,
            raw_data = EXCLUDED.raw_data,
            last_sync_at = EXCLUDED.last_sync_at,
            updated_at = NOW()
          RETURNING *`,
          [
            account.id,
            account.email || null,
            account.firstname || null,
            account.lastname || null,
            account.company?.name || null,
            account.balance || null, // Valor directo sin dividir por 100
            account.currency || "EUR",
            account.status || null, // Valor directo sin mapear
            account.kycStatus || null, // Valor directo sin mapear
            account.kycLevel || 0,
            String(account.accountType || 0),
            account.phoneNumber || null,
            account.mobileNumber || null,
            account.adresse?.street || null,
            account.adresse?.city || null,
            account.adresse?.postCode || null,
            account.adresse?.country || null,
            account.isDebtor || false,
            account.payerOrBeneficiary === 1,
            true,
            !account.isblocked,
            account.nationality || null,
            account.clientTitle || null,
            account.birth?.date || null, // Valor directo sin convertir formato
            account.birth?.city || null,
            account.birth?.Country || null,
            account.internalId || null,
            account.isblocked || false,
            account.payerOrBeneficiary || null,
            account.company?.description || null,
            account.company?.websiteUrl || null,
            account.company?.identificationNumber || null,
            JSON.stringify(account),
            new Date().toISOString(),
          ],
        )

        synced.push({ account_id: account.id })
        console.log("[v0] Synced account:", account.id)
      } catch (error: any) {
        console.error("[v0] Error syncing account:", account.id, error)
        errors.push({ accountId: account.id, error: error.message })
      }
    }

    return NextResponse.json({
      success: true,
      synced: synced.length,
      errors: errors.length,
      accounts: synced,
      errorDetails: errors,
    })
  } catch (error: any) {
    console.error("[v0] Error in sync-by-id:", error)
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 })
  }
}
