import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { isValidUUID } from "@/lib/utils/uuid"

// Obtener wallets vinculados
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    if (!isValidUUID(id)) {
      return NextResponse.json({ error: "ID de inversor inválido" }, { status: 400 })
    }

    const wallets = await sql`
      SELECT * FROM investors."WalletLink"
      WHERE user_id = ${id}
      ORDER BY created_at DESC
    `

    return NextResponse.json({ wallets })
  } catch (error) {
    console.error("Error obteniendo wallets:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// Vincular wallet
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    if (!isValidUUID(id)) {
      return NextResponse.json({ error: "ID de inversor inválido" }, { status: 400 })
    }

    const body = await request.json()
    const { wallet_id, wallet_internal_id } = body

    if (!wallet_id) {
      return NextResponse.json({ error: "wallet_id requerido" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO investors."WalletLink" (
        user_id, wallet_id, wallet_internal_id, status, verified_at, verified_by
      ) VALUES (
        ${id}, ${wallet_id}, ${wallet_internal_id}, 'verified', NOW(), 'admin'
      )
      ON CONFLICT (user_id, wallet_id) DO UPDATE SET
        status = 'verified',
        verified_at = NOW(),
        verified_by = 'admin'
      RETURNING *
    `

    return NextResponse.json({ wallet: result[0] })
  } catch (error) {
    console.error("Error vinculando wallet:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
