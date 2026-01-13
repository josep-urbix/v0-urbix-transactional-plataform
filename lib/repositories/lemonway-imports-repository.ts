import { sql } from "@/lib/db"
import type { LemonwayImportRun, LemonwayTempMovimiento, LemonwayTempCuentaVirtual } from "@/lib/types/lemonway-api"

export class LemonwayImportsRepository {
  /**
   * Create a new import run
   */
  static async createRun(data: {
    cuentaVirtualId: number
    lemonwayAccountId: string
    startDate?: Date
    endDate?: Date
    createdBy: string
  }): Promise<LemonwayImportRun> {
    const result = await sql`
      INSERT INTO lemonway_temp.import_runs (
        cuenta_virtual_id,
        account_id,
        start_date,
        end_date,
        status,
        created_by
      ) VALUES (
        ${data.cuentaVirtualId},
        ${data.lemonwayAccountId},
        ${data.startDate?.toISOString() || null},
        ${data.endDate?.toISOString() || null},
        'pending',
        ${data.createdBy}
      )
      RETURNING *
    `

    return this.mapDbRowToImportRun(result[0])
  }

  /**
   * Update import run status and results
   */
  static async updateRun(
    runId: string,
    data: {
      status: "pending" | "processing" | "completed" | "failed"
      totalTransactions?: number
      importedTransactions?: number
      failedTransactions?: number
      errorMessage?: string
      completedAt?: Date
    },
  ): Promise<void> {
    await sql`
      UPDATE lemonway_temp.import_runs
      SET
        status = ${data.status},
        total_transactions = ${data.totalTransactions || null},
        imported_transactions = ${data.importedTransactions || null},
        failed_transactions = ${data.failedTransactions || null},
        error_message = ${data.errorMessage || null},
        completed_at = ${data.completedAt?.toISOString() || null},
        updated_at = NOW()
      WHERE id = ${runId}
    `
  }

  /**
   * Get import run by ID
   */
  static async getRunById(runId: string): Promise<LemonwayImportRun | null> {
    const result = await sql`
      SELECT * FROM lemonway_temp.import_runs
      WHERE id = ${runId}
    `

    return result.length > 0 ? this.mapDbRowToImportRun(result[0]) : null
  }

  /**
   * List import runs with filters
   */
  static async listRuns(filters: {
    cuentaVirtualId?: number
    status?: string
    limit?: number
    offset?: number
  }): Promise<LemonwayImportRun[]> {
    const limit = filters.limit || 50
    const offset = filters.offset || 0

    const result = await sql`
      SELECT * FROM lemonway_temp.import_runs
      WHERE 1=1
      ${filters.cuentaVirtualId ? sql`AND cuenta_virtual_id = ${filters.cuentaVirtualId}` : sql``}
      ${filters.status ? sql`AND status = ${filters.status}` : sql``}
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `

    return result.map((row) => this.mapDbRowToImportRun(row))
  }

  /**
   * Create temp movimiento
   */
  static async createMovimiento(data: {
    importRunId: string
    cuentaVirtualId: number
    lemonwayTransactionId: string
    tipoOperacionId?: number
    fecha: Date
    concepto: string
    debe?: number
    haber?: number
    saldoPrevio?: number
    saldoPosterior?: number
    rawData: any
  }): Promise<void> {
    await sql`
      INSERT INTO lemonway_temp.movimientos_cuenta (
        import_run_id,
        cuenta_virtual_id,
        lemonway_transaction_id,
        tipo_operacion_id,
        fecha,
        concepto,
        debe,
        haber,
        saldo_previo,
        saldo_posterior,
        raw_data
      ) VALUES (
        ${data.importRunId},
        ${data.cuentaVirtualId},
        ${data.lemonwayTransactionId},
        ${data.tipoOperacionId || null},
        ${data.fecha.toISOString()},
        ${data.concepto},
        ${data.debe || null},
        ${data.haber || null},
        ${data.saldoPrevio || null},
        ${data.saldoPosterior || null},
        ${JSON.stringify(data.rawData)}::jsonb
      )
      ON CONFLICT (lemonway_transaction_id) DO NOTHING
    `
  }

  /**
   * Get movimientos by import run ID
   */
  static async getMovimientosByRunId(runId: string): Promise<LemonwayTempMovimiento[]> {
    const result = await sql`
      SELECT m.*, t.nombre as tipo_operacion_nombre
      FROM lemonway_temp.movimientos_cuenta m
      LEFT JOIN lemonway_temp.tipos_operacion_contable t ON m.tipo_operacion_id = t.id
      WHERE m.import_run_id = ${runId}
      ORDER BY m.fecha DESC
    `

    return result.map((row) => this.mapDbRowToMovimiento(row))
  }

