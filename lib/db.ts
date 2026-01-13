// Import config FIRST to ensure it's applied before neon() is called
import "./neon-config"
import { neon, type NeonQueryFunction } from "@neondatabase/serverless"

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set")
}

const connectionString = process.env.DATABASE_URL!

// Main SQL client - use this everywhere
export const sql = neon(connectionString) as NeonQueryFunction<false, false>

// Also export a factory function for cases where a new client is needed
export function createSqlClient(customConnectionString?: string): NeonQueryFunction<false, false> {
  return neon(customConnectionString || connectionString)
}

// Re-export neon with default config for backwards compatibility
export const configuredNeon = (connString: string) => neon(connString)
