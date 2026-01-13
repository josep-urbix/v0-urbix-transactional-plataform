import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { IPMonitor } from "@/lib/ip-monitor"

export async function GET(request: Request) {
  try {
    await requireAuth()

    // Usar el sistema de monitoreo de IP
    const serverIP = await IPMonitor.getCurrentIP()

    return NextResponse.json({
      success: true,
      ip: serverIP,
      message: serverIP
        ? "Esta es la IP del servidor. Añade esta IP al whitelist de Lemonway si es necesario."
        : "No se pudo detectar la IP del servidor. Intenta de nuevo en unos segundos.",
    })
  } catch (error: any) {
    console.error("[v0] Error in IP route:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