  /**
   * List movimientos with filters
   */
  static async listMovimientos(filters: {
    cuentaVirtualId?: number
    importRunId?: number
    tipoOperacionId?: number
    fechaDesde?: Date
    fechaHasta?: Date
    limit?: number
    offset?: number
  }): Promise<{ data: LemonwayTempMovimiento[]; total: number }> {
    const limit = filters.limit || 50
    const offset = filters.offset || 0

    // Get total count
    const countResult = await sql`
      SELECT COUNT(*) as total
      FROM lemonway_temp.movimientos_cuenta
      WHERE 1=1
      ${filters.cuentaVirtualId ? sql`AND cuenta_virtual_id = ${filters.cuentaVirtualId}` : sql``}
      ${filters.importRunId ? sql`AND import_run_id = ${filters.importRunId}` : sql``}
      ${filters.tipoOperacionId ? sql`AND tipo_operacion_id = ${filters.tipoOperacionId}` : sql``}
      ${filters.fechaDesde ? sql`AND fecha >= ${filters.fechaDesde.toISOString()}` : sql``}
      ${filters.fechaHasta ? sql`AND fecha <= ${filters.fechaHasta.toISOString()}` : sql``}
    `

    const total = Number(countResult[0].total)

    // Get data
    const result = await sql`
      SELECT m.*, t.nombre as tipo_operacion_nombre
      FROM lemonway_temp.movimientos_cuenta m
      LEFT JOIN lemonway_temp.tipos_operacion_contable t ON m.tipo_operacion_id = t.id
      WHERE 1=1
      ${filters.cuentaVirtualId ? sql`AND m.cuenta_virtual_id = ${filters.cuentaVirtualId}` : sql``}
      ${filters.importRunId ? sql`AND m.import_run_id = ${filters.importRunId}` : sql``}
      ${filters.tipoOperacionId ? sql`AND m.tipo_operacion_id = ${filters.tipoOperacionId}` : sql``}
      ${filters.fechaDesde ? sql`AND m.fecha >= ${filters.fechaDesde.toISOString()}` : sql``}
      ${filters.fechaHasta ? sql`AND m.fecha <= ${filters.fechaHasta.toISOString()}` : sql``}
      ORDER BY m.fecha DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `

    return {
      data: result.map((row) => this.mapDbRowToMovimiento(row)),
      total,
    }
  }

  /**
   * Get cuenta virtual by Lemonway account ID
   */
  static async getCuentaVirtualByLemonwayId(lemonwayAccountId: string): Promise<LemonwayTempCuentaVirtual | null> {
    const result = await sql`
      SELECT cv.*
      FROM lemonway_temp.cuentas_virtuales cv
      WHERE cv.lemonway_account_id = ${lemonwayAccountId}
      LIMIT 1
    `

    return result.length > 0 ? this.mapDbRowToCuentaVirtual(result[0]) : null
  }

  /**
   * Get all tipos de operación
   */
  static async getTiposOperacion(): Promise<Array<{ id: number; nombre: string; codigo: string }>> {
    const result = await sql`
      SELECT id, nombre, codigo
      FROM lemonway_temp.tipos_operacion_contable
      ORDER BY nombre
    `

    return result.map((row) => ({
      id: row.id,
      nombre: row.nombre,
      codigo: row.codigo,
    }))
  }

  /**
   * Delete movimiento by ID
   */
  static async deleteMovimiento(id: number): Promise<boolean> {
    const result = await sql`
      DELETE FROM lemonway_temp.movimientos_cuenta
      WHERE id = ${id}
    `

    return result.count > 0
  }

  /**
   * Map database row to ImportRun
   */
  private static mapDbRowToImportRun(row: any): LemonwayImportRun {
    return {
      id: row.id,
      cuentaVirtualId: row.cuenta_virtual_id,
      lemonwayAccountId: row.account_id,
      startDate: row.start_date ? new Date(row.start_date) : undefined,
      endDate: row.end_date ? new Date(row.end_date) : undefined,
      status: row.status,
      totalTransactions: row.total_transactions,
      importedTransactions: row.imported_transactions,
      failedTransactions: row.failed_transactions,
      errorMessage: row.error_message,
      lemonwayResponse: row.lemonway_response,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    }
  }

  /**
   * Map database row to Movimiento
   */
  private static mapDbRowToMovimiento(row: any): LemonwayTempMovimiento {
    return {
      id: row.id,
      importRunId: row.import_run_id,
      cuentaVirtualId: row.cuenta_virtual_id,
      lemonwayTransactionId: row.lemonway_transaction_id,
      tipoOperacionId: row.tipo_operacion_id,
      tipoOperacionNombre: row.tipo_operacion_nombre,
      fecha: new Date(row.fecha),
      concepto: row.concepto,
      debe: row.debe ? Number(row.debe) : undefined,
      haber: row.haber ? Number(row.haber) : undefined,
      saldoPrevio: row.saldo_previo ? Number(row.saldo_previo) : undefined,
      saldoPosterior: row.saldo_posterior ? Number(row.saldo_posterior) : undefined,
      rawData: row.raw_data,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }
  }

  /**
   * Map database row to CuentaVirtual
   */
  private static mapDbRowToCuentaVirtual(row: any): LemonwayTempCuentaVirtual {
    return {
      id: row.id,
      lemonwayAccountId: row.lemonway_account_id,
      nombre: row.nombre,
      descripcion: row.descripcion,
      activa: row.activa,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }
  }
}
