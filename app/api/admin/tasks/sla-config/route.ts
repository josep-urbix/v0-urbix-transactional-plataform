import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { logSqlQuery } from "@/lib/sql-logger"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const startTime = Date.now()

    const configs = await sql`
      SELECT * FROM tasks.task_sla_config
      ORDER BY tipo, prioridad
    `

    await logSqlQuery("SELECT", "tasks.task_sla_config", startTime, configs.length, session.user.id, {
      action: "get_sla_config",
    })

    return NextResponse.json(configs || [])
  } catch (error: any) {
    console.error("Error fetching SLA config:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { tipo, prioridad, sla_horas } = body

    if (!tipo || !prioridad || !sla_horas) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const startTime = Date.now()

    const [config] = await sql`
      INSERT INTO tasks.task_sla_config (tipo, prioridad, sla_horas)
      VALUES (${tipo}, ${prioridad}, ${sla_horas})
      ON CONFLICT (tipo, prioridad) DO UPDATE
      SET sla_horas = ${sla_horas}, updated_at = NOW()
      RETURNING *
    `

    await logSqlQuery("INSERT", "tasks.task_sla_config", startTime, 1, session.user.id, { tipo, prioridad, sla_horas })

    return NextResponse.json({ config })
  } catch (error: any) {
    console.error("Error creating SLA config:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
