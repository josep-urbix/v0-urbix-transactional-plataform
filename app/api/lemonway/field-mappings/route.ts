import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const mappings = await sql`
      SELECT 
        id,
        endpoint,
        table_name,
        field_name,
        field_value,
        label,
        target_field,
        color,
        created_at,
        updated_at
      FROM payments.lemonway_field_mappings
      ORDER BY id ASC
    `

    return NextResponse.json(mappings)
  } catch (error) {
    console.error("[Field Mappings API] Error:", error)
    return NextResponse.json({ error: "Error al obtener los mapeos de campos" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { endpoint, tableName, fieldName, fieldValue, label, targetField, color } = await request.json()

    if (!endpoint || !tableName || !fieldName || !fieldValue || !label) {
      return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO payments.lemonway_field_mappings (endpoint, table_name, field_name, field_value, label, target_field, color)
      VALUES (
        ${endpoint}, 
        ${tableName}, 
        ${fieldName}, 
        ${fieldValue}, 
        ${label},
        ${targetField === "sameField" ? null : targetField},
        ${color === "noColor" ? null : color}
      )
      RETURNING *
    `

    return NextResponse.json({ success: true, mapping: result[0] })
  } catch (error) {
    console.error("[Field Mappings API] Error creating:", error)
    return NextResponse.json({ error: "Error al crear el mapeo" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { id, endpoint, tableName, fieldName, fieldValue, label, targetField, color } = await request.json()

    if (!id || !endpoint || !tableName || !fieldName || !fieldValue || !label) {
      return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 })
    }

    const result = await sql`
      UPDATE payments.lemonway_field_mappings
      SET 
        endpoint = ${endpoint},
        table_name = ${tableName},
        field_name = ${fieldName},
        field_value = ${fieldValue},
        label = ${label},
        target_field = ${targetField === "sameField" ? null : targetField},
        color = ${color === "noColor" ? null : color},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Mapeo no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ success: true, mapping: result[0] })
  } catch (error) {
    console.error("[Field Mappings API] Error updating:", error)
    return NextResponse.json({ error: "Error al actualizar el mapeo" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID es requerido" }, { status: 400 })
    }

    const result = await sql`
      DELETE FROM payments.lemonway_field_mappings
      WHERE id = ${id}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Mapeo no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Field Mappings API] Error deleting:", error)
    return NextResponse.json({ error: "Error al eliminar el mapeo" }, { status: 500 })
  }
}
