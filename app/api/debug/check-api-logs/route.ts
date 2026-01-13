import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    // Check if table exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'LemonwayApiCallLog'
      ) as exists
    `

    if (!tableExists[0].exists) {
      return NextResponse.json({
        success: false,
        message: "Tabla LemonwayApiCallLog no existe",
        tableExists: false,
      })
    }

    // Count total records
    const count = await sql`SELECT COUNT(*) as count FROM "LemonwayApiCallLog"`

    // Get last 5 records
    const records = await sql`
      SELECT * FROM "LemonwayApiCallLog" 
      ORDER BY created_at DESC 
      LIMIT 5
    `

    return NextResponse.json({
      success: true,
      tableExists: true,
      totalRecords: count[0].count,
      sampleRecords: records,
    })
  } catch (error: any) {
    console.error("Error checking API logs:", error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    })
  }
}
