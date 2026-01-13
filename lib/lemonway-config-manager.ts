// Helper centralizado para recuperar configuración de Lemonway desde BD
// En lugar de leer process.env, SIEMPRE lee de public.LemonwayConfig

import { sql } from "@/lib/db"

export interface LemonwayConfigData {
  LEMONWAY_WALLET_ID: string
  LEMONWAY_API_TOKEN: string
  LEMONWAY_WEBHOOK_SECRET: string
  LEMONWAY_ENVIRONMENT: "sandbox" | "production"
  LEMONWAY_ENVIRONMENT_NAME: string
}

/**
 * Obtiene la configuración de Lemonway desde la BD
 * Esta es la ÚNICA fuente de verdad para credenciales
 */
export async function getLemonwayConfigFromDB(): Promise<LemonwayConfigData> {
  try {
    const result = await sql`
      SELECT 
        wallet_id as "LEMONWAY_WALLET_ID",
        api_token as "LEMONWAY_API_TOKEN",
        webhook_secret as "LEMONWAY_WEBHOOK_SECRET",
        environment as "LEMONWAY_ENVIRONMENT",
        environment_name as "LEMONWAY_ENVIRONMENT_NAME"
      FROM "LemonwayConfig" 
      ORDER BY id DESC 
      LIMIT 1
    `

    if (!result || result.length === 0) {
      throw new Error(
        "Configuración de Lemonway no encontrada en BD. Por favor, configura Lemonway desde /dashboard/lemonway-config",
      )
    }

    const config = result[0]

    // Validar campos críticos
    if (!config.LEMONWAY_API_TOKEN) {
      throw new Error("LEMONWAY_API_TOKEN no está configurado en BD")
    }

    if (!config.LEMONWAY_WALLET_ID) {
      throw new Error("LEMONWAY_WALLET_ID no está configurado en BD")
    }

    if (!config.LEMONWAY_WEBHOOK_SECRET) {
      throw new Error("LEMONWAY_WEBHOOK_SECRET no está configurado en BD")
    }

    console.log("[v0] [LemonwayConfig] Configuración obtenida desde BD exitosamente")
    console.log("[v0] [LemonwayConfig] Environment:", config.LEMONWAY_ENVIRONMENT)
    console.log("[v0] [LemonwayConfig] API Token exists:", !!config.LEMONWAY_API_TOKEN)

    return config as LemonwayConfigData
  } catch (error: any) {
    console.error("[v0] [LemonwayConfig] Error obteniendo config de BD:", error.message)
    throw error
  }
}

/**
 * Alias para compatibilidad - obtiene solo el token
 */
export async function getLemonwayApiToken(): Promise<string> {
  const config = await getLemonwayConfigFromDB()
  return config.LEMONWAY_API_TOKEN
}

/**
 * Alias para compatibilidad - obtiene solo wallet ID
 */
export async function getLemonwayWalletId(): Promise<string> {
  const config = await getLemonwayConfigFromDB()
  return config.LEMONWAY_WALLET_ID
}

/**
 * Alias para compatibilidad - obtiene solo webhook secret
 */
export async function getLemonwayWebhookSecret(): Promise<string> {
  const config = await getLemonwayConfigFromDB()
  return config.LEMONWAY_WEBHOOK_SECRET
}
