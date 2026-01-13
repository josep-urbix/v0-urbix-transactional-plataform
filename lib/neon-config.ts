// Configure Neon BEFORE any imports that use it
import { neonConfig } from "@neondatabase/serverless"

// Suppress browser warnings globally
neonConfig.disableWarningInBrowsers = true

// Export config for reference
export { neonConfig }
