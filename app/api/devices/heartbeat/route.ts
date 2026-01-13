import { type NextRequest, NextResponse } from "next/server"
import { updateDeviceHeartbeat, getDeviceTrustLevel } from "@/lib/device-tracking"
import { validateInvestorSession } from "@/lib/investor-auth/middleware"

export async function POST(request: NextRequest) {
  try {
    const user = await validateInvestorSession(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { device_fingerprint } = body

    if (!device_fingerprint) {
      return NextResponse.json({ error: "device_fingerprint is required" }, { status: 400 })
    }

    const updated = await updateDeviceHeartbeat(user.id, device_fingerprint, request)

    if (!updated) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 })
    }

    // Devolver el trust_level para que el frontend ajuste su interval
    const trustLevel = await getDeviceTrustLevel(user.id, device_fingerprint)

    return NextResponse.json({
      success: true,
      trust_level: trustLevel,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("Device heartbeat error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
