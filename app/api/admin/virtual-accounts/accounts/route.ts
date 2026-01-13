import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] DEBUG - Fetching virtual accounts list")

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const search = searchParams.get("search")

    console.log("[v0] DEBUG - Filters: status=", status, "search=", search)

    const statusMap: { [key: string]: string } = {
      active: "ACTIVA",
      frozen: "BLOQUEADA",
      closed: "CERRADA",
    }

    let baseQuery = sql`
      SELECT 
        cv.id,
        cv.email,
        cv.saldo_disponible,
        cv.saldo_bloqueado,
        cv.estado,
        cv.created_at,
        COUNT(m.id) as transaction_count
      FROM virtual_accounts.cuentas_virtuales cv
      LEFT JOIN virtual_accounts.movimientos_cuenta m ON m.cuenta_id = cv.id
      WHERE 1=1
      GROUP BY cv.id, cv.email, cv.saldo_disponible, cv.saldo_bloqueado, cv.estado, cv.created_at
    `

    // Build query with status filter if provided
    if (status) {
      const bdStatus = statusMap[status]
      if (bdStatus) {
        baseQuery = sql`
          SELECT 
            cv.id,
            cv.email,
            cv.saldo_disponible,
            cv.saldo_bloqueado,
            cv.estado,
            cv.created_at,
            COUNT(m.id) as transaction_count
          FROM virtual_accounts.cuentas_virtuales cv
          LEFT JOIN virtual_accounts.movimientos_cuenta m ON m.cuenta_id = cv.id
          WHERE cv.estado = ${bdStatus}
          GROUP BY cv.id, cv.email, cv.saldo_disponible, cv.saldo_bloqueado, cv.estado, cv.created_at
        `
      }
    }

    // Build query with search filter if provided
    if (search) {
      const searchPattern = `%${search}%`
      baseQuery = sql`
        SELECT 
          cv.id,
          cv.email,
          cv.saldo_disponible,
          cv.saldo_bloqueado,
          cv.estado,
          cv.created_at,
          COUNT(m.id) as transaction_count
        FROM virtual_accounts.cuentas_virtuales cv
        LEFT JOIN virtual_accounts.movimientos_cuenta m ON m.cuenta_id = cv.id
        WHERE 1=1
          ${status ? sql`AND cv.estado = ${statusMap[status] || "ACTIVA"}` : sql``}
          AND (cv.id::text ILIKE ${searchPattern} OR cv.email ILIKE ${searchPattern})
        GROUP BY cv.id, cv.email, cv.saldo_disponible, cv.saldo_bloqueado, cv.estado, cv.created_at
        ORDER BY cv.created_at DESC
      `
    }

    // Add ordering if not already added
    if (!search && !status) {
      baseQuery = sql`
        SELECT 
          cv.id,
          cv.email,
          cv.saldo_disponible,
          cv.saldo_bloqueado,
          cv.estado,
          cv.created_at,
          COUNT(m.id) as transaction_count
        FROM virtual_accounts.cuentas_virtuales cv
        LEFT JOIN virtual_accounts.movimientos_cuenta m ON m.cuenta_id = cv.id
        GROUP BY cv.id, cv.email, cv.saldo_disponible, cv.saldo_bloqueado, cv.estado, cv.created_at
        ORDER BY cv.created_at DESC
      `
    } else if (!search && status) {
      const bdStatus = statusMap[status]
      baseQuery = sql`
        SELECT 
          cv.id,
          cv.email,
          cv.saldo_disponible,
          cv.saldo_bloqueado,
          cv.estado,
          cv.created_at,
          COUNT(m.id) as transaction_count
        FROM virtual_accounts.cuentas_virtuales cv
        LEFT JOIN virtual_accounts.movimientos_cuenta m ON m.cuenta_id = cv.id
        WHERE cv.estado = ${bdStatus}
        GROUP BY cv.id, cv.email, cv.saldo_disponible, cv.saldo_bloqueado, cv.estado, cv.created_at
        ORDER BY cv.created_at DESC
      `
    }

    console.log("[v0] DEBUG - Executing query...")
    const accounts = await baseQuery

    console.log("[v0] DEBUG - Query returned:", accounts?.length || 0, "accounts")

    const transformedAccounts = accounts.map((account: any) => ({
      id: account.id,
      account_number: account.id,
      owner_id: account.id,
      balance: `${(Number.parseFloat(account.saldo_disponible || "0") + Number.parseFloat(account.saldo_bloqueado || "0")).toFixed(4)}`,
      status: account.estado === "ACTIVA" ? "active" : account.estado === "BLOQUEADA" ? "frozen" : "closed",
      created_at: account.created_at,
      transaction_count: Number.parseInt(account.transaction_count || "0"),
      owner_data: {
        email: account.email || "",
        name: account.email?.split("@")[0] || "Usuario",
      },
    }))

    console.log("[v0] DEBUG - Returning", transformedAccounts.length, "transformed accounts")
    return NextResponse.json({ accounts: transformedAccounts })
  } catch (error: any) {
    console.error("[v0] ERROR - Error fetching virtual accounts:", error.message)
    console.error("[v0] ERROR - Full error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
