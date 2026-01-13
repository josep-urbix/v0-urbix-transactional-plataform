import { type NextRequest, NextResponse } from "next/server"
import { getSession, isAdminRole } from "@/lib/auth"
import { getSMSDashboardStats, getSMSLogs } from "@/lib/sms-data"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const stats = await getSMSDashboardStats()
    const recentLogs = await getSMSLogs(20)

    return NextResponse.json({ stats, recentLogs })
  } catch (error: any) {
    console.error("SMS Dashboard error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
