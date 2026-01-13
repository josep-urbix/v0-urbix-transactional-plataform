import { getSession, requirePermission } from "@/lib/auth"
import { sql } from "@/lib/db"
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
      .filter(
        ([key, value]) =>
          key !== "requestId" &&
          key !== "created_by" &&
          key !== "updated_at" &&
          key !== "validation_status" &&
          value !== undefined,
      )
      .map(([key, value]) => [key, typeof value === "string" && value.trim() === "" ? null : value])
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})

    if (Object.keys(fieldsToUpdate).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    let requestId = payload.requestId

    if (!requestId) {
      const year = new Date().getFullYear()
      const randomPart = Math.floor(Math.random() * 100000)
        .toString()
        .padStart(5, "0")
      const reference = `REQ-${year}-${randomPart}`

      const createResult = await sql`
        INSERT INTO investors.lemonway_account_requests (
          request_reference,
          status,
          created_by,
          created_at,
          updated_at,
          validation_status
        ) VALUES (
          ${reference},
          'DRAFT',
          ${userId},
          NOW(),
          NOW(),
          'PENDING'
        )
        RETURNING id
      `

      requestId = createResult[0].id
    }

    if (Object.keys(fieldsToUpdate).length > 0) {
      const updates: string[] = []
      const values: (string | string[] | boolean | null)[] = []

      Object.entries(fieldsToUpdate).forEach(([key, value], index) => {
        updates.push(`${key} = $${index + 1}`)
        values.push(value)
      })

      const setClause = updates.join(", ")

      await sql.query(
        `UPDATE investors.lemonway_account_requests 
         SET ${setClause}
         WHERE id = $${Object.keys(fieldsToUpdate).length + 1} 
           AND created_by = $${Object.keys(fieldsToUpdate).length + 2}
           AND status = 'DRAFT'`,
        [...values, requestId, userId],
      )
    }

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
