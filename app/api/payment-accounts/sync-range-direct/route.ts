import { NextResponse } from "next/server"
import { requireAuth, getSession } from "@/lib/auth"
import { LemonwayClient } from "@/lib/lemonway-client"
import { createSQLLogger } from "@/lib/sql-logger"

// POST /api/payment-accounts/sync-range-direct
export async function POST(request: Request) {
  console.log("[v0] [SYNC RANGE] Starting sync range request")

  try {
    const session = await getSession()
    await requireAuth()

    const body = await request.json()
    const { startId, endId } = body

    const start = Number.parseInt(startId)
    const end = Number.parseInt(endId)

    console.log(`[v0] [SYNC RANGE] Syncing accounts from ${start} to ${end}`)

    if (isNaN(start) || isNaN(end) || start > end || end - start > 100) {
      return NextResponse.json({ error: "Invalid range. Max 100 accounts." }, { status: 400 })
    }

    const config = await LemonwayClient.getConfig()
    if (!config) {
      return NextResponse.json({ error: "Lemonway not configured" }, { status: 400 })
    }

    const client = new LemonwayClient(config)
    const sql = createSQLLogger({
      apiEndpoint: "/api/payment-accounts/sync-range",
      userEmail: session?.user?.email,
    })

    let synced = 0
    let notFound = 0
    let errors = 0
    const totalAccounts = end - start + 1

    console.log(`[v0] [SYNC RANGE] Processing ${totalAccounts} accounts sequentially`)

    for (let currentId = start; currentId <= end; currentId++) {
      const progress = currentId - start + 1
      console.log(`[v0] [SYNC RANGE] [${progress}/${totalAccounts}] Processing account ${currentId}`)

      try {
        const accountData = await client.getAccountDetails(String(currentId), "")

        if (!accountData || !accountData.accountid) {
          console.log(`[v0] [SYNC RANGE] Account ${currentId} not found`)
          notFound++
          continue
        }

        console.log(`[v0] [SYNC RANGE] Account ${currentId} found, saving to database`)

        const balance = accountData.balance ? Number.parseFloat(accountData.balance) / 100 : 0

        let status = "active"
        if (accountData.isblocked) status = "blocked"
        else if (accountData.status === 6) status = "active"

        let kycStatus = "none"
        if (accountData.kycStatus === 1) kycStatus = "pending"
        else if (accountData.kycStatus === 2) kycStatus = "validated"
        else if (accountData.kycStatus === 3) kycStatus = "refused"

        let birthDate = null
        if (accountData.birth?.date) {
          const parts = accountData.birth.date.split("/")
          if (parts.length === 3) {
            birthDate = `${parts[2]}-${parts[1]}-${parts[0]}`
          }
        }

        await sql.query(
          `INSERT INTO payments.payment_accounts (
            account_id, email, first_name, last_name, company_name, balance, currency, status, kyc_status, kyc_level,
            account_type, phone_number, mobile_number, address, city, postal_code, country, is_debtor, is_payer,
            can_receive_money, can_send_money, nationality, client_title, birth_date, birth_city, birth_country,
            internal_id, is_blocked, payer_or_beneficiary, company_description, company_website,
            company_identification_number, raw_data, last_sync_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23,
            $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34
          )
          ON CONFLICT (account_id) DO UPDATE SET
            email = EXCLUDED.email, first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name,
            company_name = EXCLUDED.company_name, balance = EXCLUDED.balance, status = EXCLUDED.status,
            kyc_status = EXCLUDED.kyc_status, kyc_level = EXCLUDED.kyc_level, phone_number = EXCLUDED.phone_number,
            mobile_number = EXCLUDED.mobile_number, address = EXCLUDED.address, city = EXCLUDED.city,
            postal_code = EXCLUDED.postal_code, country = EXCLUDED.country, can_receive_money = EXCLUDED.can_receive_money,
            can_send_money = EXCLUDED.can_send_money, nationality = EXCLUDED.nationality, client_title = EXCLUDED.client_title,
            birth_date = EXCLUDED.birth_date, birth_city = EXCLUDED.birth_city, birth_country = EXCLUDED.birth_country,
            internal_id = EXCLUDED.internal_id, is_blocked = EXCLUDED.is_blocked,
            payer_or_beneficiary = EXCLUDED.payer_or_beneficiary, company_description = EXCLUDED.company_description,
            company_website = EXCLUDED.company_website, company_identification_number = EXCLUDED.company_identification_number,
            raw_data = EXCLUDED.raw_data, last_sync_at = EXCLUDED.last_sync_at, updated_at = NOW()`,
          [
            accountData.accountid,
            accountData.email || null,
            accountData.firstname || null,
            accountData.lastname || null,
            accountData.companyname || null,
            balance,
            accountData.currency || "EUR",
            status,
            kycStatus,
            accountData.kyc_level || 0,
            String(accountData.account_type || 0),
            accountData.phonenumber || null,
            accountData.mobilenumber || null,
            accountData.address?.street || null,
            accountData.address?.city || null,
            accountData.address?.postcode || null,
            accountData.address?.country || null,
            accountData.is_debtor || false,
            accountData.payer_or_beneficiary === 1,
            true,
            !accountData.isblocked,
            accountData.nationality || null,
            accountData.client_title || null,
            birthDate,
            accountData.birthcity || null,
            accountData.birthcountry || null,
            accountData.internal_id || null,
            accountData.isblocked || false,
            accountData.payer_or_beneficiary || null,
            accountData.company_description || null,
            accountData.company_website || null,
            accountData.company_identification_number || null,
            JSON.stringify(accountData),
            new Date().toISOString(),
          ],
        )

        synced++
        console.log(`[v0] [SYNC RANGE] Account ${currentId} saved successfully (${synced}/${totalAccounts})`)
      } catch (error: any) {
        errors++
        console.error(`[v0] [SYNC RANGE] Error processing account ${currentId}:`, error.message)
        // LemonwayClient already logged the API call with error
      }
    }

    console.log(`[v0] [SYNC RANGE] Completed: ${synced} synced, ${notFound} not found, ${errors} errors`)

    return NextResponse.json({
      success: true,
      message: `Sincronización completada: ${synced} exitosas, ${notFound} no encontradas, ${errors} errores.`,
      synced,
      notFound,
      errors,
      totalAccounts,
    })
  } catch (error: any) {
    console.error("[v0] [SYNC RANGE] Fatal error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
