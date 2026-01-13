import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

interface ProcessingResult {
  success: boolean
  processed: number
  errors: number
  details: {
    id: string
    status: "success" | "error"
    message?: string
  }[]
}

export class LemonwayProcessingWorker {
  /**
   * Procesa movimientos aprobados desde tabla temporal a tabla definitiva
   * Valida datos, crea movimientos contables y actualiza saldos vía TRIGGER
   */
  static async processApprovedMovements(manualTrigger = false, movementIds?: string[]): Promise<ProcessingResult> {
    console.log(
      `[v0] [LemonwayProcessingWorker] Starting processing - manual: ${manualTrigger}, movementIds: ${movementIds?.length || 0}`,
    )

    const results: ProcessingResult = {
      success: true,
      processed: 0,
      errors: 0,
      details: [],
    }

    const importRunIds = new Set<string>()

    try {
      let approvedMovements
      if (movementIds && movementIds.length > 0) {
        console.log(`[v0] Reprocessing ${movementIds.length} specific movements:`, movementIds)
        const placeholders = movementIds.map((_, i) => `$${i + 1}`).join(",")
        approvedMovements = await sql`
          SELECT * FROM lemonway_temp.movimientos_cuenta
          WHERE id IN (${placeholders})
          ORDER BY created_at ASC
        `
      } else {
        approvedMovements = await sql`
          SELECT * FROM lemonway_temp.movimientos_cuenta
          WHERE estado_revision = 'aprobado'
            AND estado_importacion = 'importado'
            AND movimientos_cuenta_id IS NULL
          ORDER BY created_at ASC
        `
      }

      console.log(`[v0] Found ${approvedMovements.length} approved movements to process`)

      // 2. Procesar cada movimiento
      for (const mov of approvedMovements) {
        try {
          if (mov.import_run_id) {
            importRunIds.add(mov.import_run_id)
          }

          // Validación 0: Verificar que lemonway_raw_data sea JSON válido si existe
          if (mov.lemonway_raw_data) {
            if (typeof mov.lemonway_raw_data === "string") {
              try {
                JSON.parse(mov.lemonway_raw_data)
              } catch (parseError) {
                throw new Error(`Invalid JSON in lemonway_raw_data: ${mov.lemonway_raw_data.substring(0, 50)}...`)
              }
            }
          }

          // Validación 1: urbix_account_id existe
          if (!mov.urbix_account_id) {
            throw new Error("urbix_account_id is NULL")
          }

          const accountExists = await sql`
            SELECT id FROM virtual_accounts.cuentas_virtuales
            WHERE id = ${mov.urbix_account_id}
            LIMIT 1
          `

          if (accountExists.length === 0) {
            throw new Error(`Account ${mov.urbix_account_id} not found in virtual_accounts`)
          }

          // Validación 2: tipo_operacion_id existe
          if (!mov.tipo_operacion_id) {
            throw new Error("tipo_operacion_id is NULL")
          }

          let operationCode = mov.tipo_operacion_id
          let operationType

          // Si tipo_operacion_id es un número, es un tipo de Lemonway - mapear al código correcto
          if (!isNaN(Number(operationCode))) {
            console.log(`[v0] tipo_operacion_id es número (${operationCode}), mapeando desde Lemonway type...`)
            const lemonwayType = Number(operationCode)
            const direction = mov.monto > 0 ? "money_in" : "money_out"

            const operationByLemonwayType = await sql`
              SELECT id, codigo FROM virtual_accounts.tipos_operacion_contable
              WHERE (lemonway_transaction_type::TEXT LIKE ${`%,${lemonwayType},%`} 
                     OR lemonway_transaction_type::TEXT LIKE ${`${lemonwayType},%`}
                     OR lemonway_transaction_type::TEXT LIKE ${`%,${lemonwayType}`}
                     OR lemonway_transaction_type::TEXT = ${String(lemonwayType)})
                AND (lemonway_direction = ${direction} OR (lemonway_direction IS NULL AND ${lemonwayType} = 4))
                AND activo = true
              LIMIT 1
            `

            if (operationByLemonwayType.length === 0) {
              throw new Error(`No mapping found for Lemonway type ${lemonwayType} with direction ${direction}`)
            }

            operationType = operationByLemonwayType[0]
            operationCode = operationType.codigo
            console.log(`[v0] Mapped Lemonway type ${lemonwayType} → ${operationCode}`)
          } else {
            // Si es un código válido, validar que exista
            const operationExists = await sql`
              SELECT id FROM virtual_accounts.tipos_operacion_contable
              WHERE codigo = ${operationCode}
                AND activo = true
              LIMIT 1
            `

            if (operationExists.length === 0) {
              throw new Error(`Operation type ${operationCode} not found or inactive`)
            }

            operationType = operationExists[0]
          }

          // Validación 3: monto ≠ 0
          if (!mov.monto || mov.monto === 0) {
            throw new Error("Amount is 0 or NULL")
          }

          const accountData = await sql`
            SELECT saldo_disponible, saldo_bloqueado FROM virtual_accounts.cuentas_virtuales
            WHERE id = ${mov.urbix_account_id}::UUID
            LIMIT 1
          `

          if (accountData.length === 0) {
            throw new Error(`Account ${mov.urbix_account_id} not found`)
          }

          const currentAvailable = Number.parseFloat(String(accountData[0].saldo_disponible || 0))
          const currentBlocked = Number.parseFloat(String(accountData[0].saldo_bloqueado || 0))

          // Obtener signos de la operación para calcular nuevos saldos
          const operationDetails = await sql`
            SELECT signo_saldo_disponible, signo_saldo_bloqueado FROM virtual_accounts.tipos_operacion_contable
            WHERE id = ${operationType.id}::UUID
            LIMIT 1
          `

          if (operationDetails.length === 0) {
            throw new Error(`Operation details not found for ${operationType.id}`)
          }

          const signAvailable = operationDetails[0].signo_saldo_disponible
          const signBlocked = operationDetails[0].signo_saldo_bloqueado

          const amount = Number.parseFloat(String(mov.monto))
          const resultantAvailable = signAvailable === "-" ? currentAvailable - amount : currentAvailable + amount

          const resultantBlocked = signBlocked === "-" ? currentBlocked - amount : currentBlocked + amount

          if (mov.senderaccountid && mov.receiveraccountid) {
            console.log(
              `[v0] P2P Movement detected - Sender: ${mov.senderaccountid}, Receiver: ${mov.receiveraccountid}`,
            )

            // Validar que ambas cuentas existan
            const senderAccountExists = await sql`
              SELECT id FROM virtual_accounts.cuentas_virtuales
              WHERE lemonway_account_id = ${mov.senderaccountid}
              LIMIT 1
            `

            if (senderAccountExists.length === 0) {
              throw new Error(`Sender account ${mov.senderaccountid} not found in virtual_accounts`)
            }

            const receiverAccountExists = await sql`
              SELECT id FROM virtual_accounts.cuentas_virtuales
              WHERE lemonway_account_id = ${mov.receiveraccountid}
              LIMIT 1
            `

            if (receiverAccountExists.length === 0) {
              throw new Error(`Receiver account ${mov.receiveraccountid} not found in virtual_accounts`)
            }

            const senderAccountId = senderAccountExists[0].id
            const receiverAccountId = receiverAccountExists[0].id

            // Obtener saldos del sender
            const senderAccountData = await sql`
              SELECT saldo_disponible, saldo_bloqueado FROM virtual_accounts.cuentas_virtuales
              WHERE id = ${senderAccountId}::UUID
              LIMIT 1
            `

            const senderAvailable = Number.parseFloat(String(senderAccountData[0].saldo_disponible || 0))
            const senderBlocked = Number.parseFloat(String(senderAccountData[0].saldo_bloqueado || 0))

            // Para P2P: sender pierde dinero (negativo), receiver gana dinero (positivo)
            const senderResultantAvailable = senderAvailable - amount
            const senderResultantBlocked = senderBlocked
            const receiverResultantAvailable = currentAvailable + amount
            const receiverResultantBlocked = currentBlocked

            // Insertar movimiento RECEIVER (positivo, dinero que entra)
            const receiverMovement = await sql`
              INSERT INTO virtual_accounts.movimientos_cuenta (
                id,
                cuenta_id,
                tipo_operacion_id,
                importe,
                descripcion,
                moneda,
                origen,
                created_by_type,
                fecha,
                saldo_disponible_resultante,
                saldo_bloqueado_resultante,
                senderaccountid,
                receiveraccountid,
                created_at
              ) VALUES (
                gen_random_uuid(),
                ${receiverAccountId}::UUID,
                ${operationType.id}::UUID,
                ${mov.monto}::NUMERIC,
                ${mov.descripcion || `P2P [${mov.senderaccountid} => ${mov.receiveraccountid}]: Lemonway import`},
                ${mov.moneda || "EUR"},
                'LEMONWAY',
                'LEMONWAY',
                ${mov.fecha_operacion || new Date().toISOString()}::TIMESTAMP,
                ${receiverResultantAvailable}::NUMERIC,
                ${receiverResultantBlocked}::NUMERIC,
                ${mov.senderaccountid},
                ${mov.receiveraccountid},
                NOW()
              )
              RETURNING id
            `

            const receiverMovementId = receiverMovement[0].id

            // Insertar movimiento SENDER (negativo, dinero que sale)
            const senderMovement = await sql`
              INSERT INTO virtual_accounts.movimientos_cuenta (
                id,
                cuenta_id,
                tipo_operacion_id,
                importe,
                descripcion,
                moneda,
                origen,
                created_by_type,
                fecha,
                saldo_disponible_resultante,
                saldo_bloqueado_resultante,
                senderaccountid,
                receiveraccountid,
                created_at
              ) VALUES (
                gen_random_uuid(),
                ${senderAccountId}::UUID,
                ${operationType.id}::UUID,
                ${-amount}::NUMERIC,
                ${mov.descripcion || `P2P [${mov.senderaccountid} => ${mov.receiveraccountid}]: Lemonway import`},
                ${mov.moneda || "EUR"},
                'LEMONWAY',
                'LEMONWAY',
                ${mov.fecha_operacion || new Date().toISOString()}::TIMESTAMP,
                ${senderResultantAvailable}::NUMERIC,
                ${senderResultantBlocked}::NUMERIC,
                ${mov.senderaccountid},
                ${mov.receiveraccountid},
                NOW()
              )
              RETURNING id
            `

            const senderMovementId = senderMovement[0].id

            // Relacionar ambos movimientos
            await sql`
              UPDATE virtual_accounts.movimientos_cuenta
              SET relacionado_con_movimiento_id = ${senderMovementId}::UUID
              WHERE id = ${receiverMovementId}::UUID
            `

            await sql`
              UPDATE virtual_accounts.movimientos_cuenta
              SET relacionado_con_movimiento_id = ${receiverMovementId}::UUID
              WHERE id = ${senderMovementId}::UUID
            `

            // Actualizar tabla temporal
            await sql`
              UPDATE lemonway_temp.movimientos_cuenta
              SET 
                movimientos_cuenta_id = ${receiverMovementId}::UUID,
                estado_importacion = 'procesado',
                procesado_at = NOW(),
                procesado = true
              WHERE id = ${mov.id}
            `

            results.processed++
            results.details.push({
              id: mov.id,
              status: "success",
              message: `P2P processed - Receiver: ${receiverMovementId}, Sender: ${senderMovementId}`,
            })

            console.log(
              `[v0] Successfully processed P2P movement ${mov.id} - Receiver: ${receiverMovementId}, Sender: ${senderMovementId}`,
            )
          } else {
            // Movimiento normal (no P2P) - lógica original
            // 3. Insertar en movimientos_cuenta definitivo
            const newMovement = await sql`
              INSERT INTO virtual_accounts.movimientos_cuenta (
                id,
                cuenta_id,
                tipo_operacion_id,
                importe,
                descripcion,
                moneda,
                origen,
                created_by_type,
                fecha,
                saldo_disponible_resultante,
                saldo_bloqueado_resultante,
                created_at
              ) VALUES (
                gen_random_uuid(),
                ${mov.urbix_account_id}::UUID,
                ${operationType.id}::UUID,
                ${mov.monto}::NUMERIC,
                ${mov.descripcion || `Lemonway import: ${mov.lemonway_transaction_id}`},
                ${mov.moneda || "EUR"},
                'LEMONWAY',
                'LEMONWAY',
                ${mov.fecha_operacion || new Date().toISOString()}::TIMESTAMP,
                ${resultantAvailable}::NUMERIC,
                ${resultantBlocked}::NUMERIC,
                NOW()
              )
              RETURNING id, saldo_disponible_resultante, saldo_bloqueado_resultante
            `

            const newMovementId = newMovement[0].id

            // 4. Actualizar tabla temporal con referencia cruzada
            await sql`
              UPDATE lemonway_temp.movimientos_cuenta
              SET 
                movimientos_cuenta_id = ${newMovementId}::UUID,
                estado_importacion = 'procesado',
                procesado_at = NOW(),
                procesado = true
              WHERE id = ${mov.id}
            `

            results.processed++
            results.details.push({
              id: mov.id,
              status: "success",
              message: `Processed to movement ${newMovementId}`,
            })

            console.log(`[v0] Successfully processed movement ${mov.id} → ${newMovementId}`)
          }
        } catch (error: any) {
          results.errors++

          const errorMessage = error?.message || "Unknown error"

          // Marcar como error en tabla temporal
          await sql`
            UPDATE lemonway_temp.movimientos_cuenta
            SET 
              estado_importacion = 'error',
              error_procesamiento = ${errorMessage}
            WHERE id = ${mov.id}
          `

          if (mov.import_run_id) {
            await sql`
              INSERT INTO lemonway_temp.import_alerts (
                import_run_id,
                movimiento_temp_id,
                tipo_alerta,
                mensaje
              ) VALUES (
                ${mov.import_run_id}::UUID,
                ${mov.id},
                'PROCESSING_ERROR',
                ${errorMessage}
              )
            `
          }

          results.details.push({
            id: mov.id,
            status: "error",
            message: errorMessage,
          })

          console.error(`[v0] Error processing movement ${mov.id}:`, errorMessage)
        }
      }

      console.log(`[v0] Processing complete - Processed: ${results.processed}, Errors: ${results.errors}`)

      if (importRunIds.size > 0) {
        console.log(`[v0] Updating status for ${importRunIds.size} import runs`)

        for (const importRunId of importRunIds) {
          try {
            // Get total counts for this import run
            const countResult = await sql`
              SELECT 
                COUNT(*) FILTER (WHERE estado_importacion = 'procesado') as imported,
                COUNT(*) FILTER (WHERE estado_importacion = 'error') as failed,
                COUNT(*) as total
              FROM lemonway_temp.movimientos_cuenta
              WHERE import_run_id = ${importRunId}::UUID
            `

            const { imported = 0, failed = 0, total = 0 } = countResult[0] || {}

            // Update import_runs with final status
            await sql`
              UPDATE lemonway_temp.import_runs
              SET 
                status = 'completed',
                imported_transactions = ${imported},
                failed_transactions = ${failed},
                total_transactions = ${total},
                completed_at = NOW(),
                updated_at = NOW()
              WHERE id = ${importRunId}::UUID
            `

            console.log(
              `[v0] Updated import run ${importRunId} - imported: ${imported}, failed: ${failed}, total: ${total}`,
            )
          } catch (updateError: any) {
            console.error(`[v0] Error updating import run ${importRunId}:`, updateError.message)
          }
        }
      }
    } catch (error: any) {
      results.success = false
      console.error(`[v0] [LemonwayProcessingWorker] Fatal error:`, error)
    }

    return results
  }
}
