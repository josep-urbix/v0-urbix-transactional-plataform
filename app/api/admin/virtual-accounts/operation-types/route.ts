export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin, getSession } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    const authResult = await requireAdmin(session?.user, "virtual_accounts_operation_types", "view", request)
    if (!authResult.success) {
      return authResult.error
    }

    const operationTypes = await sql`
      SELECT 
        id,
        codigo as code,
        nombre as name,
        descripcion as description,
        signo_saldo_disponible as direction,
        activo as active,
        afecta_saldo_disponible,
        afecta_saldo_bloqueado,
        signo_saldo_bloqueado,
        visible_para_inversor,
        requiere_aprobacion,
        orden_visual,
        lemonway_transaction_type,
        lemonway_direction,
        lemonway_payment_method,
        created_at,
        updated_at
      FROM virtual_accounts.tipos_operacion_contable
      WHERE activo = true
      ORDER BY orden_visual, codigo
    `

    return NextResponse.json(operationTypes)
  } catch (error: any) {
    console.error("[VirtualAccounts] Error getting operation types:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    const authResult = await requireAdmin(session?.user, "virtual_accounts_operation_types", "create", request)
    if (!authResult.success) {
      return authResult.error
    }

    const body = await request.json()
    const {
      code,
      name,
      direction,
      description,
      lemonway_transaction_type,
      lemonway_direction,
      lemonway_payment_method,
    } = body

    if (!code || !name || !direction) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    const newType = await sql`
      INSERT INTO virtual_accounts.tipos_operacion_contable (
        codigo, 
        nombre, 
        descripcion, 
        signo_saldo_disponible,
        afecta_saldo_disponible,
        afecta_saldo_bloqueado,
        signo_saldo_bloqueado,
        visible_para_inversor,
        requiere_aprobacion,
        lemonway_transaction_type,
        lemonway_direction,
        lemonway_payment_method,
        activo,
        orden_visual
      )
      VALUES (
        ${code}, 
        ${name}, 
        ${description || null}, 
        ${direction},
        ${direction === "+" ? true : false},
        false,
        '0',
        true,
        false,
        ${lemonway_transaction_type || null},
        ${lemonway_direction || null},
        ${lemonway_payment_method || null},
        true,
        100
      )
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

    return NextResponse.json(newType[0], { status: 201 })
  } catch (error: any) {
    console.error("[VirtualAccounts] Error creating operation type:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
