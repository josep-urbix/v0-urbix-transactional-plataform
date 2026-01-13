import { type NextRequest, NextResponse } from "next/server"
import { getSession, isAdminRole } from "@/lib/auth"
import { getSMSTemplates, createSMSTemplate } from "@/lib/sms-data"
import { SMSTemplateSchema } from "@/lib/sms-validation"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const templates = await getSMSTemplates()

    return NextResponse.json({ templates })
  } catch (error: any) {
    console.error("SMS Templates GET error:", error)
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
    const validated = SMSTemplateSchema.parse(body)

    const template = await createSMSTemplate(validated)

    return NextResponse.json({ template })
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 })
    }
    console.error("SMS Templates POST error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
