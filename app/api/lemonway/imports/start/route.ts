import { type NextRequest, NextResponse } from "next/server"
import { getSession, hasPermission } from "@/lib/auth"
import { sql } from "@/lib/db"
import { logApiCall } from "@/lib/api-logger"
import { auditLog } from "@/lib/audit"

export async function POST(request: NextRequest) {
  try {
    // Autenticación y autorización
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const canImport = await hasPermission(session.user, "lemonway_imports", "create")
    if (!canImport) {
      return NextResponse.json({ error: "Sin permisos para importar" }, { status: 403 })
    }

    const body = await request.json()
    const { accountIdFrom, accountIdTo, startDate, endDate } = body

    // Validaciones
    if (accountIdFrom === undefined || accountIdTo === undefined) {
      return NextResponse.json(
        {
          error: "accountIdFrom y accountIdTo son requeridos",
        },
        { status: 400 },
      )
    }

    const from = Number.parseInt(accountIdFrom, 10)
    const to = Number.parseInt(accountIdTo, 10)

    if (isNaN(from) || isNaN(to)) {
      return NextResponse.json(
        {
          error: "accountIdFrom y accountIdTo deben ser números válidos",
        },
        { status: 400 },
      )
    }

    if (from > to) {
      return NextResponse.json(
        {
          error: "accountIdFrom debe ser menor o igual a accountIdTo",
        },
        { status: 400 },
      )
    }

    const totalAccounts = to - from + 1
    if (totalAccounts > 1000) {
      return NextResponse.json(
        {
          error: "El rango máximo permitido es de 1000 cuentas",
        },
        { status: 400 },
      )
    }

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "startDate y endDate son requeridos" }, { status: 400 })
    }

    const runIds: string[] = []

    for (let accountId = from; accountId <= to; accountId++) {
      const result = await sql`
        INSERT INTO lemonway_temp.import_runs (
          created_by,
          account_id,
          start_date,
          end_date,
          status
        ) VALUES (
          ${session.user.id},
          ${accountId.toString()},
          ${startDate},
          ${endDate},
          'pending'
        )
        RETURNING id
      `
      runIds.push(result[0].id)
    }

    // Log API call
    await logApiCall({
      userId: session.user.id,
      method: "POST",
      endpoint: "/api/lemonway/imports/start",
      statusCode: 200,
      requestBody: body,
      responseBody: { runIds, totalRuns: runIds.length },
    })

    // Audit log
    await auditLog({
      userId: session.user.id,
      action: "lemonway_import_batch_started",
      resource: "lemonway_imports",
      resourceId: runIds[0],
      details: {
        accountIdFrom: from,
        accountIdTo: to,
        totalAccounts,
        startDate,
        endDate,
        runIds,
      },
    })

    return NextResponse.json({
      success: true,
      runIds,
      totalRuns: runIds.length,
      message: `Se han creado ${runIds.length} tareas de importación. Se procesarán en segundo plano.`,
    })
  } catch (error) {
    console.error("[v0] Error starting import:", error)
    return NextResponse.json({ error: "Error al iniciar la importación" }, { status: 500 })
  }
}
