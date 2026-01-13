/**
 * Mejora 1: SANDBOXING - Ejecutar queries en dry-run mode
 */
import { LemonwayClient } from "@/lib/lemonway-client"
import { sql } from "@/lib/db"

export class SandboxExecutor {
  private client: LemonwayClient | null = null

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

  async executeDryRun(queueEntryId: string): Promise<any> {
    const entry = await sql`SELECT * FROM lemonway_temp.lemonway_request_queue WHERE id = $1`

    if (!entry || entry.length === 0) {
      throw new Error("Queue entry not found")
    }

    const item = entry[0]
    const startTime = Date.now()

    const client = await this.getClient()

    // Ejecutar en modo sandbox (sin efectos reales)
    const response = await client.executeRequest({
      endpoint: item.endpoint,
      method: item.http_method,
      payload: item.request_payload,
      sandbox: true,
    })

    const executionTime = Date.now() - startTime

    // Guardar snapshot
    await sql`
      INSERT INTO lemonway_temp.lemonway_sandbox_history
      (queue_entry_id, request_snapshot, response_snapshot, execution_time_ms)
      VALUES ($1, $2, $3, $4)
    `

    return {
      request: item.request_payload,
      response,
      executionTime,
      sandbox: true,
    }
  }
}
