import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"
import { logSqlQuery } from "@/lib/sql-logger"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = params

    const query = `
      SELECT 
        c.*,
        u.name as usuario_nombre,
        u.email as usuario_email
      FROM tasks.task_comments c
      LEFT JOIN public."User" u ON c.user_id = u.id
      WHERE c.task_id = $1
      ORDER BY c.created_at ASC
    `

    const comments = await sql.query(query, [id])

    await logSqlQuery(query, "tasks.task_comments", "SELECT", session.user.email, { task_id: id })

    return NextResponse.json(comments?.rows || [])
  } catch (error: any) {
    console.error("Error fetching comments:", error)
    return NextResponse.json({ error: "Error al obtener comentarios", details: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = params
    const body = await request.json()
    const { comentario } = body

    if (!comentario || comentario.trim() === "") {
      return NextResponse.json({ error: "El comentario no puede estar vacío" }, { status: 400 })
    }

    const query = `
      INSERT INTO tasks.task_comments (task_id, user_id, comentario)
      VALUES ($1, $2, $3)
      RETURNING *
    `

    const result = await sql.query(query, [id, session.user.email, comentario])

    await logSqlQuery(query, "tasks.task_comments", "INSERT", session.user.email, { task_id: id })

    return NextResponse.json(result?.rows?.[0] || result?.[0], { status: 201 })
  } catch (error: any) {
    console.error("Error creating comment:", error)
    return NextResponse.json({ error: "Error al crear comentario", details: error.message }, { status: 500 })
  }
}
