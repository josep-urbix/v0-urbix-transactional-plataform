import { sql } from "@/lib/db"

/**
 * Mapea tipos de transacción de Lemonway a códigos de tipos_operacion_contable
 * Lemonway types: 0=Card, 1=MoneyIn, 3=MoneyOut, 4=P2P, 13=iDEAL, 14=SEPA, 15=Cheque, 19=Multibanco, 35=PayPal
 */
export class LemonwayTypeMapper {
  /**
   * Obtiene el código de operación contable basado en el tipo de Lemonway y dirección del dinero
   */
  static async getOperationCode(
    lemonwayType: number,
    direction: "money_in" | "money_out" | null,
  ): Promise<string | null> {
    try {
      console.log(`[v0] [LemonwayTypeMapper] Searching for mapping - type: ${lemonwayType}, direction: ${direction}`)

      let result
      if (direction) {
        result = await sql`
          SELECT codigo FROM virtual_accounts.tipos_operacion_contable
          WHERE lemonway_transaction_type LIKE ${"%" + lemonwayType + "%"}
            AND lemonway_direction = ${direction}
            AND activo = true
          LIMIT 1
        `
      } else {
        // For P2P (type 4), direction is null
        result = await sql`
          SELECT codigo FROM virtual_accounts.tipos_operacion_contable
          WHERE lemonway_transaction_type LIKE ${"%" + lemonwayType + "%"}
            AND lemonway_direction IS NULL
            AND activo = true
          LIMIT 1
        `
      }

      if (result.length > 0) {
        const codigo = result[0].codigo
        console.log(`[v0] [LemonwayTypeMapper] Found mapping: ${lemonwayType} (${direction}) → ${codigo}`)
        return codigo
      }

      console.warn(
        `[v0] [LemonwayTypeMapper] No mapping found for Lemonway type ${lemonwayType} with direction ${direction}`,
      )
      return null
    } catch (error) {
      console.error(`[v0] [LemonwayTypeMapper] Error mapping Lemonway type ${lemonwayType}:`, error)
      return null
    }
  }
}
