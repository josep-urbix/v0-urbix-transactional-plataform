export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin, getSession } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()
    const authResult = await requireAdmin(session?.user, "virtual_accounts_operation_types", "update", request)
    if (!authResult.success) {
      return authResult.error
    }

    const { id } = params
    const body = await request.json()
    const {
      code,
      name,
      direction,
      description,
      lemonway_transaction_type,
      lemonway_direction,
      lemonway_payment_method,
      active,
    } = body

    if (!code || !name || !direction) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    const updated = await sql`
      UPDATE virtual_accounts.tipos_operacion_contable
      SET 
        codigo = ${code},
        nombre = ${name},
        descripcion = ${description || null},
        signo_saldo_disponible = ${direction},
        lemonway_transaction_type = ${lemonway_transaction_type || null},
        lemonway_direction = ${lemonway_direction || null},
        lemonway_payment_method = ${lemonway_payment_method || null},
        activo = ${active !== undefined ? active : true},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING 
        id,
        codigo as code,
        nombre as name,
        descripcion as description,
        signo_saldo_disponible as direction,
        activo as active,
        lemonway_transaction_type,
        lemonway_direction,
        lemonway_payment_method
    `

    if (updated.length === 0) {
      return NextResponse.json({ error: "Tipo de operación no encontrado" }, { status: 404 })
    }

    return NextResponse.json(updated[0])
  } catch (error: any) {
    console.error("[VirtualAccounts] Error updating operation type:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()
    const authResult = await requireAdmin(session?.user, "virtual_accounts_operation_types", "delete", request)
    if (!authResult.success) {
      return authResult.error
    }

    const { id } = params

    const deleted = await sql`
      UPDATE virtual_accounts.tipos_operacion_contable
      SET activo = false, updated_at = NOW()
      WHERE id = ${id}
      RETURNING id
    `

    if (deleted.length === 0) {
      return NextResponse.json({ error: "Tipo de operación no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[VirtualAccounts] Error deleting operation type:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
