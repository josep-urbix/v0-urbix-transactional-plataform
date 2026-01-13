import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const configResult = await sql`
      SELECT * FROM "LemonwayConfig" 
      ORDER BY "id" DESC 
      LIMIT 1
    `

    if (configResult.length === 0) {
      return NextResponse.json({
        status: "disconnected",
        message: "No hay configuración de Lemonway",
        pendingMessages: 0,
      })
    }

    const config = configResult[0]
    if (!config.api_token) {
      return NextResponse.json({
        status: "error",
        message: "API Token no configurado",
        pendingMessages: 0,
      })
    }

    const pendingResult = await sql`
      SELECT COUNT(*) as count 
      FROM "LemonwayTransaction" 
      WHERE "status" = 'pending'
    `

    const pendingCount = Number(pendingResult[0].count)

    let status = "connected"
    let message = "Conexión activa"

    if (pendingCount > 0) {
      status = "warning"
      message = `${pendingCount} mensaje${pendingCount > 1 ? "s" : ""} pendiente${pendingCount > 1 ? "s" : ""}`
    }

    return NextResponse.json({
      status,
      message,
      pendingMessages: pendingCount,
      lastCheck: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("[Lemonway] Status check error:", error)
    return NextResponse.json({
      status: "error",
      message: "Error al verificar el estado",
      pendingMessages: 0,
      error: error.message,
    })
  }
}
