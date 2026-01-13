import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth"

// GET - Obtener configuración de documentos
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireRole(["admin", "superadmin"])(request)
    if (authResult instanceof NextResponse) return authResult

    const result = await sql`
      SELECT key, value, is_secret 
      FROM public."AdminSettings"
      WHERE key LIKE 'documentos_%'
    `

    const config: Record<string, string> = {}
    result.forEach((row: any) => {
      // Enmascarar valores secretos
      if (row.is_secret && row.value) {
        config[row.key] = "••••••••"
      } else {
        config[row.key] = row.value || ""
      }
    })

    return NextResponse.json({ config })
  } catch (error) {
    console.error("[Documents Settings] Error:", error)
    return NextResponse.json({ error: "Error al obtener configuración" }, { status: 500 })
  }
}

// POST - Actualizar configuración de documentos
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireRole(["admin", "superadmin"])(request)
    if (authResult instanceof NextResponse) return authResult

    const body = await request.json()

    // Lista de claves permitidas y si son secretas
    const allowedKeys: Record<string, boolean> = {
      documentos_storage_provider: false,
      documentos_aws_s3_bucket: false,
      documentos_aws_s3_region: false,
      documentos_aws_access_key_id: true,
      documentos_aws_secret_access_key: true,
      documentos_qr_token_expiry_minutes: false,
      documentos_otp_expiry_minutes: false,
      documentos_max_otp_attempts: false,
      documentos_session_expiry_minutes: false,
    }

    for (const [key, value] of Object.entries(body)) {
      if (key in allowedKeys && value !== "••••••••") {
        // No actualizar si el valor es el placeholder de enmascarado
        await sql`
          INSERT INTO public."AdminSettings" (key, value, is_secret, created_at, updated_at)
          VALUES (${key}, ${String(value)}, ${allowedKeys[key]}, NOW(), NOW())
          ON CONFLICT (key) DO UPDATE SET
            value = ${String(value)},
            updated_at = NOW()
        `
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Documents Settings] Error:", error)
    return NextResponse.json({ error: "Error al guardar configuración" }, { status: 500 })
  }
}
