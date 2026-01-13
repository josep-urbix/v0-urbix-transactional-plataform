import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const importRunId = searchParams.get("importRunId")

    let query
    if (importRunId) {
      query = sql`
        SELECT 
          id,
          import_run_id,
          lemonway_transaction_id,
          urbix_account_id,
          cuenta_virtual_id,
          monto,
          commission,
          tipo_transaccion,
          tipo_operacion_id,
          status,
          descripcion,
          sender,
          receiver,
          payment_method,
          fecha_operacion,
          procesado,
          estado_importacion,
          referencia_externa,
          lemonway_raw_data,
          created_at,
          estado_revision,
          revisado_por,
          revisado_at
        FROM lemonway_temp.movimientos_cuenta
        WHERE import_run_id = ${importRunId}
        ORDER BY fecha_operacion DESC
      `
    } else {
      query = sql`
        SELECT 
          id,
          import_run_id,
          lemonway_transaction_id,
          urbix_account_id,
          cuenta_virtual_id,
          monto,
          commission,
          tipo_transaccion,
          tipo_operacion_id,
          status,
          descripcion,
          sender,
          receiver,
          payment_method,
          fecha_operacion,
          procesado,
          estado_importacion,
          referencia_externa,
          lemonway_raw_data,
          created_at,
          estado_revision,
          revisado_por,
          revisado_at
        FROM lemonway_temp.movimientos_cuenta
        ORDER BY fecha_operacion DESC
      `
    }

    const movimientos = await query

    return NextResponse.json({ movimientos })
  } catch (error) {
    console.error("Error al obtener movimientos:", error)
    return NextResponse.json({ error: "Error al obtener movimientos" }, { status: 500 })
  }
}
