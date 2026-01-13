import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const isActive = searchParams.get("is_active")

    let countries
    if (isActive === "true") {
      countries = await sql`
        SELECT * FROM investors.countries 
        WHERE is_active = true 
        ORDER BY name_en ASC
      `
    } else {
      countries = await sql`
        SELECT * FROM investors.countries 
        ORDER BY name_en ASC
      `
    }

    return NextResponse.json(
      {
        success: true,
        data: countries,
        count: countries.length,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("[v0] Countries API error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch countries" }, { status: 500 })
  }
}
