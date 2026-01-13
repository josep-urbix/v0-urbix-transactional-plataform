/**
 * Formatea una cantidad de dinero con formato europeo
 * Usa . para miles/millones y , para decimales
 * Ejemplo: 123074.50 -> 123.074,50 €
 */
export function formatCurrency(amount: number, currency = "EUR"): string {
  // Formatear el número con separadores europeos
  const formatted = new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)

  // Agregar el símbolo de moneda
  return `${formatted} ${currency === "EUR" ? "€" : currency}`
}

/**
 * Formatea un número con formato europeo (sin símbolo de moneda)
 * Ejemplo: 123074.50 -> 123.074,50
 */
export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}
