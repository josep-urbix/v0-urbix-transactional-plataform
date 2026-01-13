import { sql } from "@/lib/db"

export interface ServerIPRecord {
  id: number
  ip_address: string
  detected_at: Date
  environment: string
  is_current: boolean
}

export class IPMonitor {
  private static cachedIP: string | null = null
  private static lastCheck: Date | null = null
  private static readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutos
  private static tableExists: boolean | null = null

  /**
   * Obtiene la IP actual del servidor con caché
   */
  static async getCurrentIP(): Promise<string | null> {
    // Si tenemos IP en caché y es reciente, devolverla
    if (this.cachedIP && this.lastCheck && Date.now() - this.lastCheck.getTime() < this.CACHE_DURATION) {
      return this.cachedIP
    }

    // Intentar obtener IP de múltiples servicios
    const services = ["https://api.ipify.org?format=json", "https://api.my-ip.io/v2/ip.json", "https://ipapi.co/json/"]

    for (const service of services) {
      try {
        const response = await fetch(service, { signal: AbortSignal.timeout(3000) })
        if (response.ok) {
          const data = await response.json()
          const ip = data.ip || data.address || null
          if (ip) {
            this.cachedIP = ip
            this.lastCheck = new Date()
            await this.recordIP(ip).catch((err) => {
              console.log("[v0] Could not record IP (table may not exist):", err.message)
            })
            return ip
          }
        }
      } catch (error) {
        console.log(`[v0] Failed to get IP from ${service}:`, error)
        continue
      }
    }

    return null
  }

  private static async checkTableExists(): Promise<boolean> {
    if (this.tableExists !== null) {
      return this.tableExists
    }

    try {
      const result = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'server_ip_history'
        ) as exists
      `
      this.tableExists = result[0]?.exists || false
      return this.tableExists
    } catch (error) {
      console.error("Error checking if table exists:", error)
      this.tableExists = false
      return false
    }
  }

  /**
   * Registra la IP en la base de datos y detecta cambios
   */
  private static async recordIP(ip: string): Promise<void> {
    const tableExists = await this.checkTableExists()
    if (!tableExists) {
      console.log("server_ip_history table does not exist, skipping IP recording")
      return
    }

    try {
      const environment = "production"

      // Obtener la IP actual registrada
      const currentIP = await sql`
        SELECT ip_address FROM server_ip_history 
        WHERE is_current = true 
        AND environment = ${environment}
        LIMIT 1
      `

      // Si la IP cambió, registrar el cambio
      if (currentIP.length === 0 || currentIP[0].ip_address !== ip) {
        console.log(`IP change detected: ${currentIP[0]?.ip_address || "none"} -> ${ip}`)

        // Marcar todas las IPs anteriores como no actuales
        await sql`
          UPDATE server_ip_history 
          SET is_current = false 
          WHERE environment = ${environment}
        `

        // Insertar la nueva IP
        await sql`
          INSERT INTO server_ip_history (ip_address, environment, is_current)
          VALUES (${ip}, ${environment}, true)
        `

        // Notificar el cambio (puedes extender esto para enviar emails/webhooks)
        await this.notifyIPChange(ip, currentIP[0]?.ip_address || null, environment)
      }
    } catch (error) {
      console.error("Failed to record IP:", error)
    }
  }

  /**
   * Notifica cuando la IP cambia
   */
  private static async notifyIPChange(newIP: string, oldIP: string | null, environment: string): Promise<void> {
    console.warn(
      `⚠️  SERVER IP CHANGED in ${environment}!\n` +
        `Old IP: ${oldIP || "none"}\n` +
        `New IP: ${newIP}\n` +
        `Action required: Update IP whitelist in Lemonway dashboard`,
    )

    // TODO: Implementar notificación por email o webhook
    // await sendNotificationEmail(newIP, oldIP, environment)
  }

  /**
   * Obtiene el historial de IPs
   */
  static async getIPHistory(limit = 50): Promise<ServerIPRecord[]> {
    const tableExists = await this.checkTableExists()
    if (!tableExists) {
      console.log("server_ip_history table does not exist, returning empty history")
      return []
    }

    try {
      const records = await sql`
        SELECT * FROM server_ip_history 
        ORDER BY detected_at DESC 
        LIMIT ${limit}
      `
      return records as ServerIPRecord[]
    } catch (error) {
      console.error("Failed to get IP history:", error)
      return []
    }
  }

  /**
   * Fuerza una verificación inmediata de la IP
   */
  static async forceCheck(): Promise<string | null> {
    this.cachedIP = null
    this.lastCheck = null
    return this.getCurrentIP()
  }
}
