import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdmin } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(
      await (async () => {
        const { getServerSession } = await import("@/lib/auth")
        return await getServerSession()
      })(),
      "lemonway:dashboard",
      "view",
      request,
    )

    const mappings = await sql`
      SELECT 
        id, name, source_field, target_field,
        transformation_type, is_active, created_at, updated_at
      FROM lemonway_temp.lemonway_field_mapping_rules
      ORDER BY created_at DESC
    `

    return NextResponse.json({
      success: true,
      data: mappings,
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(
      await (async () => {
        const { getServerSession } = await import("@/lib/auth")
        return await getServerSession()
      })(),
      "lemonway:dashboard",
      "config",
      request,
    )

    const body = await request.json()
    const { name, source_field, target_field, transformation_type = "identity", transformation_config = {} } = body

    const mapping = await sql`
      INSERT INTO lemonway_temp.lemonway_field_mapping_rules
      (name, source_field, target_field, transformation_type, transformation_config)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      data: mapping[0],
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
