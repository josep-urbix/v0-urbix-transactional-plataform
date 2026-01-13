import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Obtener wallets con status 6 sin cuenta virtual vinculada
    const unlinkedWallets = await sql`
      SELECT 
        pa.id,
        pa.account_id,
        pa.internal_id,
        pa.email,
        pa.status,
        pa.balance,
        pa.created_at,
        pa.cuenta_virtual_id
      FROM payments.payment_accounts pa
      WHERE pa.status = '6'
        AND pa.cuenta_virtual_id IS NULL
      ORDER BY pa.created_at DESC
    `

    // Obtener también wallets con vinculación inconsistente
    const inconsistentLinks = await sql`
      SELECT 
        pa.id as payment_account_id,
        pa.account_id,
        pa.internal_id as pa_internal_id,
        pa.email as pa_email,
        pa.status,
        cv.id as cuenta_virtual_id,
        cv.lemonway_account_id,
        cv.lemonway_internal_id,
        cv.email as cv_email,
        cv.vinculacion_bloqueada
      FROM payments.payment_accounts pa
      INNER JOIN virtual_accounts.cuentas_virtuales cv ON pa.cuenta_virtual_id = cv.id
      WHERE pa.status = '6'
        AND (
          cv.lemonway_account_id != pa.account_id
          OR cv.lemonway_internal_id != pa.internal_id
          OR cv.vinculacion_bloqueada = true
        )
    `

    return NextResponse.json({
      unlinkedWallets,
      inconsistentLinks,
      summary: {
        totalUnlinked: unlinkedWallets.length,
        totalInconsistent: inconsistentLinks.length,
      },
    })
  } catch (error: any) {
    console.error("Error obteniendo wallets sin vincular:", error)
    return NextResponse.json(
      {
        error: "Error al obtener wallets sin vincular",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
