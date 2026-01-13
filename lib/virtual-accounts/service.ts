import { sql } from "@/lib/db"

export class VirtualAccountsService {
  /**
   * Creates a new virtual account
   */
  async createVirtualAccount(tipo: string, referenciaExternaTipo: string, referenciaExternaId: string, moneda = "EUR") {
    console.log("Creating virtual account:", { tipo, referenciaExternaTipo, referenciaExternaId, moneda })

    const result = await sql`
      INSERT INTO virtual_accounts.cuentas_virtuales (
        tipo, referencia_externa_tipo, referencia_externa_id, moneda
      )
      VALUES (
        ${tipo}, ${referenciaExternaTipo}, ${referenciaExternaId}, ${moneda}
      )
      RETURNING *
    `

    console.log("Virtual account created:", result[0])
    return result[0]
  }

  /**
   * Registers a movement on a virtual account (atomic transaction)
   */
  async registerMovement(input: any) {
    console.log("Registering movement:", input)

    // Start transaction
    const client = await sql

    try {
      // 1. Get operation type
      const [tipoOperacion] = await sql`
        SELECT * FROM virtual_accounts.tipos_operacion_contable
        WHERE codigo = ${input.codigoTipoOperacion} AND activo = true
      `

      if (!tipoOperacion) {
        throw new Error(`Operation type not found or inactive: ${input.codigoTipoOperacion}`)
      }

      // 2. Check for idempotency
      if (input.idempotencyKey) {
        const [existing] = await sql`
          SELECT * FROM virtual_accounts.movimientos_cuenta
          WHERE idempotency_key = ${input.idempotencyKey}
        `
        if (existing) {
          console.log("Movement already exists (idempotency):", existing.id)
          return existing
        }
      }

      // 3. Get current account balances
      const [cuenta] = await sql`
        SELECT * FROM virtual_accounts.cuentas_virtuales
        WHERE id = ${input.cuentaId}
        FOR UPDATE
      `

      if (!cuenta) {
        throw new Error(`Virtual account not found: ${input.cuentaId}`)
      }

      // 4. Calculate new balances
      let nuevoSaldoDisponible = Number.parseFloat(cuenta.saldo_disponible)
      let nuevoSaldoBloqueado = Number.parseFloat(cuenta.saldo_bloqueado)

      if (tipoOperacion.afecta_saldo_disponible) {
        const signo = tipoOperacion.signo_saldo_disponible
        if (signo === "+") nuevoSaldoDisponible += input.importe
        else if (signo === "-") nuevoSaldoDisponible -= input.importe
      }

      if (tipoOperacion.afecta_saldo_bloqueado) {
        const signo = tipoOperacion.signo_saldo_bloqueado
        if (signo === "+") nuevoSaldoBloqueado += input.importe
        else if (signo === "-") nuevoSaldoBloqueado -= input.importe
      }

      // 5. Validate balance constraints
      if (nuevoSaldoDisponible < 0 && !tipoOperacion.codigo.includes("AJUSTE")) {
        throw new Error(
          `Insufficient available balance. Current: ${cuenta.saldo_disponible}, Required: ${input.importe}`,
        )
      }

      if (nuevoSaldoBloqueado < 0) {
        throw new Error(`Insufficient blocked balance. Current: ${cuenta.saldo_bloqueado}, Required: ${input.importe}`)
      }

      // 6. Insert movement
      const [movimiento] = await sql`
        INSERT INTO virtual_accounts.movimientos_cuenta (
          cuenta_id, tipo_operacion_id, importe, moneda,
          saldo_disponible_resultante, saldo_bloqueado_resultante,
          proyecto_id, inversion_id, usuario_externo_id, promotor_id,
          origen, descripcion, workflow_run_id, idempotency_key,
          created_by_admin_id, created_by_type
        )
        VALUES (
          ${input.cuentaId}, ${tipoOperacion.id}, ${input.importe}, ${input.moneda || "EUR"},
          ${nuevoSaldoDisponible}, ${nuevoSaldoBloqueado},
          ${input.proyectoId || null}, ${input.inversionId || null},
          ${input.usuarioExternoId || null}, ${input.promotorId || null},
          ${input.origen}, ${input.descripcion || null}, ${input.workflowRunId || null},
          ${input.idempotencyKey || null}, ${input.createdByAdminId || null},
          ${input.createdByType || "SYSTEM"}
        )
        RETURNING *
      `

      // 7. Update account balances
      await sql`
        UPDATE virtual_accounts.cuentas_virtuales
        SET 
          saldo_disponible = ${nuevoSaldoDisponible},
          saldo_bloqueado = ${nuevoSaldoBloqueado},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${input.cuentaId}
      `

      console.log("Movement registered successfully:", movimiento.id)
      return movimiento
    } catch (error) {
      console.error("Error registering movement:", error)
      throw error
    }
  }

  /**
   * Get account by ID with current balances
   */
  async getAccount(id: string) {
    const [account] = await sql`
      SELECT * FROM virtual_accounts.cuentas_virtuales
      WHERE id = ${id}
    `
    return account
  }

  /**
   * Get movements for an account
   */
  async getAccountMovements(cuentaId: string, limit = 100, offset = 0) {
    const movements = await sql`
      SELECT 
        m.*,
        t.codigo as tipo_operacion_codigo,
        t.nombre as tipo_operacion_nombre
      FROM virtual_accounts.movimientos_cuenta m
      JOIN virtual_accounts.tipos_operacion_contable t ON m.tipo_operacion_id = t.id
      WHERE m.cuenta_id = ${cuentaId}
      ORDER BY m.fecha DESC
      LIMIT ${limit} OFFSET ${offset}
    `
    return movements
  }
}
