import { neon } from "@neondatabase/serverless"
import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { LemonwayClient } from "@/lib/lemonway-client"

const sql = neon(process.env.DATABASE_URL)
const lemonwayClient = new LemonwayClient()

export async function POST(req) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { requestId } = await req.json()

    if (!requestId) {
      return NextResponse.json({ error: "Request ID is required" }, { status: 400 })
    }

    // Get the draft request
    const result = await sql`
      SELECT * FROM investors.lemonway_account_requests
      WHERE id = $1 AND deleted_at IS NULL
    `,
      [requestId]

    if (!result || result.length === 0) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    const account = result[0]

    // Only allow submitting DRAFT requests
    if (account.status !== "DRAFT") {
      return NextResponse.json({ error: `Cannot submit request with status: ${account.status}` }, { status: 400 })
    }

    // Get country ISO2 codes
    const birthCountry = await sql`
      SELECT code_iso2 FROM investors.countries WHERE id = $1
    \`, [account.birth_country_id]

    const residenceCountry = account.country_id 
      ? await sql\`SELECT code_iso2 FROM investors.countries WHERE id = $1`.then((res) => res[0]?.code_iso2 || null)
    \
      : null

    // Build Lemonway payload
    const lemonwayPayload = {
      firstName: account.first_name,
      lastName: account.last_name,
      birthDate: account.birth_date,
      email: account.email,
      birthCountry: birthCountry?.[0]?.code_iso2 || "ES",
      phone: account.phone_number,
      street: account.street,
      city: account.city,
      postalCode: account.postal_code,
      country: residenceCountry?.code_iso2 || null,
      profileType: account.profile_type,
    }

    // Submit to Lemonway
    const lemonwayResponse = await lemonwayClient.createAccount(lemonwayPayload)

    if (!lemonwayResponse.success) {
      // Save error but update status to SUBMITTED
      await sql`
        UPDATE investors.lemonway_account_requests
        SET 
          status = 'SUBMITTED',
          submitted_at = NOW(),
          lemonway_error_message = $1,
          updated_at = NOW()
        WHERE id = $2
      `,
        [lemonwayResponse.error, requestId]

      return NextResponse.json({
        success: false,
        status: "SUBMITTED_WITH_ERROR",
        error: lemonwayResponse.error,
      })
    }

    // Update request status to SUBMITTED
    await sql`
      UPDATE investors.lemonway_account_requests
      SET 
        status = 'SUBMITTED',
        submitted_at = NOW(),
        lemonway_wallet_id = $1,
        updated_at = NOW()
      WHERE id = $2
    `,
      [lemonwayResponse.walletId, requestId]

    return NextResponse.json({
      success: true,
      status: "SUBMITTED",
      walletId: lemonwayResponse.walletId,
    })
  } catch (error) {
    console.error("[v0] Submit account error:", error)
    return NextResponse.json({ error: "Failed to submit account" }, { status: 500 })
  }
}
