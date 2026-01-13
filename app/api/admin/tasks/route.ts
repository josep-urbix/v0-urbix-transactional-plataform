import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"
import { logSqlQuery } from "@/lib/sql-logger"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)

    const filter = searchParams.get("filter") || "all"
    const estado = searchParams.get("estado")
    const prioridad = searchParams.get("prioridad")
    const tipo = searchParams.get("tipo")
    const asignado_a = searchParams.get("asignado_a")
    const cuenta_virtual_id = searchParams.get("cuenta_virtual_id")
    const payment_account_id = searchParams.get("payment_account_id")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const offset = (page - 1) * limit

    const whereConditions = []
    const params: any[] = []
    let paramIndex = 1

    if (filter === "my-tasks") {
      whereConditions.push(`t.asignado_a = $${paramIndex}`)
      params.push(session.user.id)
      paramIndex++
    } else if (filter === "pending") {
      whereConditions.push(`t.estado = $${paramIndex}`)
      params.push("PENDIENTE")
      paramIndex++
    } else if (filter === "critical") {
      whereConditions.push(`t.prioridad = $${paramIndex}`)
      params.push("CRITICA")
      paramIndex++
    }

    if (estado) {
      const estados = estado
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean)
      if (estados.length > 0) {
        const placeholders = estados.map(() => `$${paramIndex++}`).join(", ")
        whereConditions.push(`t.estado IN (${placeholders})`)
        params.push(...estados)
      }
    }

    if (prioridad) {
      whereConditions.push(`t.prioridad = $${paramIndex}`)
      params.push(prioridad)
      paramIndex++
    }

    if (tipo) {
      whereConditions.push(`t.tipo = $${paramIndex}`)
      params.push(tipo)
      paramIndex++
    }

    if (asignado_a) {
      whereConditions.push(`t.asignado_a = $${paramIndex}`)
      params.push(asignado_a)
      paramIndex++
    }

    if (cuenta_virtual_id) {
      whereConditions.push(`t.cuenta_virtual_id = $${paramIndex}`)
      params.push(cuenta_virtual_id)
      paramIndex++
    }

    if (payment_account_id) {
      whereConditions.push(`t.payment_account_id = $${paramIndex}`)
      params.push(payment_account_id)
      paramIndex++
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : ""

    const query = `
      SELECT 
        t.*,
        u.name as asignado_nombre,
        u.email as asignado_email,
        cv.referencia_externa_id as cuenta_referencia,
        pa.account_id as wallet_account_id,
        (SELECT COUNT(*) FROM tasks.task_comments WHERE task_id = t.id) as comentarios_count
      FROM tasks.tasks t
      LEFT JOIN public."User" u ON t.asignado_a = u.id
      LEFT JOIN virtual_accounts.cuentas_virtuales cv ON t.cuenta_virtual_id = cv.id
      LEFT JOIN payments.payment_accounts pa ON t.payment_account_id = pa.id
      ${whereClause}
      ORDER BY 
        CASE t.prioridad 
          WHEN 'CRITICA' THEN 1
          WHEN 'ALTA' THEN 2
          WHEN 'MEDIA' THEN 3
          WHEN 'BAJA' THEN 4
        END,
        t.fecha_creacion DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `

    params.push(limit, offset)

    const tasks = await sql.query(query, params)

    const countQuery = `
      SELECT COUNT(*) as total
      FROM tasks.tasks t
      ${whereClause}
    `
    const countParams = params.slice(0, -2)
    const countResult = await sql.query(countQuery, countParams)

    const tasksArray = Array.isArray(tasks) ? tasks : tasks?.rows || []
    const total = Number.parseInt(
      (Array.isArray(countResult) ? countResult[0]?.total : countResult?.rows?.[0]?.total) || "0",
    )

    await logSqlQuery(query, "tasks.tasks", "SELECT", session.user.email, {
      filters: { estado, prioridad, tipo, asignado_a },
    })

    return NextResponse.json({
      tasks: tasksArray,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    console.error("Error fetching tasks:", error)
    return NextResponse.json({ error: "Error al obtener tareas", details: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()

    const {
      tipo,
      prioridad,
      titulo,
      descripcion,
      cuenta_virtual_id,
      payment_account_id,
      contexto,
      fecha_vencimiento,
      asignado_a,
      proceso,
    } = body

    if (!tipo || !prioridad || !titulo) {
      return NextResponse.json({ error: "Faltan campos requeridos: tipo, prioridad, titulo" }, { status: 400 })
    }

    let procesoNombre = null
    if (proceso) {
      const processQuery = `SELECT enum_value FROM tasks.process_templates WHERE id = $1`
      const processResult = await sql.query(processQuery, [proceso])

      const processArray = Array.isArray(processResult) ? processResult : processResult?.rows
      if (processArray && processArray.length > 0) {
        procesoNombre = processArray[0].enum_value
      }
    }

    const query = `
      INSERT INTO tasks.tasks (
        tipo, prioridad, titulo, descripcion, 
        cuenta_virtual_id, payment_account_id, 
        contexto, fecha_vencimiento, asignado_a,
        creado_por, proceso, estado
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `

    const result = await sql.query(query, [
      tipo,
      prioridad,
      titulo,
      descripcion || null,
      cuenta_virtual_id || null,
      payment_account_id || null,
      contexto ? JSON.stringify(contexto) : null,
      fecha_vencimiento || null,
      asignado_a || null,
      session.user.email,
      procesoNombre || null,
      asignado_a ? "EN_PROGRESO" : "PENDIENTE",
    ])

    const resultArray = Array.isArray(result) ? result : result?.rows

    if (!resultArray || resultArray.length === 0) {
      return NextResponse.json({ error: "No se pudo crear la tarea" }, { status: 500 })
    }

    await logSqlQuery(query, "tasks.tasks", "INSERT", session.user.email, { tipo, prioridad, titulo })

    return NextResponse.json(resultArray[0], { status: 201 })
  } catch (error: any) {
    console.error("[v0] Error creating task:", error)
    return NextResponse.json({ error: "Error al crear tarea", details: error.message }, { status: 500 })
  }
}
