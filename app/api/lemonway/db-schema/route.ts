import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    // Obtener todas las tablas y sus columnas del schema payments
    const result = await sql`
      SELECT 
        table_schema,
        table_name,
        column_name,
        data_type
      FROM information_schema.columns
      WHERE table_schema IN ('payments', 'public')
      ORDER BY table_schema, table_name, ordinal_position
    `

    // Agrupar por tabla
    const tables: Record<string, { schema: string; columns: string[] }> = {}

    for (const row of result) {
      const fullTableName = `${row.table_schema}.${row.table_name}`
      if (!tables[fullTableName]) {
        tables[fullTableName] = {
          schema: row.table_schema,
          columns: [],
        }
      }
      tables[fullTableName].columns.push(row.column_name)
    }

    return NextResponse.json({ tables })
  } catch (error) {
    console.error("[DB Schema API] Error:", error)
    return NextResponse.json({ error: "Error al obtener el esquema de la base de datos" }, { status: 500 })
  }
}
