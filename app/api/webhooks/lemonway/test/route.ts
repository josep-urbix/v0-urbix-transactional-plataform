import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    // Log this test request
    await sql`
      INSERT INTO "LemonwayTransaction" (
        operation, status, request_data, response_data, created_at
      ) VALUES (
        'WEBHOOK_TEST',
        'success',
        ${JSON.stringify({ test: true, timestamp: new Date().toISOString() })},
        ${JSON.stringify({ message: "Test endpoint working" })},
        NOW()
      )
    `

    return NextResponse.json({
      success: true,
      message: "Webhook endpoint is working",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()

    // Log this test request
    await sql`
      INSERT INTO "LemonwayTransaction" (
        operation, status, request_data, response_data, created_at
      ) VALUES (
        'WEBHOOK_TEST_POST',
        'success',
        ${JSON.stringify({ body, timestamp: new Date().toISOString() })},
        ${JSON.stringify({ message: "POST test received" })},
        NOW()
      )
    `

    return NextResponse.json({
      success: true,
      message: "POST received and logged",
      bodyLength: body.length,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
