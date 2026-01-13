/**
 * Lemonway Queue Processor
 * Implementa sistema FIFO dual con priorización URGENT/NORMAL
 * Las solicitudes URGENT se procesan siempre primero
 */

import { sql } from "@/lib/db"
import { LemonwayClient } from "@/lib/lemonway-client"

interface QueueItem {
  id: string
  priority: "URGENT" | "NORMAL"
  endpoint: string
  http_method: string
  request_payload: any
  request_headers: any
  retry_count: number
  max_retries: number
  created_at: Date
}

export class LemonwayQueueProcessor {
  private client: LemonwayClient | null = null
  private isProcessing = false
  private maxConcurrentRequests = 5

  constructor() {}

  private async getClient(): Promise<LemonwayClient> {
    if (!this.client) {
      const config = await LemonwayClient.getConfig()
      if (!config) {
        throw new Error("Lemonway configuration not found in database")
      }
      this.client = new LemonwayClient(config)
    }
    return this.client
  }

  /**
   * Obtener siguiente solicitud de la cola
   * Prioriza: 1) URGENT pendientes, 2) NORMAL pendientes
   * Respeta FIFO dentro de cada cola
   */
  async getNextQueueItem(): Promise<QueueItem | null> {
    const result = await sql`
      SELECT 
        id, priority, endpoint, http_method,
        request_payload, request_headers,
        retry_count, max_retries, created_at
      FROM lemonway_temp.lemonway_request_queue
      WHERE status = 'pending'
      ORDER BY 
        priority = 'URGENT' DESC,  -- URGENT primero
        created_at ASC             -- Luego FIFO por fecha
      LIMIT 1
    `

    return result.length > 0 ? result[0] : null
  }

  /**
   * Procesar una solicitud de la cola
   */
  async processQueueItem(item: QueueItem): Promise<void> {
    try {
      // Marcar como en procesamiento
      await sql`
        UPDATE lemonway_temp.lemonway_request_queue
        SET status = 'processing', started_at = NOW()
        WHERE id = $1
      `

      // Ejecutar llamada a Lemonway
      const startTime = Date.now()
      const client = await this.getClient()
      const response = await client.executeRequest({
        endpoint: item.endpoint,
        method: item.http_method,
        payload: item.request_payload,
        headers: item.request_headers,
      })
      const executionTime = Date.now() - startTime

      // Guardar respuesta
      await sql`
        UPDATE lemonway_temp.lemonway_request_queue
        SET 
          status = 'completed',
          response_payload = $1,
          response_status = $2,
          response_time_ms = $3,
          completed_at = NOW()
        WHERE id = $4
      `

      console.log(`[v0] Queue item ${item.id} completed in ${executionTime}ms`)
    } catch (error) {
      await this.handleQueueItemError(item, error)
    }
  }

  /**
   * Manejar errores en procesamiento de cola
   */
  private async handleQueueItemError(item: QueueItem, error: any): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const retryCount = item.retry_count + 1
    const shouldRetry = retryCount < item.max_retries

    if (shouldRetry) {
      // Calcular siguiente reintento con backoff exponencial
      const backoffMs = Math.pow(2, retryCount - 1) * 1000 // 1s, 2s, 4s, 8s, etc.
      const nextRetryAt = new Date(Date.now() + backoffMs)

      await sql`
        UPDATE lemonway_temp.lemonway_request_queue
        SET 
          status = 'failed',
          retry_count = $1,
          next_retry_at = $2,
          error_message = $3,
          last_error_at = NOW()
        WHERE id = $4
      `

      console.log(
        `[v0] Queue item ${item.id} failed. Retry ${retryCount}/${item.max_retries} scheduled for ${nextRetryAt.toISOString()}`,
      )
    } else {
      // Máximo reintentos alcanzado
      await sql`
        UPDATE lemonway_temp.lemonway_request_queue
        SET 
          status = 'failed',
          error_message = $1,
          last_error_at = NOW()
        WHERE id = $2
      `

      console.error(`[v0] Queue item ${item.id} failed permanently after ${retryCount} attempts`)
    }
  }

  /**
   * Procesar cola continuamente
   * Respeta límites de concurrencia y reintentos
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing) {
      console.log("[v0] Queue processor already running")
      return
    }

    this.isProcessing = true

    try {
      let processed = 0

      while (true) {
        const item = await this.getNextQueueItem()

        if (!item) {
          // No hay más items
          break
        }

        // Procesar item
        await this.processQueueItem(item)
        processed++

        // Control de concurrencia
        if (processed >= this.maxConcurrentRequests) {
          console.log(`[v0] Queue processor hit concurrency limit (${this.maxConcurrentRequests})`)
          break
        }
      }

      console.log(`[v0] Queue processor completed. Processed ${processed} items.`)
    } catch (error) {
      console.error("[v0] Queue processor error:", error)
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Procesar reintentos de solicitudes que fallaron
   */
  async processRetries(): Promise<void> {
    try {
      // Obtener items cuyo reintento está programado
      const retryItems = await sql`
        SELECT id
        FROM lemonway_temp.lemonway_request_queue
        WHERE 
          status = 'failed' AND 
          next_retry_at IS NOT NULL AND
          next_retry_at <= NOW()
        ORDER BY priority = 'URGENT' DESC, next_retry_at ASC
        LIMIT 10
      `

      for (const item of retryItems) {
        // Resetear estado para que sea procesado nuevamente
        await sql`
          UPDATE lemonway_temp.lemonway_request_queue
          SET status = 'pending'
          WHERE id = $1
        `
      }

      console.log(`[v0] Rescheduled ${retryItems.length} items for retry`)
    } catch (error) {
      console.error("[v0] Process retries error:", error)
    }
  }

  /**
   * Estadísticas de cola
   */
  async getQueueStats() {
    const stats = await sql`
      SELECT 
        priority,
        status,
        COUNT(*) as count
      FROM lemonway_temp.lemonway_request_queue
      GROUP BY priority, status
      ORDER BY priority DESC, status
    `

    return stats
  }

  /**
   * Enqueue una nueva solicitud
   */
  async enqueue(data: {
    priority: "URGENT" | "NORMAL"
    endpoint: string
    http_method: string
    request_payload: any
    wallet_id?: string
    account_id?: string
    operation_type?: string
    created_by: string
  }): Promise<string> {
    const result = await sql`
      INSERT INTO lemonway_temp.lemonway_request_queue (
        priority,
        endpoint,
        http_method,
        request_payload,
        wallet_id,
        account_id,
        operation_type,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `

    console.log(`[v0] Enqueued request: ${result[0].id} (priority: ${data.priority})`)
    return result[0].id
  }
}

// Export singleton
export const queueProcessor = new LemonwayQueueProcessor()
