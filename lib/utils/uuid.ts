// Función para validar UUIDs
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

// Lista de rutas reservadas que no son UUIDs
export const RESERVED_ROUTES = [
  "devices",
  "sessions",
  "wallets",
  "activity",
  "settings",
  "search",
  "export",
  "import",
  "sync",
  "test",
  "preview",
  "publish",
  "retire",
  "assign",
  "comments",
  "complete",
  "executions",
  "track",
  "activate",
]
