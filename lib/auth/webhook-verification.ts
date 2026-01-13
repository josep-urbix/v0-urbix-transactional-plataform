/**
 * Verifica la firma de un webhook usando HMAC-SHA256
 * @param signature - Firma proporcionada en el header x-cron-signature
 * @param secret - Secret para validar (ej: CRON_SECRET)
 * @returns true si la firma es válida
 */
export function verifyWebhookSignature(signature: string, secret: string): boolean {
  if (!signature || !secret) {
    return false
  }

  try {
    // Importar crypto de forma sincrónica (Node.js built-in)
    const crypto = require("crypto")

    // Calcular HMAC-SHA256
    const hash = crypto.createHmac("sha256", secret).update(secret).digest("hex")

    // Comparación segura: prevenir timing attacks
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(hash))
  } catch (error) {
    console.error("[v0] Error verifying webhook signature:", error)
    return false
  }
}
