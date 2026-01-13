export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { accountId: string } }) {
  try {
    console.log("[v0] DEBUG - Attempting to get session...")
    const session = await getSession()
    console.log("[v0] DEBUG - Session result:", session ? "EXISTS" : "NULL")

    if (!session) {
      console.error("[VirtualAccounts] No session found - returning 401")
      return NextResponse.json({ error: "No autorizado - No session" }, { status: 401 })
    }

    console.log("[v0] DEBUG - Session user exists:", session.user ? "YES" : "NO")
    if (!session.user) {
      console.error("[VirtualAccounts] Session without user:", session)
      return NextResponse.json({ error: "No autorizado - No user in session" }, { status: 401 })
    }

    console.log("[v0] DEBUG - Session user ID:", session.user.id)

    const { accountId } = params

    console.log("[v0] DEBUG - Fetching account with ID:", accountId)
    const account = await sql`
      SELECT 
        cv.id,
        cv.tipo as account_type,
        COALESCE(cv.saldo_disponible, '0') as balance,
        COALESCE(cv.saldo_bloqueado, '0') as blocked_balance,
        cv.estado as status,
        cv.email,
        cv.lemonway_account_id,
        cv.created_at
      FROM virtual_accounts.cuentas_virtuales cv
      WHERE cv.id = ${accountId}
    `

    console.log("[v0] DEBUG - Query result:", account)

    if (!account || account.length === 0) {
      return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 })
    }

    const accountData = account[0]
    return NextResponse.json({
      id: accountData.id,
      account_type: accountData.account_type || "individual",
      balance: accountData.balance?.toString() || "0",
      blocked_balance: accountData.blocked_balance?.toString() || "0",
      status: accountData.status?.toLowerCase() || "active",
      email: accountData.email || "",
      lemonway_account_id: accountData.lemonway_account_id || "",
      created_at: accountData.created_at,
      owner_data: {
        email: accountData.email || "",
        name: "",
      },
    })
  } catch (error: any) {
    console.error("[VirtualAccounts] Error getting account:", error)
    console.error("[VirtualAccounts] Error details:", error.message, error.code)
    console.error("[VirtualAccounts] Full error:", JSON.stringify(error, null, 2))
    return NextResponse.json({ error: error.message || "Error al cargar cuenta" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { accountId: string } }) {
  try {
    const session = await getSession()

    if (!session) {
      console.error("[VirtualAccounts] No session found")
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    if (!session.user) {
      console.error("[VirtualAccounts] Session without user:", session)
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { accountId } = params
    const body = await request.json()
    const { status } = body

    const updated = await sql`
      UPDATE virtual_accounts.cuentas_virtuales
      SET 
        estado = COALESCE(${status}, estado),
        updated_at = NOW()
      WHERE id = ${accountId}
      RETURNING id, tipo, saldo_disponible, saldo_bloqueado, estado, email, created_at
    `

    if (!updated || updated.length === 0) {
      return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 })
    }

    const accountData = updated[0]
    return NextResponse.json({
      id: accountData.id,
      account_type: accountData.tipo,
      balance: accountData.saldo_disponible?.toString() || "0",
      blocked_balance: accountData.saldo_bloqueado?.toString() || "0",
      status: accountData.estado?.toLowerCase() || "active",
      email: accountData.email || "",
      created_at: accountData.created_at,
    })
  } catch (error: any) {
    console.error("[VirtualAccounts] Error updating account:", error)
    console.error("[VirtualAccounts] Error details:", error.message, error.code)
    console.error("[VirtualAccounts] Full error:", JSON.stringify(error, null, 2))
    return NextResponse.json({ error: error.message || "Error al actualizar cuenta" }, { status: 500 })
  }
}
