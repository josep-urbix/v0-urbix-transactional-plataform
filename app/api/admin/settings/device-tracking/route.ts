import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import { sql } from "@/lib/db"
import { isAdminRole } from "@/lib/auth"

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const settings = await sql`
      SELECT key, value FROM public."AdminSettings"
      WHERE key IN (
        'device_tracking_enabled',
        'device_tracking_interval_basic',
        'device_tracking_interval_standard'
      )
    `

    const config: any = {
      enabled: true,
      intervalBasic: 600000,
      intervalStandard: 1800000,
    }

    settings.forEach((setting: any) => {
      if (setting.key === "device_tracking_enabled") {
        config.enabled = setting.value === "true"
      } else if (setting.key === "device_tracking_interval_basic") {
        config.intervalBasic = Number.parseInt(setting.value)
      } else if (setting.key === "device_tracking_interval_standard") {
        config.intervalStandard = Number.parseInt(setting.value)
      }
    })

    return NextResponse.json(config)
  } catch (error: any) {
    console.error("Device tracking config error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { enabled, intervalBasic, intervalStandard } = body

    await sql`
      INSERT INTO public."AdminSettings" (key, value, description, is_secret, created_at, updated_at)
      VALUES 
        ('device_tracking_enabled', ${enabled.toString()}, 'Habilitar tracking automático de dispositivos', false, NOW(), NOW()),
        ('device_tracking_interval_basic', ${intervalBasic.toString()}, 'Intervalo de actualización para dispositivos básicos (ms)', false, NOW(), NOW()),
        ('device_tracking_interval_standard', ${intervalStandard.toString()}, 'Intervalo de actualización para dispositivos con 2FA (ms)', false, NOW(), NOW())
      ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = NOW()
    `

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Device tracking update error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
