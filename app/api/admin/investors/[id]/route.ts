import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { isValidUUID } from "@/lib/utils/uuid"

// Obtener detalle de inversor
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    if (!isValidUUID(id)) {
      return NextResponse.json({ error: "ID de inversor inválido" }, { status: 400 })
    }

    const investor = await sql`
      SELECT * FROM investors."User" WHERE id = ${id} AND deleted_at IS NULL
    `

    if (investor.length === 0) {
      return NextResponse.json({ error: "Inversor no encontrado" }, { status: 404 })
    }

    // Obtener sesiones activas
    const sessions = await sql`
      SELECT * FROM investors."Session"
      WHERE user_id = ${id} AND is_active = TRUE
      ORDER BY last_activity_at DESC
    `

    // Obtener dispositivos
    const devices = await sql`
      SELECT * FROM investors."Device"
      WHERE user_id = ${id}
      ORDER BY last_seen_at DESC
    `

    // Obtener wallets vinculados
    const wallets = await sql`
      SELECT * FROM investors."WalletLink"
      WHERE user_id = ${id}
      ORDER BY created_at DESC
    `

    // Obtener actividad reciente
    const activity = await sql`
      SELECT * FROM investors."ActivityLog"
      WHERE user_id = ${id}
      ORDER BY created_at DESC
      LIMIT 50
    `

    // Obtener intentos de login recientes
    const loginAttempts = await sql`
      SELECT * FROM investors."LoginAttempt"
      WHERE user_id = ${id}
      ORDER BY created_at DESC
      LIMIT 20
    `

    return NextResponse.json({
      investor: investor[0],
      sessions,
      devices,
      wallets,
      activity,
      loginAttempts,
    })
  } catch (error) {
    console.error("Error obteniendo inversor:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// Actualizar inversor
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    if (!isValidUUID(id)) {
      return NextResponse.json({ error: "ID de inversor inválido" }, { status: 400 })
    }

    const body = await request.json()

    const { first_name, last_name, phone, status, kyc_status } = body

    const result = await sql`
      UPDATE investors."User"
      SET 
        first_name = COALESCE(${first_name}, first_name),
        last_name = COALESCE(${last_name}, last_name),
        phone = COALESCE(${phone}, phone),
        status = COALESCE(${status}, status),
        kyc_status = COALESCE(${kyc_status}, kyc_status),
        updated_at = NOW()
      WHERE id = ${id} AND deleted_at IS NULL
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Inversor no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ investor: result[0] })
  } catch (error) {
    console.error("Error actualizando inversor:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// Eliminar inversor (soft delete)
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    if (!isValidUUID(id)) {
      return NextResponse.json({ error: "ID de inversor inválido" }, { status: 400 })
    }

    const result = await sql`
      UPDATE investors."User"
      SET status = 'deleted', deleted_at = NOW()
      WHERE id = ${id} AND deleted_at IS NULL
      RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Inversor no encontrado" }, { status: 404 })
    }

    // Revocar todas las sesiones
    await sql`
      UPDATE investors."Session"
      SET is_active = FALSE, revoked_at = NOW(), revoked_reason = 'user_deleted'
      WHERE user_id = ${id}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error eliminando inversor:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
