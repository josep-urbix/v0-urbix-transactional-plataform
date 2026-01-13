import { type NextRequest, NextResponse } from "next/server"
import { getTrackingConfig } from "@/lib/device-tracking"
import { validateInvestorSession } from "@/lib/investor-auth/middleware"
import { getSession } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    let user = await validateInvestorSession(request)

    // If not an investor, try admin session
    if (!user) {
      user = await getSession(request)
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const config = await getTrackingConfig()

    return NextResponse.json(config)
  } catch (error: any) {
    console.error("Device config error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
