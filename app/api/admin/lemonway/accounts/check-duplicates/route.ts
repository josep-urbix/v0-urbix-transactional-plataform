/**
 * Endpoint: GET|POST /api/admin/lemonway/accounts/check-duplicates
 * Propósito: Validar duplicados en 3 niveles antes de crear cuenta en Lemonway
 * Permisos: lemonway:accounts:duplicate_check
 * Trazabilidad: Especificación Sección 2.3
 */

import { getSession, requirePermission } from "@/lib/auth"
import { LemonwayDuplicateChecker } from "@/lib/lemonway-duplicate-checker"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    // Verificar permiso
    const authResult = await requirePermission(
      session?.user,
      "lemonway:accounts:duplicate_check",
      "lemonway:accounts",
      "duplicate_check",
      request,
    )
    if (!authResult.success) return authResult.error

    const { first_name, last_name, birth_date, birth_country_id } = await request.json()

    // Validar campos requeridos
    if (!first_name || !last_name || !birth_date || !birth_country_id) {
      return NextResponse.json(
        {
          error: "Faltan campos requeridos: first_name, last_name, birth_date, birth_country_id",
        },
        { status: 400 },
      )
    }

    // Ejecutar validación de duplicados
    const duplicateResult = await LemonwayDuplicateChecker.checkDuplicates(
      first_name,
      last_name,
      birth_date,
      birth_country_id,
    )

    return NextResponse.json(
      {
        success: true,
        data: duplicateResult,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("[v0] Duplicate check error:", error)
    return NextResponse.json({ error: "Failed to check duplicates" }, { status: 500 })
  }
}
