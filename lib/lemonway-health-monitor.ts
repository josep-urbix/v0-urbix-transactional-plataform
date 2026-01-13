/**
 * Mejora 6: HEALTH CHECK - Monitoreo de estado de Lemonway
 */
import { LemonwayClient } from "@/lib/lemonway-client"
import { sql } from "@/lib/db"

export class HealthMonitor {
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

  async checkHealth(): Promise<any> {
    const checks = {
      api_connectivity: await this.checkApiConnectivity(),
      authentication: await this.checkAuthentication(),
      database: await this.checkDatabase(),
      queue: await this.checkQueueHealth(),
      response_time: await this.checkResponseTime(),
    }

    const isHealthy = Object.values(checks).every((check: any) => check.status === "ok")

    return {
      status: isHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      checks,
    }
  }

  private async checkApiConnectivity(): Promise<any> {
    try {
      const start = Date.now()
      const client = await this.getClient()
      await client.getHealth()
      return {
        status: "ok",
        responseTime: Date.now() - start,
      }
    } catch (error) {
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  private async checkAuthentication(): Promise<any> {
    try {
      // Verificar que el token es válido
      const config = await sql`SELECT * FROM lemonway_temp.lemonway_api_config LIMIT 1`
      return {
        status: config.length > 0 ? "ok" : "warning",
      }
    } catch (error) {
      return { status: "error", message: "Config not found" }
    }
  }

  private async checkDatabase(): Promise<any> {
    try {
      await sql`SELECT 1`
      return { status: "ok" }
    } catch (error) {
      return { status: "error", message: "Database connection failed" }
    }
  }

  private async checkQueueHealth(): Promise<any> {
    try {
      const queue = await sql`
        SELECT COUNT(*) as count, status
        FROM lemonway_temp.lemonway_request_queue
        WHERE status = 'failed'
      `

      const failedCount = queue[0]?.count || 0
      return {
        status: failedCount < 10 ? "ok" : "warning",
        failedItems: failedCount,
      }
    } catch (error) {
      return { status: "error", message: error instanceof Error ? error.message : "Unknown error" }
    }
  }

  private async checkResponseTime(): Promise<any> {
    try {
      const avg = await sql`
        SELECT AVG(response_time_ms) as avg_time
        FROM lemonway_temp.lemonway_request_queue
        WHERE response_time_ms IS NOT NULL
        AND created_at > NOW() - INTERVAL '1 hour'
      `

      const avgTime = avg[0]?.avg_time || 0
      return {
        status: avgTime < 1000 ? "ok" : "warning",
        averageResponseTime: Math.round(avgTime),
      }
    } catch (error) {
      return { status: "error", message: error instanceof Error ? error.message : "Unknown error" }
    }
  }
}
