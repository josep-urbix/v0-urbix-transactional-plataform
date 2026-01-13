import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { IPMonitor } from "@/lib/ip-monitor"

export async function GET(request: Request) {
  try {
    await requireAuth()

    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "50")

    const history = await IPMonitor.getIPHistory(limit)

    return NextResponse.json({
      success: true,
      history,
      count: history.length,
    })
  } catch (error: any) {
    console.error("[v0] Error getting IP history:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    await requireAuth()

    // Forzar verificación inmediata de la IP
    const ip = await IPMonitor.forceCheck()

    return NextResponse.json({
      success: true,
      ip,
      message: ip ? "IP actualizada correctamente" : "No se pudo obtener la IP",
    })
  } catch (error: any) {
    console.error("[v0] Error forcing IP check:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
