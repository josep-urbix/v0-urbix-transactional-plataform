import { getSession, requirePermission } from "@/lib/auth"
import { sql } from "@neon/serverless"
import { type NextRequest, NextResponse } from "next/server"

interface AutoSavePayload {
  requestId?: string
  first_name?: string
  last_name?: string
  birth_date?: string
  email?: string
  phone_number?: string
  birth_country_id?: string
  nationality_ids?: string[]
  profile_type?: string
  street?: string
  city?: string
  postal_code?: string
  country_id?: string
  province?: string
  occupation?: string
  annual_income?: string
  estimated_wealth?: string
  pep_status?: string
  pep_position?: string
  pep_start_date?: string
  pep_end_date?: string
  origin_of_funds?: string[]
  has_ifi_tax?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    // Verificar permiso + auditoría automática
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

    const payload: AutoSavePayload = await request.json()

    const fieldsToUpdate = Object.entries(payload)
      .filter(([key, value]) => key !== "requestId" && value !== undefined)
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})

    if (Object.keys(fieldsToUpdate).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    let requestId = payload.requestId

    if (!requestId) {
      // Generar referencia única: REQ-2025-XXXXX
      const year = new Date().getFullYear()
      const randomPart = Math.floor(Math.random() * 100000)
        .toString()
        .padStart(5, "0")
      const reference = `REQ-${year}-${randomPart}`

      const createResult = await sql`
        INSERT INTO investors.lemonway_account_requests (
          request_reference,
          status,
          created_by_user_id,
          created_at,
          updated_at
        ) VALUES (
          ${reference},
          'DRAFT',
          ${userId},
          NOW(),
          NOW()
        )
        RETURNING id
      `

      requestId = createResult[0].id
    }

    const updateFields = Object.keys(fieldsToUpdate)
      .map((key) => `${key} = $${Object.keys(fieldsToUpdate).indexOf(key) + 1}`)
      .join(", ")

    const updateValues = Object.values(fieldsToUpdate)

    await sql`
      UPDATE investors.lemonway_account_requests
      SET 
        ${sql.raw(updateFields)},
        updated_at = NOW(),
        validation_status = 'PENDING'
      WHERE id = ${requestId} AND status = 'DRAFT'
    `.bind(...updateValues)

    return NextResponse.json(
      {
        success: true,
        requestId,
        message: "Auto-saved successfully",
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("[v0] Auto-save error:", error)
    return NextResponse.json({ error: "Failed to auto-save request" }, { status: 500 })
  }
}
