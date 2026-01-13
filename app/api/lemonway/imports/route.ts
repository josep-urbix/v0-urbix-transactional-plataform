import { type NextRequest, NextResponse } from "next/server"
import { getSession, hasPermission } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    // Autenticación y autorización
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const canView = await hasPermission(session.user, "lemonway_imports", "read")
    if (!canView) {
      return NextResponse.json({ error: "Sin permisos para ver importaciones" }, { status: 403 })
    }

    // Obtener parámetros de query
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    let runs
    let total = 0

    if (status && status !== "all") {
      runs = await sql`
        SELECT 
          ir.id,
          ir.created_by,
          ir.account_id,
          ir.cuenta_virtual_id,
          ir.start_date,
          ir.end_date,
          ir.status,
          ir.total_transactions,
          ir.imported_transactions,
          ir.failed_transactions,
          ir.skipped_transactions,
          ir.error_message,
          ir.started_at,
          ir.completed_at,
          ir.created_at,
          ir.updated_at,
          u.email as user_email
        FROM lemonway_temp.import_runs ir
        LEFT JOIN public."User" u ON ir.created_by = u.id
        WHERE ir.status = ${status}
        ORDER BY ir.created_at DESC 
        LIMIT ${limit} 
        OFFSET ${offset}
      `

      const countResult = await sql`
        SELECT COUNT(*) as total 
        FROM lemonway_temp.import_runs ir
        WHERE ir.status = ${status}
      `
      total = Number.parseInt(countResult[0]?.total || "0")
    } else {
      runs = await sql`
        SELECT 
          ir.id,
          ir.created_by,
          ir.account_id,
          ir.cuenta_virtual_id,
          ir.start_date,
          ir.end_date,
          ir.status,
          ir.total_transactions,
          ir.imported_transactions,
          ir.failed_transactions,
          ir.skipped_transactions,
          ir.error_message,
          ir.started_at,
          ir.completed_at,
          ir.created_at,
          ir.updated_at,
          u.email as user_email
        FROM lemonway_temp.import_runs ir
        LEFT JOIN public."User" u ON ir.created_by = u.id
        ORDER BY ir.created_at DESC 
        LIMIT ${limit} 
        OFFSET ${offset}
      `

      const countResult = await sql`
        SELECT COUNT(*) as total 
        FROM lemonway_temp.import_runs ir
      `
      total = Number.parseInt(countResult[0]?.total || "0")
    }

    return NextResponse.json({
      imports: Array.isArray(runs) ? runs : [],
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    })
  } catch (error) {
    console.error("[v0] Error fetching imports:", error)
    return NextResponse.json({ error: "Error al obtener importaciones" }, { status: 500 })
  }
}
