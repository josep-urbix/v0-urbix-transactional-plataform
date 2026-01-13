import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { validateSession } from "@/lib/investor-auth/session"
import { generateTOTPSecret, generateNumericCode } from "@/lib/investor-auth/utils"
import * as bcrypt from "bcryptjs"

// Iniciar configuración de 2FA
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.replace("Bearer ", "")

    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const user = await validateSession(token)
    if (!user) {
      return NextResponse.json({ error: "Sesión inválida" }, { status: 401 })
    }

    // Generar secret TOTP
    const secret = generateTOTPSecret()

    // Generar códigos de respaldo
    const backupCodes: string[] = []
    const hashedBackupCodes: string[] = []
    for (let i = 0; i < 10; i++) {
      const code = generateNumericCode(8)
      backupCodes.push(code)
      hashedBackupCodes.push(await bcrypt.hash(code, 10))
    }

    // Guardar temporalmente (se confirmará cuando el usuario verifique)
    await sql`
      UPDATE investors."User"
      SET two_factor_secret = ${secret},
          two_factor_backup_codes = ${JSON.stringify(hashedBackupCodes)}::jsonb
      WHERE id = ${user.id}
    `

    // Generar URL para QR code
    const issuer = "Urbix"
    const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(user.email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`

    return NextResponse.json({
      success: true,
      secret,
      qr_code_url: otpauthUrl,
      backup_codes: backupCodes,
    })
  } catch (error) {
    console.error("Error configurando 2FA:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
