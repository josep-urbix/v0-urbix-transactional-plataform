import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession, checkPermission, logDeniedAccess } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const canManage = await checkPermission(session.user.role, "settings", "update")

    if (!canManage) {
      await logDeniedAccess(
        "settings",
        "update",
        "Permiso denegado",
        session.user.id,
        session.user.email,
        session.user.role,
      )
      return NextResponse.json({ error: "No tienes permisos para modificar la configuración" }, { status: 403 })
    }

    const body = await request.json()
    const {
      retryDelaySeconds,
      maxRetryAttempts,
      manualRetryEnabled,
      pollingIntervalSeconds,
      processingGracePeriodSeconds,
    } = body

    if (!retryDelaySeconds || !maxRetryAttempts || manualRetryEnabled === undefined) {
      return NextResponse.json({ error: "Faltan parámetros requeridos" }, { status: 400 })
    }

    await sql`
      INSERT INTO "AppConfig" (id, key, value, "createdAt", "updatedAt")
      VALUES 
        (gen_random_uuid()::text, 'lemonway_retry_delay_seconds', ${retryDelaySeconds.toString()}, NOW(), NOW()),
        (gen_random_uuid()::text, 'lemonway_max_retry_attempts', ${maxRetryAttempts.toString()}, NOW(), NOW()),
        (gen_random_uuid()::text, 'lemonway_manual_retry_enabled', ${manualRetryEnabled.toString()}, NOW(), NOW()),
        (gen_random_uuid()::text, 'lemonway_polling_interval_seconds', ${(pollingIntervalSeconds || 3).toString()}, NOW(), NOW()),
        (gen_random_uuid()::text, 'lemonway_processing_grace_period_seconds', ${(processingGracePeriodSeconds || 30).toString()}, NOW(), NOW())
      ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value, "updatedAt" = NOW()
    `

    return NextResponse.json({
      success: true,
      settings: {
        retryDelaySeconds,
        maxRetryAttempts,
        manualRetryEnabled,
        pollingIntervalSeconds,
        processingGracePeriodSeconds,
      },
    })
  } catch (error) {
    console.error("Error updating retry settings:", error)
    return NextResponse.json({ error: "Error al guardar la configuración" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const config = await sql`
      SELECT key, value
      FROM "AppConfig"
      WHERE key IN ('lemonway_retry_delay_seconds', 'lemonway_max_retry_attempts', 'lemonway_manual_retry_enabled', 'lemonway_polling_interval_seconds', 'lemonway_processing_grace_period_seconds')
    `

    const settings = {
      retryDelaySeconds: Number.parseInt(config.find((c) => c.key === "lemonway_retry_delay_seconds")?.value || "120"),
      maxRetryAttempts: Number.parseInt(config.find((c) => c.key === "lemonway_max_retry_attempts")?.value || "2"),
      manualRetryEnabled: config.find((c) => c.key === "lemonway_manual_retry_enabled")?.value === "true",
      pollingIntervalSeconds: Number.parseInt(
        config.find((c) => c.key === "lemonway_polling_interval_seconds")?.value || "3",
      ),
      processingGracePeriodSeconds: Number.parseInt(
        config.find((c) => c.key === "lemonway_processing_grace_period_seconds")?.value || "30",
      ),
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error("Error fetching retry settings:", error)
    return NextResponse.json({ error: "Error al obtener la configuración" }, { status: 500 })
  }
}
