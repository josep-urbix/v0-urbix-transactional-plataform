import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireRole } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    await requireRole(["admin", "superadmin"])

    const { variable } = await request.json()

    if (!variable) {
      return NextResponse.json({ valid: false, error: "Variable requerida" }, { status: 400 })
    }

    // Formato esperado: investors.User.columna o simplemente columna
    let table = "investors.User"
    let column = variable

    if (variable.includes(".")) {
      const parts = variable.split(".")
      if (parts.length === 3) {
        // investors.User.columna
        table = `${parts[0]}.${parts[1]}`
        column = parts[2]
      } else if (parts.length === 2) {
        // User.columna o investors.columna
        column = parts[1]
      }
    }

    const result = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'investors'
        AND table_name = 'User'
        AND column_name = ${column}
    `

    if (result.length === 0) {
      return NextResponse.json({
        valid: false,
        error: `La columna '${column}' no existe en la tabla investors.User`,
      })
    }

    return NextResponse.json({
      valid: true,
      column: result[0].column_name,
      dataType: result[0].data_type,
      fullVariable: `investors.User.${result[0].column_name}`,
    })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }

    console.error("[Validate Variable] Error:", error)
    return NextResponse.json({ valid: false, error: "Error al validar variable" }, { status: 500 })
  }
}
