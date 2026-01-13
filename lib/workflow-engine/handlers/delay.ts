// =====================================================
// DELAY HANDLER
// Pauses workflow execution
// =====================================================

import { z } from "zod"
import type { StepHandlerDefinition, StepResult } from "../types"
import { parseISODuration } from "../template-engine"

// =====================================================
// CONFIG SCHEMA
// =====================================================

export const DelayConfigSchema = z.object({
  description: z.string().optional(),
  delayMs: z.number().min(0).optional(),
  delayISO: z.string().optional(), // ISO 8601 duration like "PT1H" for 1 hour
})

export type DelayConfig = z.infer<typeof DelayConfigSchema>

// =====================================================
// HANDLER DEFINITION
// =====================================================

export const delayHandler: StepHandlerDefinition<DelayConfig> = {
  type: "DELAY",
  name: "Delay",
  description: "Pauses workflow execution for a specified duration",
  category: "logic",
  configSchema: DelayConfigSchema,
  defaultConfig: {
    delayMs: 5000,
  },

  async execute({ config }): Promise<StepResult> {
    let delayMs = config.delayMs || 0

    if (config.delayISO) {
      try {
        delayMs = parseISODuration(config.delayISO)
      } catch (error) {
        return {
          success: false,
          error: `Invalid delay format: ${config.delayISO}`,
          isRetriable: false,
        }
      }
    }

    // For short delays (< 30 seconds), wait inline
    if (delayMs < 30000) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
      return { success: true, output: { delayMs, waited: true } }
    }

    // For longer delays, return the delay to be scheduled
    return {
      success: true,
      delayMs,
      output: { delayMs, scheduled: true },
    }
  },
}
