import { type NextRequest, NextResponse } from "next/server"
import { getSession, isAdminRole } from "@/lib/auth"
import { getSMSTemplateByKey, updateSMSTemplate } from "@/lib/sms-data"
import { SMSTemplateSchema } from "@/lib/sms-validation"

export async function GET(request: NextRequest, { params }: { params: { key: string } }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const template = await getSMSTemplateByKey(params.key)

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    return NextResponse.json({ template })
  } catch (error: any) {
    console.error("SMS Template GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { key: string } }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { key, ...updateData } = SMSTemplateSchema.partial().parse(body)

    const template = await updateSMSTemplate(params.key, updateData)

    return NextResponse.json({ template })
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 })
    }
    console.error("SMS Template PATCH error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
