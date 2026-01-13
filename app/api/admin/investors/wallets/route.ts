import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdmin } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const user = await requireAdmin(
      await (async () => {
        const { getServerSession } = await import("@/lib/auth")
        return await getServerSession()
      })(),
      "investors:wallets",
      "read",
      request,
    )

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""

    let query
    if (search) {
      query = sql.query(
        `
        SELECT 
          pa.id,
          pa.account_id as lemonway_wallet_id,
          pa.internal_id,
          pa.email,
          pa.status as wallet_status,
          pa.balance,
          pa.cuenta_virtual_id,
          pa.payer_or_beneficiary,
          cv.id as cuenta_virtual_id_full,
          cv.lemonway_account_id,
          cv.lemonway_internal_id,
          cv.email as cv_email,
          cv.vinculacion_timestamp,
          cv.vinculacion_bloqueada,
          cv.estado as cuenta_estado,
          cv.saldo_disponible,
          cv.saldo_bloqueado,
          pa.created_at,
          pa.updated_at
        FROM payments.payment_accounts pa
        LEFT JOIN virtual_accounts.cuentas_virtuales cv ON pa.cuenta_virtual_id = cv.id
        WHERE pa.cuenta_virtual_id IS NOT NULL
          AND (
            pa.account_id ILIKE $1
            OR pa.email ILIKE $1
            OR cv.lemonway_account_id ILIKE $1
          )
        ORDER BY pa.created_at DESC
        LIMIT 100
      `,
        ["%" + search + "%"],
      )
    } else {
      query = sql.query(
        `
        SELECT 
          pa.id,
          pa.account_id as lemonway_wallet_id,
          pa.internal_id,
          pa.email,
          pa.status as wallet_status,
          pa.balance,
          pa.cuenta_virtual_id,
          pa.payer_or_beneficiary,
          cv.id as cuenta_virtual_id_full,
          cv.lemonway_account_id,
          cv.lemonway_internal_id,
          cv.email as cv_email,
          cv.vinculacion_timestamp,
          cv.vinculacion_bloqueada,
          cv.estado as cuenta_estado,
          cv.saldo_disponible,
          cv.saldo_bloqueado,
          pa.created_at,
          pa.updated_at
        FROM payments.payment_accounts pa
        LEFT JOIN virtual_accounts.cuentas_virtuales cv ON pa.cuenta_virtual_id = cv.id
        WHERE pa.cuenta_virtual_id IS NOT NULL
        ORDER BY pa.created_at DESC
        LIMIT 100
      `,
      )
    }

    const walletsResult = await query
    const wallets = Array.isArray(walletsResult) ? walletsResult : walletsResult.rows || []

    const statsResult = await sql.query(`
      SELECT 
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE cv.vinculacion_timestamp IS NOT NULL)::int as verified,
        COUNT(*) FILTER (WHERE pa.status = '6')::int as primary
      FROM payments.payment_accounts pa
      LEFT JOIN virtual_accounts.cuentas_virtuales cv ON pa.cuenta_virtual_id = cv.id
      WHERE pa.cuenta_virtual_id IS NOT NULL
    `)

    const statsArray = Array.isArray(statsResult) ? statsResult : statsResult?.rows || []
    const stats = statsArray[0] || { total: 0, verified: 0, primary: 0 }

    const formattedWallets = wallets.map((w: any) => ({
      id: w.id.toString(),
      user_id: w.cuenta_virtual_id_full || "",
      user_email: w.email || w.cv_email || "",
      user_name: w.lemonway_wallet_id || "",
      lemonway_wallet_id: w.lemonway_wallet_id,
      wallet_status: w.wallet_status === "6" ? "active" : w.wallet_status === "5" ? "pending" : "blocked",
      is_primary: w.wallet_status === "6",
      linked_at: w.vinculacion_timestamp || w.created_at,
      verified_at: w.vinculacion_timestamp,
      cuenta_virtual_id: w.cuenta_virtual_id_full,
      payer_or_beneficiary: w.payer_or_beneficiary,
      balance: w.balance,
      saldo_disponible: w.saldo_disponible,
      vinculacion_bloqueada: w.vinculacion_bloqueada,
    }))

    return NextResponse.json({
      wallets: formattedWallets,
      stats,
    })
  } catch (error) {
    console.error("Error fetching wallets:", error)
    return NextResponse.json({ error: "Error al obtener wallets" }, { status: 500 })
  }
}
