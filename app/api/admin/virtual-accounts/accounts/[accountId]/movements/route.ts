export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { accountId: string } }) {
  try {
    console.log("[v0] DEBUG - GET movements endpoint called")

    const session = await getSession()
    console.log("[v0] DEBUG - Session obtained:", session ? "EXISTS" : "NULL")

    if (!session?.user?.id) {
      console.log("[v0] DEBUG - No valid session user ID")
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    console.log("[v0] DEBUG - Session user ID valid:", session.user.id)

    const { accountId } = params
    console.log("[v0] DEBUG - Fetching movements for account:", accountId)

    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = Number.parseInt(searchParams.get("offset") || "0")
    console.log("[v0] DEBUG - Pagination: limit=" + limit + ", offset=" + offset)

    console.log("[v0] DEBUG - Executing movements query with accountId:", accountId)

    const movements = await sql`
      SELECT 
        m.id,
        m.cuenta_id,
        m.tipo_operacion_id,
        m.fecha,
        m.importe,
        m.descripcion,
        m.origen,
        m.lemonway_transaction_id,
        m.saldo_disponible_resultante,
        m.saldo_bloqueado_resultante,
        m.created_at,
        t.codigo as tipo_codigo,
        t.descripcion as tipo_descripcion
      FROM virtual_accounts.movimientos_cuenta m
      LEFT JOIN virtual_accounts.tipos_operacion_contable t ON m.tipo_operacion_id = t.id
      WHERE m.cuenta_id = ${accountId}
      ORDER BY m.fecha DESC 
      LIMIT ${limit} OFFSET ${offset}
    `

    console.log("[v0] DEBUG - Movements query result count:", movements.length)
    console.log("[v0] DEBUG - Movements query result (full):", JSON.stringify(movements))
    console.log("[v0] DEBUG - First movement (if exists):", movements[0] ? JSON.stringify(movements[0]) : "NO DATA")

    console.log("[v0] DEBUG - Executing count query...")
    const countResult = await sql`
      SELECT COUNT(*) as total FROM virtual_accounts.movimientos_cuenta WHERE cuenta_id = ${accountId}
    `
    const total = Number.parseInt(countResult[0]?.total || "0")
    console.log("[v0] DEBUG - Total movements count:", total)
    console.log("[v0] DEBUG - Count query result (full):", JSON.stringify(countResult))

    console.log("[v0] DEBUG - Returning successful response")
    return NextResponse.json({
      success: true,
      data: movements,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + movements.length < total,
      },
    })
  } catch (error: any) {
    console.error("[v0] ERROR - GET movements endpoint failed:", error.message)
    console.error("[v0] ERROR - Full error:", error)
    return NextResponse.json({ error: error.message || "Error al obtener movimientos" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { accountId: string } }) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { accountId } = params
    const body = await request.json()
    const { tipo_operacion_id, importe, descripcion, origen = "manual" } = body

    // Validate required fields
    if (!tipo_operacion_id || !importe) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    const opTypeResult = await sql`
      SELECT id, direccion FROM virtual_accounts.tipos_operacion_contable WHERE id = ${tipo_operacion_id}
    `

    if (opTypeResult.length === 0) {
      return NextResponse.json({ error: "Tipo de operación no válido" }, { status: 400 })
    }

    const accountResult = await sql`
      SELECT saldo_disponible, saldo_bloqueado FROM virtual_accounts.cuentas_virtuales WHERE id = ${accountId} AND estado = 'ACTIVA'
    `

    if (accountResult.length === 0) {
      return NextResponse.json({ error: "Cuenta no encontrada o inactiva" }, { status: 404 })
    }

    const { saldo_disponible, saldo_bloqueado } = accountResult[0]
    const movementAmount = Number.parseFloat(importe)
    const direccion = opTypeResult[0].direccion

    // Calculate new balance based on direction
    let newSaldoDisponible = Number.parseFloat(saldo_disponible)
    const newSaldoBloqueado = Number.parseFloat(saldo_bloqueado)

    if (direccion === "CREDITO") {
      newSaldoDisponible += movementAmount
    } else if (direccion === "DEBITO") {
      if (newSaldoDisponible < movementAmount) {
        return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 })
      }
      newSaldoDisponible -= movementAmount
    }

    // Insert movement
    const movementId = crypto.randomUUID()
    const now = new Date().toISOString()

    await sql`
      INSERT INTO virtual_accounts.movimientos_cuenta 
       (id, cuenta_id, tipo_operacion_id, fecha, importe, descripcion, origen, 
        saldo_disponible_resultante, saldo_bloqueado_resultante, created_at)
       VALUES (${movementId}, ${accountId}, ${tipo_operacion_id}, ${now}, ${movementAmount.toFixed(2)}, ${descripcion || null}, ${origen}, 
        ${newSaldoDisponible.toFixed(2)}, ${newSaldoBloqueado.toFixed(2)}, ${now})
    `

    await sql`
      UPDATE virtual_accounts.cuentas_virtuales 
       SET saldo_disponible = ${newSaldoDisponible.toFixed(2)}, saldo_bloqueado = ${newSaldoBloqueado.toFixed(2)}, updated_at = ${now}
       WHERE id = ${accountId}
    `

    return NextResponse.json({
      success: true,
      data: {
        id: movementId,
        importe: movementAmount,
        saldo_disponible_resultante: newSaldoDisponible,
        saldo_bloqueado_resultante: newSaldoBloqueado,
      },
    })
  } catch (error: any) {
    console.error("[v0] ERROR - POST movements endpoint failed:", error.message)
    console.error("[v0] ERROR - Full error:", error)
    return NextResponse.json({ error: error.message || "Error al crear movimiento" }, { status: 500 })
  }
}
