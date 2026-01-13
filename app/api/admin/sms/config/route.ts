import { type NextRequest, NextResponse } from "next/server"
import { getSession, isAdminRole } from "@/lib/auth"
import { getSMSApiConfig, upsertSMSApiConfig } from "@/lib/sms-data"
import { SMSApiConfigSchema } from "@/lib/sms-validation"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const config = await getSMSApiConfig()

    return NextResponse.json({ config })
  } catch (error: any) {
    console.error("SMS Config GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()

    const validated = SMSApiConfigSchema.parse(body)

    const config = await upsertSMSApiConfig(validated)

    return NextResponse.json({ config })
  } catch (error: any) {
    if (error.name === "ZodError") {
      console.error("SMS Config POST validation error:", error.errors)
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 })
    }
    console.error("SMS Config POST error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
