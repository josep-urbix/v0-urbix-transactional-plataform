import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { logSqlQuery } from "@/lib/sql-logger"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Verificar permiso VIRTUAL_ACCOUNTS:UNBLOCK
    const hasPermission = await sql`
      SELECT 1
      FROM public."RolePermission" rp
      JOIN public."Permission" p ON rp."permissionId" = p.id
      JOIN public."UserRole" ur ON ur."roleId" = rp."roleId"
      JOIN public."User" u ON u.id = ur."userId"
      WHERE u.email = ${session.user.email}
        AND p.resource = 'VIRTUAL_ACCOUNTS'
        AND p.action = 'UNBLOCK'
    `

    if (hasPermission.length === 0) {
      return NextResponse.json(
        {
          error: "No tienes permisos para desbloquear cuentas virtuales",
        },
        { status: 403 },
      )
    }

    const body = await request.json()
    const { cuentaVirtualId, motivo } = body

    if (!cuentaVirtualId || !motivo) {
      return NextResponse.json(
        {
          error: "cuentaVirtualId y motivo son requeridos",
        },
        { status: 400 },
      )
    }

    // Desbloquear cuenta
    await sql`
      UPDATE virtual_accounts.cuentas_virtuales
      SET vinculacion_bloqueada = false
      WHERE id = ${cuentaVirtualId}
    `

    // Registrar en LemonwayTransaction
    await sql`
      INSERT INTO lemonway_transactions (
        tipo_transaccion,
        metodo,
        url,
        payload,
        respuesta,
        estado,
        notas
      ) VALUES (
        'DESBLOQUEO_CUENTA_VIRTUAL',
        'POST',
        '/api/admin/virtual-accounts/unblock',
        ${JSON.stringify({ cuentaVirtualId, motivo })},
        ${JSON.stringify({ success: true })},
        'SUCCESS',
        ${`Cuenta virtual ${cuentaVirtualId} desbloqueada por ${session.user.email}. Motivo: ${motivo}`}
      )
    `

    await logSqlQuery(
      "UPDATE",
      "virtual_accounts.cuentas_virtuales",
      { cuentaVirtualId, vinculacion_bloqueada: false },
      session.user.email,
    )

    return NextResponse.json({
      success: true,
      message: "Cuenta desbloqueada exitosamente",
    })
  } catch (error: any) {
    console.error("Error desbloqueando cuenta:", error)
    return NextResponse.json(
      {
        error: "Error al desbloquear cuenta",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
