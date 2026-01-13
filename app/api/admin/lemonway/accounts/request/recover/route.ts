import { getSession, requirePermission } from "@/lib/auth"
import { sql } from "@neon/serverless"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()

    // Verificar permiso
    const authResult = await requirePermission(
      session?.user,
      "lemonway:accounts:create",
      "lemonway:accounts",
      "create",
      request,
    )
    if (!authResult.success) return authResult.error

    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await sql`
      SELECT *
      FROM investors.lemonway_account_requests
      WHERE created_by_user_id = ${userId}
        AND status = 'DRAFT'
        AND deleted_at IS NULL
      ORDER BY updated_at DESC
      LIMIT 1
    `

    if (result.length === 0) {
      return NextResponse.json({ draft: null, message: "No draft found" }, { status: 200 })
    }

    const draft = result[0]

    return NextResponse.json(
      {
        draft: {
          requestId: draft.id,
          request_reference: draft.request_reference,
          first_name: draft.first_name,
          last_name: draft.last_name,
          birth_date: draft.birth_date,
          email: draft.email,
          phone_number: draft.phone_number,
          birth_country_id: draft.birth_country_id,
          nationality_ids: draft.nationality_ids,
          profile_type: draft.profile_type,
          street: draft.street,
          city: draft.city,
          postal_code: draft.postal_code,
          country_id: draft.country_id,
          province: draft.province,
          occupation: draft.occupation,
          annual_income: draft.annual_income,
          estimated_wealth: draft.estimated_wealth,
          pep_status: draft.pep_status,
          pep_position: draft.pep_position,
          pep_start_date: draft.pep_start_date,
          pep_end_date: draft.pep_end_date,
          origin_of_funds: draft.origin_of_funds,
          has_ifi_tax: draft.has_ifi_tax,
          updated_at: draft.updated_at,
        },
        message: "Draft recovered",
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("[v0] Recover draft error:", error)
    return NextResponse.json({ error: "Failed to recover draft" }, { status: 500 })
  }
}
